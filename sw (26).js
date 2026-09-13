const CACHE_NAME = 'reducciones-v56';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './manual-administrador.pdf',
    './manual-profesorado.pdf',
    './icons/favicon-16x16.png',
    './icons/favicon-32x32.png',
    './icons/icon-144x144.png',
    './icons/icon-152x152.png',
    './icons/icon-167x167.png',
    './icons/icon-180x180.png',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png',
    './icons/icon-maskable-192x192.png',
    './icons/icon-maskable-512x512.png'
];

// Install: cache essential assets
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(k) { return k !== CACHE_NAME; })
                    .map(function(k) { return caches.delete(k); })
            );
        })
    );
    self.clients.claim();
});

// Fetch: network-first with cache fallback
self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);
    var sameOrigin = url.origin === self.location.origin;

    // Gestionar SOLO peticiones GET same-origin del alcance de la app.
    // IMPORTANTE: no usar respondWith() para peticiones cross-origin (p. ej.
    // Firestore) ni para no-GET: si el SW responde, ÉL pasa a ser el emisor de
    // la petición ante la red, lo que burla sandboxes de prueba y cualquier
    // política aplicada al contexto de la página. Con `return` sin respondWith,
    // el navegador emite la petición de forma nativa (comportamiento idéntico
    // en producción y interceptable por herramientas de red/test).
    if (event.request.method !== 'GET' || !url.protocol.startsWith('http') || !sameOrigin) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then(function(response) {
                // Cache successful same-origin responses
                if (response && response.status === 200 && response.type === 'basic') {
                    var responseClone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(function() {
                // Fallback to cache
                return caches.match(event.request).then(function(cachedResponse) {
                    return cachedResponse || new Response('Offline', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});
