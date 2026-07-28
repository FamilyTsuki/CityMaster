const CACHE_NAME = 'citymaster-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/assets/styles/variables.css',
  '/assets/styles/base.css',
  '/assets/styles/navbar.css',
  '/assets/styles/components/buttons.css',
  '/assets/styles/components/cards.css',
  '/assets/styles/components/forms.css',
  '/assets/styles/components/badges.css',
  '/assets/styles/components/messages.css',
  '/assets/styles/components/loaders.css',
  '/assets/styles/components.css',
  '/assets/styles/landing.css',
  '/assets/styles/auth.css',
  '/assets/styles/welcome.css',
  '/assets/styles/game.css',
  '/assets/styles/certificate.css',
  '/assets/styles/profile.css',
  '/assets/styles/legal.css',
  '/assets/styles/style.css',
  '/screens/legal.html',
  '/assets/i18n/fr.json',
  '/assets/i18n/en.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Vous êtes actuellement hors-ligne.' }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).catch(() => {
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        return networkResponse;
      }).catch(() => {
        return new Response('', { status: 408 });
      });
    })
  );
});
