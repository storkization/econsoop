const CACHE = 'viva-economy-v36';
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
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // API 호출은 네트워크만
  if (e.request.url.includes('/api/')) {
    return;
  }
  // 모든 리소스: 네트워크 우선, 실패 시 캐시 폴백 (항상 최신 배포 반영)
  e.respondWith(
    fetch(e.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
