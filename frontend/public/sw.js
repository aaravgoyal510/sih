const CACHE = 'krishisetu-offline-v4';
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/offline.html', '/icon.svg'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('krishisetu-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
// Never cache tokens, workspace responses, payment actions or Next development assets.
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || event.request.method !== 'GET') return;
  // Only actual offline navigation gets this document. A server response, an
  // API failure, or a development recompilation remains its own response.
  event.respondWith(fetch(event.request).then(response => response).catch(() => caches.match('/offline.html')));
});
