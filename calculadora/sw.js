// Bump this version whenever the app shell changes. A waiting update activates
// after the previous app windows close, without interrupting an active draft.
const VERSION = 'v2';
const SCOPE = self.registration.scope;
const PREFIX = `anubis-calculadora:${new URL(SCOPE).pathname}:`;
const CACHE = PREFIX + VERSION;
const ASSETS = [
  'index.html', 'styles.css', 'app.js', 'calc.mjs', 'draft.mjs', 'storage.mjs',
  'images.mjs', 'quote.mjs', 'pwa.mjs', 'manifest.webmanifest',
  'assets/jspdf.umd.min.js', 'assets/logo.png', 'assets/logo-white.png',
  'assets/app-icon-192.png', 'assets/app-icon-512.png',
  'assets/app-icon-maskable-512.png', 'assets/apple-touch-icon.png'
];
const assetURLs = new Set(ASSETS.map(asset => new URL(asset, SCOPE).href));
const indexURL = new URL('index.html', SCOPE).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const responses = await Promise.all([...assetURLs].map(async url => {
      const response = await fetch(new Request(url, {cache:'reload',credentials:'same-origin'}));
      // Never save a login redirect or failed response as the offline app shell.
      if (!response.ok || response.redirected) throw new Error(`App asset unavailable: ${url}`);
      const type = response.headers.get('content-type') || '';
      const validType = url.endsWith('.html') ? /text\/html/i.test(type)
        : /\.(m?js)$/.test(url) ? /(?:java|ecma)script/i.test(type)
        : url.endsWith('.css') ? /text\/css/i.test(type)
        : url.endsWith('.png') ? /image\/png/i.test(type)
        : /json/i.test(type);
      if (!validType) throw new Error(`Unexpected asset content: ${url}`);
      return [url, response];
    }));
    const cache = await caches.open(CACHE);
    await Promise.all(responses.map(([url,response]) => cache.put(url,response)));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== new URL(SCOPE).origin || url.search) return;
  let key = url.href;
  if (request.mode === 'navigate' && (url.href === SCOPE || url.href === indexURL)) key = indexURL;
  if (!assetURLs.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    return await cache.match(key) || fetch(request);
  })());
});
