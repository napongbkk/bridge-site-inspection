# Bridge Site Inspection — offline web app

Works on iPhone, Android, tablets and laptops. After it is installed on the home screen it
opens and saves **with no signal**. Bridges, inspections and photos are always saved on the
phone first. With signal they also sync to a **Google Sheet and Google Drive folder**, and
corrections made on another device (e.g. the office laptop) come back to the phone.
Photos are kept on the phone at their **original size**. The copy uploaded to Google Drive is shrunk to **5 MB max**, and pictures inside the Word report to 2 MB max.

## What is in this folder

| File | What it does |
|---|---|
| `index.html` | The whole app |
| `sw.js` | Offline mode (keeps a copy of the app on the phone) |
| `manifest.webmanifest`, `icons/` | Home-screen name and icon |
| `lib/jszip.min.js` | Builds the Word report and ZIP files on the phone |
| `config.js` | The online sync address shared by every phone |
| `google-apps-script/Code.gs` | The online sync server — pasted into a Google Sheet (not uploaded to the website) |

Upload **all** of these, keeping the folder structure. The site must be served over **https**
(all hosts below do this for you).

## 1. Put it online (once, about 10 minutes)

Pick one.

### Option A — Netlify (easiest, free)
1. Create a free account at <https://app.netlify.com/signup>.
2. Go to <https://app.netlify.com/drop> and drag this whole folder onto the page.
3. Netlify gives you an address like `https://bright-river-1234.netlify.app`.
   In *Site configuration → Change site name* you can rename it, e.g. `bridge-inspect`.

### Option B — GitHub Pages (free)
1. Create a repository on GitHub, e.g. `bridge-inspect`, and upload all files (keep `lib/` and `icons/`).
2. Repository → *Settings → Pages* → Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Your address is `https://<your-user>.github.io/bridge-inspect/`.

### Option C — Company hosting (Azure Static Web Apps or any web server)
Give this folder to IT and ask them to host it as a static website over https.
SharePoint document libraries cannot host it (they block web apps), but you can export into SharePoint.

## 1b. Set up online sync with Google Drive (once, about 10 minutes)

1. In Google Drive create a new **Google Sheet**, name it `Bridge Inspection Data`.
2. In the Sheet: **Extensions → Apps Script**. Delete the sample code, paste the whole of
   `google-apps-script/Code.gs`, click **Save**.
3. In the function list at the top choose **setup** and click **Run**. Google asks you to
   authorise: choose your account → *Advanced* → *Go to … (unsafe)* → **Allow**
   (it is your own script; it needs Sheets and Drive access). This creates the `records` and
   `photos` tabs and the Drive folder **Bridge Inspection / Photos**.
4. **Deploy → New deployment** → gear icon → **Web app**.
   *Execute as:* **Me** · *Who has access:* **Anyone** → **Deploy** → copy the **Web app URL**
   (it ends in `/exec`).
5. Open `config.js`, paste the URL between the quotes (`syncUrl: 'https://script.google.com/…/exec'`),
   and upload it with the other files. Every phone then syncs automatically.
   (Or enter it on one phone under **Data → Online sync → Save address**.)

How it behaves:
- Without signal, everything is kept on the phone; the top bar shows e.g. *Offline · 3 to sync*.
- With signal it syncs within seconds of a change, when the app is opened, and every 90 seconds.
- Corrections made on another device are merged **component by component**, so an office
  correction to one pile does not wipe a defect added on site to another.
- Photos appear in Drive → **Bridge Inspection → Photos → `Timber-0412_L2_2026-10-10`/`Abut1_P1.jpg`**.
- Nothing is permanently deleted: deleted records are flagged in the Sheet, deleted photos go to
  Drive's bin (30 days).
- **Anyone who has the sync address can read and change the data.** Keep it within your team.
  If you change the script, use **Deploy → Manage deployments → Edit → New version** so the
  address stays the same.

## 2. Install on each phone (once per phone, with signal)

**iPhone (Safari):** open the address → tap **Share** → **Add to Home Screen** → **Add**.
Always open the app from the new **Bridge Inspect** icon (not from Safari): that is what
keeps the data protected and lets it work offline.

**Android (Chrome):** open the address in **Chrome**. Tap the **Install app** button on the start
page (or Chrome menu **⋮** → **Install app** / *Add to Home screen*) → **Install**. A
**Bridge Inspect** icon appears on the home screen and in the app drawer. Open it from there.
On Android the back gesture / back button steps back one screen inside the app.

Open the app once from the icon while you still have signal; after that it works anywhere.

When asked, allow **Camera** and **Location** (location is only used to tag photos and the
bridge position; the phone's GPS works without mobile signal).

## 3. On site

1. Pick the bridge type on the start page (Timber, Concrete, Steel, Underpass) and enter the layout.
2. Open the bridge → **Start inspection**.
3. Choose a location (Abut 1, Span 1, Pier 1 …) → tap a component → tick defects, add comments
   (tap **Speak** and use the keyboard microphone), take photos → **Done**.
4. **Review & finish** → **Complete inspection**. The export is prepared; tap **Share / Save**
   and send it to Files, OneDrive, SharePoint, Mail or AirDrop.

The export ZIP contains:
- the Word report: summary table, then each photo captioned
  `Picture 1: Abutment 1 Pile No.1 - <comment or defects>`
- `Photos/` with every picture as its own file (`Abut1_P1.jpg`, `Abut1_P1_2.jpg`, `Pier2_Halfcap.jpg` …)
- `Picture index.csv` (picture number, file, caption, defects, comments, time, GPS)
- the inspection data (JSON)

### Photos in the iPhone Photos app
Every photo is always kept inside the app. Nothing interrupts you while taking photos.
When you tap **Done** on a component, its new camera photos are handed to iPhone together
(named e.g. `Pier1_C1.jpg`, `Pier1_C1_2.jpg`); tap **Save Images** once to keep them in the
Photos app. iPhone always asks this once: web apps are never allowed to save to Photos silently.
Turn it off under **Data → Settings**. On the Review screen, **Save all pictures to Photos**
does the whole inspection at once.

**Android:** when you tap **Done**, the new photos of that component are saved straight to
**Downloads** with their component names, and show up in **Gallery / Google Photos**
(Library → Download). The first time, Chrome may ask to *allow multiple downloads* → **Allow**.
Word reports and ZIP exports also save to **Downloads**; open them from the notification or the
**Files** app, or share them from there to Drive, OneDrive or email.

Alternative with no extra tap on iPhone: take photos with the iPhone Camera app (they go straight to
Photos), then attach them in this app with **Choose several**.

## 4. Keep your data safe

- Without online sync, data lives only on that phone: **export each inspection when you finish it.**
  With sync set up, the Google Sheet and Drive hold a copy once the phone has had signal.
- **Data → Back up everything** makes one ZIP with all bridges, inspections and photos.
  Save it to OneDrive/SharePoint. **Restore from a backup** brings it back on the same or a new phone.
- Deleting the home-screen app, or clearing Safari website data, deletes the inspections on that phone.

## Updating the app later

Upload the changed files to the same place and change `VERSION` at the top of `sw.js`
(for example `bsi-v5` → `bsi-v6`). Phones pick up the new version the next time the app is
opened with signal, and use it from the following launch. Inspections already on the phone are kept.

## Picture report (PC / laptop)

Open the app link in Chrome or Edge on a computer (it syncs from Google Drive), then click **Open picture report** on the home page, or **Picture report** on an inspection's Review page / Photos folder.

- Left: the inspection's elements, grouped by location. Click an element to show its pictures.
- Drag a picture (or a whole element) onto the A4 pages. Two pictures fit per page; drop on the top or bottom half of a picture to place it before or after. Drag pictures on the pages to reorder.
- Captions number automatically: "Picture 1: Abutment 1 Pile No.1 - …". Click a caption to change the description (↺ puts the automatic one back).
- Hover a picture to change its size, rotate it (⟲ ⟳), make it full page, move or remove it.
- **Export Word** downloads `<package>_Pictures.docx` laid out exactly as shown. The layout is remembered on that computer.

## Source code and protection

- The readable source is `src/index.html`. **Do not edit `index.html` directly**: it is generated.
- After changing `src/index.html`, run `node build.mjs`. This minifies the code, shortens every name and encodes it, then writes the published `index.html`. Bump `VERSION` in `sw.js` so phones pick up the change.
- `.vercelignore` stops `src/`, `build.mjs`, this README and the Apps Script from being published on the website.
- Keep this GitHub repository **private** so the readable source in `src/` cannot be seen (Settings → General → Danger Zone → Change visibility → Private). Vercel keeps deploying from a private repository.
