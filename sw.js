// Offline support: the whole app is cached on the phone the first time it opens.
// After that it opens with no signal. When there is signal, a newer version is
// fetched in the background and used the next time the app is opened.
// Bump VERSION whenever you upload changed files.
const VERSION = 'bsi-v22';
const ASSETS = [
  './',
  './index.html',
  './config.js',
  './lib/jszip.min.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  // config.js: use the latest copy when online so a new sync address reaches every phone.
  if (url.pathname.endsWith('/config.js')) {
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const c = res.clone(); caches.open(VERSION).then((x) => x.put('./config.js', c)); } return res; })
      .catch(() => caches.match('./config.js')));
    return;
  }

  // Pages: answer from the phone straight away, refresh the copy in the background.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const cached = (await cache.match('./index.html')) || (await cache.match('./'));
      const refresh = fetch(req).then((res) => { if (res.ok) cache.put('./index.html', res.clone()); return res; }).catch(() => null);
      return cached || (await refresh) || new Response('Offline and not yet installed. Open the app once with signal.', { status: 503 });
    })());
    return;
  }

  // Other files: cache first, network as fallback (and keep a copy).
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
