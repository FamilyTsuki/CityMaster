const CACHE_NAME = 'citymaster-v11';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/favicon.ico',
  '/assets/images/icon-192.png',
  '/assets/images/icon-512.png',
  '/assets/images/maskable-icon-512.png',
  '/assets/images/apple-touch-icon.png',
  '/assets/images/icon.svg',
  '/assets/images/default-avatar.png',
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
  '/assets/styles/game.css',
  '/assets/styles/certificate.css',
  '/assets/styles/profile.css',
  '/assets/styles/legal.css',
  '/assets/styles/setup.css',
  '/assets/styles/room.css',
  '/assets/styles/admin.css',
  '/assets/styles/style.css',
  '/screens/landing.html',
  '/screens/setup.html',
  '/screens/game.html',
  '/screens/certificate.html',
  '/screens/auth.html',
  '/screens/profile.html',
  '/screens/admin.html',
  '/screens/room.html',
  '/screens/legal.html',
  '/assets/i18n/fr.json',
  '/assets/i18n/en.json',
  '/src/app.js',
  '/src/Router.js',
  '/src/models/GameSession.js',
  '/src/utils/security.js',
  '/src/controllers/AdminController.js',
  '/src/controllers/AuthController.js',
  '/src/controllers/GameController.js',
  '/src/controllers/ProfileController.js',
  '/src/controllers/RoomController.js',
  '/src/controllers/ScoreController.js',
  '/src/services/ApiService.js',
  '/src/services/AudioService.js',
  '/src/services/ConfettiService.js',
  '/src/services/CustomLotissementService.js',
  '/src/services/FlashMessageService.js',
  '/src/services/I18nService.js',
  '/src/services/OverpassService.js',
  '/src/services/RouteDifficultyService.js',
  '/src/services/SpatialService.js',
  '/src/views/AdminView.js',
  '/src/views/AuthView.js',
  '/src/views/CertificateView.js',
  '/src/views/GameView.js',
  '/src/views/MapView.js',
  '/src/views/NavbarView.js',
  '/src/views/ProfileView.js',
  '/src/views/RoomView.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
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
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

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

  const isAllowedCdn = (
    url.hostname === 'unpkg.com' ||
    url.hostname.endsWith('.unpkg.com') ||
    url.hostname === 'cdn.jsdelivr.net' ||
    url.hostname.endsWith('.jsdelivr.net')
  );

  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      const isCacheable = networkResponse && networkResponse.status === 200 && (
        networkResponse.type === 'basic' ||
        (networkResponse.type === 'cors' && isAllowedCdn)
      );

      if (isCacheable) {
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
      }
      return networkResponse;
    }).catch(async () => {
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const indexPage = await caches.match('/index.html');
        if (indexPage) return indexPage;
      }
      return caches.match(url.pathname);
    })
  );
});
