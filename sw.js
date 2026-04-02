const CACHE = 'econsoop-v21';
const ASSETS = [
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/newsroom.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // index.html은 항상 네트워크 우선 (최신 배포 즉시 반영)
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // API 호출은 네트워크만
  if (e.request.url.includes('/api/')) {
    return;
  }
  // 나머지(manifest 등)는 캐시 우선
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
