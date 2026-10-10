/**
 * Bridge Site Inspection — online sync using Google Sheets + Google Drive.
 *
 * Paste this whole file into Extensions → Apps Script of a new Google Sheet, then
 * Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 * Copy the Web app URL into the app (Data → Online sync) or into config.js.
 *
 * Sheet "records": one row per bridge or inspection (JSON split across data columns).
 * Sheet "photos":  one row per photo; the photo file is stored in Drive under
 *                  "Bridge Inspection/Photos/<inspection folder>/<Abut1_P1.jpg>".
 * Nothing is ever hard-deleted: deleted records are flagged, deleted photos go to Drive's trash.
 */

const ROOT_FOLDER = 'Bridge Inspection';
const CHUNK = 45000;          // characters per cell (Sheets limit is 50,000)
const DATA_COLS = 20;         // up to 900,000 characters per record
const REC_HEAD = ['id', 'collection', 'updated_at', 'synced_at', 'deleted', 'summary'];
const PHOTO_HEAD = ['id', 'inspection_id', 'file_name', 'folder', 'file_id', 'synced_at', 'deleted', 'link'];

function doGet() {
  return json({ ok: true, app: 'bridge-site-inspection', time: Date.now() });
}

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json({ ok: false, error: 'Bad request' }); }
  if (req.op === 'getPhoto') {
    try { return json(getPhoto(req)); } catch (err) { return json({ ok: false, error: String(err) }); }
  }
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return json({ ok: false, error: 'Server busy, try again' });
  try {
    if (req.op === 'ping') return json({ ok: true, time: Date.now() });
    if (req.op === 'pull') return json(pull(req));
    if (req.op === 'push') return json(push(req));
    if (req.op === 'photo') return json(savePhoto(req));
    if (req.op === 'photoDel') return json(deletePhoto(req));
    return json({ ok: false, error: 'Unknown operation' });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- helpers ---------- */
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function sheet(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function recSheet() {
  const head = REC_HEAD.concat(Array.from({ length: DATA_COLS }, (_, i) => 'data_' + (i + 1)));
  return sheet('records', head);
}
function photoSheet() { return sheet('photos', PHOTO_HEAD); }

function rows(sh, width) {
  const n = sh.getLastRow() - 1;
  return n > 0 ? sh.getRange(2, 1, n, width).getValues() : [];
}

// Server cursor: strictly increasing, so a pull never misses a write.
function nextSync() {
  const props = PropertiesService.getScriptProperties();
  const last = Number(props.getProperty('lastSync') || 0);
  const t = Math.max(Date.now(), last + 1);
  props.setProperty('lastSync', String(t));
  return t;
}

function summaryOf(col, d) {
  if (!d) return '';
  if (col === 'bridges') return [d.type, d.bridgeNo, d.road, d.slk ? 'SLK ' + d.slk : ''].filter(String).join(' ');
  if (col === 'inspections') {
    const items = d.items || {};
    const withDef = Object.keys(items).filter(k => items[k] && items[k].defects && items[k].defects.length).length;
    return ['L' + d.level, d.status, d.inspector, String(d.startedAt || '').slice(0, 10), withDef + ' with defects'].join(' · ');
  }
  return '';
}

function folderPath(names) {
  let f = null;
  const it = DriveApp.getFoldersByName(names[0]);
  f = it.hasNext() ? it.next() : DriveApp.createFolder(names[0]);
  for (let i = 1; i < names.length; i++) {
    const sub = f.getFoldersByName(names[i]);
    f = sub.hasNext() ? sub.next() : f.createFolder(names[i]);
  }
  return f;
}

/* ---------- records ---------- */
function push(req) {
  const sh = recSheet(), width = REC_HEAD.length + DATA_COLS;
  const all = rows(sh, width), index = {};
  all.forEach((r, i) => { index[r[1] + '/' + r[0]] = i + 2; });
  const accepted = [], stale = [];
  (req.records || []).forEach(rec => {
    if (['bridges', 'inspections'].indexOf(rec.col) < 0 || !rec.id) return;
    const key = rec.col + '/' + rec.id, at = index[key];
    const upd = Date.parse(rec.updated_at) || 0;   // stored as a number so Sheets never turns it into a date
    if (at) {
      const cur = Number(sh.getRange(at, 3).getValue() || 0);
      if (cur > upd) { stale.push(key); return; }
    }
    const text = rec.deleted ? '' : JSON.stringify(rec.data || {});
    if (text.length > (CHUNK - 1) * DATA_COLS) throw new Error('Record too large: ' + key);
    // Each piece starts with "~" so Sheets never reads it as a formula, number or date.
    const chunks = Array.from({ length: DATA_COLS }, (_, i) => { const s = text.slice(i * (CHUNK - 1), (i + 1) * (CHUNK - 1)); return s ? '~' + s : ''; });
    const row = [rec.id, rec.col, upd, nextSync(), rec.deleted ? true : false, summaryOf(rec.col, rec.data)].concat(chunks);
    if (at) sh.getRange(at, 1, 1, width).setValues([row]);
    else { sh.appendRow(row); index[key] = sh.getLastRow(); }
    accepted.push(key);
  });
  return { ok: true, accepted: accepted, stale: stale };
}

function pull(req) {
  const since = Number(req.since || 0), width = REC_HEAD.length + DATA_COLS;
  let cursor = since;
  const records = rows(recSheet(), width).filter(r => Number(r[3]) > since).map(r => {
    cursor = Math.max(cursor, Number(r[3]));
    const text = r.slice(REC_HEAD.length).map(c => String(c || '').replace(/^~/, '')).join('');
    return { col: r[1], id: String(r[0]), updated_at: new Date(Number(r[2]) || 0).toISOString(), synced_at: Number(r[3]), deleted: r[4] === true || r[4] === 'TRUE', data: text ? JSON.parse(text) : null };
  });
  const photos = rows(photoSheet(), PHOTO_HEAD.length).filter(r => Number(r[5]) > since).map(r => {
    cursor = Math.max(cursor, Number(r[5]));
    return { id: String(r[0]), inspection_id: String(r[1]), file_name: r[2], synced_at: Number(r[5]), deleted: r[6] === true || r[6] === 'TRUE' };
  });
  return { ok: true, records: records, photos: photos, cursor: cursor };
}

/* ---------- photos ---------- */
function findPhotoRow(id) {
  const all = rows(photoSheet(), PHOTO_HEAD.length);
  for (let i = 0; i < all.length; i++) if (String(all[i][0]) === String(id)) return { row: i + 2, values: all[i] };
  return null;
}

function savePhoto(req) {
  if (!req.id || !req.b64) return { ok: false, error: 'Missing photo' };
  const found = findPhotoRow(req.id);
  if (found && found.values[4]) return { ok: true, file_id: found.values[4], existing: true };
  const folder = folderPath([ROOT_FOLDER, 'Photos', String(req.folder || 'Unsorted')]);
  const name = String(req.file_name || req.id + '.jpg');
  const file = folder.createFile(Utilities.newBlob(Utilities.base64Decode(req.b64), 'image/jpeg', name));
  const row = [req.id, req.inspection_id || '', name, req.folder || '', file.getId(), nextSync(), false, file.getUrl()];
  const sh = photoSheet();
  if (found) sh.getRange(found.row, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
  return { ok: true, file_id: file.getId() };
}

function deletePhoto(req) {
  const found = findPhotoRow(req.id);
  if (!found) return { ok: true };
  if (found.values[4]) { try { DriveApp.getFileById(found.values[4]).setTrashed(true); } catch (e) {} }
  photoSheet().getRange(found.row, 6, 1, 2).setValues([[nextSync(), true]]);
  return { ok: true };
}

function getPhoto(req) {
  const found = findPhotoRow(req.id);
  if (!found || !found.values[4] || found.values[6] === true) return { ok: false, error: 'Photo not found' };
  const blob = DriveApp.getFileById(found.values[4]).getBlob();
  return { ok: true, b64: Utilities.base64Encode(blob.getBytes()) };
}

/* Run once from the editor (select "setup" → Run) to create the sheets and Drive folder and grant access. */
function setup() {
  recSheet(); photoSheet(); folderPath([ROOT_FOLDER, 'Photos']);
  Logger.log('Ready. Now Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).');
}
