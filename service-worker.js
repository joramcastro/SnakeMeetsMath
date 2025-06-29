const CACHE_NAME = 'math-snake-game-v5';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/offline.html',
    '/manifest.json',
    '/icons/SnakeMath192.png',
    '/icons/SnakeMath512.png',
    'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css',
    'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;700&display=swap',
    'https://fonts.gstatic.com/s/pressstart2p/v15/8GYoNGRUIzNwWs4QfFjpypZZFw.woff2',
    'https://fonts.gstatic.com/s/inter/v13/UcCOpgEqsYDdMjEEs-zVzmzh.woff2'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Cache.addAll failed:', error);
            })
    );
});

self.addEventListener('activate', event => {
    self.clients.claim();
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.url.startsWith('http')) {
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    if (response) {
                        return response;
                    }

                    return fetch(event.request)
                        .then(networkResponse => {
                            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                                return networkResponse;
                            }

                            const responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                            return networkResponse;
                        })
                        .catch(error => {
                            console.log('Service Worker: Network request failed, serving from cache if available:', event.request.url, error);
                            return caches.match(event.request);
                        });
                })
        );
    }
});
