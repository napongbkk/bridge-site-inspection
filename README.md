# Bridge Site Inspection — offline web app

Works on iPhone, Android, tablets and laptops. After it is installed on the home screen it
opens and saves **with no signal**. Bridges, inspections and photos are stored on the phone
until you export them.

## What is in this folder

| File | What it does |
|---|---|
| `index.html` | The whole app |
| `sw.js` | Offline mode (keeps a copy of the app on the phone) |
| `manifest.webmanifest`, `icons/` | Home-screen name and icon |
| `lib/jszip.min.js` | Builds the Word report and ZIP files on the phone |

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

## 2. Install on each phone (once per phone, with signal)

**iPhone (Safari):** open the address → tap **Share** → **Add to Home Screen** → **Add**.
Always open the app from the new **Bridge Inspect** icon (not from Safari): that is what
keeps the data protected and lets it work offline.

**Android (Chrome):** open the address → menu ⋮ → **Install app** (or *Add to Home screen*).

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
Every photo is always kept inside the app. A web app is not allowed to write into the Photos
app by itself, so after each camera photo the app offers **Save to Photos**: tap it, then
**Save Image** in the share sheet. (Choose **Save to Files** instead to keep the component file
name such as `Abut1_P1.jpg`.) On the Review screen, **Save all pictures to Photos** does the
whole inspection at once. Turn the after-each-photo offer off under **Data → Settings**.

Alternative: take photos with the iPhone Camera app (they go straight to Photos), then attach
them in the app with **Choose several**.

## 4. Keep your data safe

- Data lives only on that phone. **Export each inspection when you finish it.**
- **Data → Back up everything** makes one ZIP with all bridges, inspections and photos.
  Save it to OneDrive/SharePoint. **Restore from a backup** brings it back on the same or a new phone.
- Deleting the home-screen app, or clearing Safari website data, deletes the inspections on that phone.

## Updating the app later

Upload the changed files to the same place and change `VERSION` at the top of `sw.js`
(for example `bsi-v1` → `bsi-v2`). Phones pick up the new version the next time the app is
opened with signal, and use it from the following launch. Inspections already on the phone are kept.
