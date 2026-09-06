// Service Worker for Mellow Music Player PWA
const STATIC_CACHE = 'mellow-static-v2';
const MEDIA_CACHE = 'mellow-media-v1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => cache.addAll(['/', '/logo.png', '/manifest.json']))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((names) => Promise.all(
                names
                    .filter((name) => ![STATIC_CACHE, MEDIA_CACHE].includes(name))
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

const isCacheableMedia = (request) => {
    if (request.method !== 'GET' || request.headers.has('range')) return false;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return false;
    return /\.(?:png|jpe?g|webp|gif|mp3|wav|m4a|ogg)$/i.test(url.pathname)
        || /\/api\/songs\/(?:cover|stream)\//i.test(url.pathname);
};

self.addEventListener('fetch', (event) => {
    if (!isCacheableMedia(event.request)) return;

    event.respondWith(
        caches.open(MEDIA_CACHE).then(async (cache) => {
            const cached = await cache.match(event.request);
            if (cached) {
                console.debug('[sw] media cache hit', new URL(event.request.url).pathname);
                return cached;
            }

            console.debug('[sw] media network fetch', new URL(event.request.url).pathname);
            const response = await fetch(event.request);
            if (response.ok) {
                await cache.put(event.request, response.clone());
            }
            return response;
        })
    );
});
// Push notification handling
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'New music update available!',
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'Open App',
                icon: '/logo.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/logo.png'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('Mellow Music Player', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});
