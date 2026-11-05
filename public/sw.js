const CACHE_NAME = 'citymaster-v96';
// Caches conservés d'une version à l'autre : le fond de carte et les
// corrections d'administration doivent rester disponibles hors-ligne.
const TILE_CACHE = 'citymaster-tiles-v1';
const DATA_CACHE = 'citymaster-data-v1';
const MAX_TILES = 4000;
const TILE_TRIM_EVERY = 50;
const KEPT_CACHES = [CACHE_NAME, TILE_CACHE, DATA_CACHE];

const STATIC_ASSETS = [
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://cdn.jsdelivr.net/npm/@turf/turf@6/turf.min.js",
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.png",
  "/favicon.ico",
  "/assets/images/icon-192.png",
  "/assets/images/icon-512.png",
  "/assets/images/maskable-icon-512.png",
  "/assets/images/apple-touch-icon.png",
  "/assets/images/icon.svg",
  "/assets/images/default-avatar.png",
  "/assets/images/boykisser.gif",
  "/assets/images/kofi-cat.png",
  "/assets/images/kofi-cat2.png",
  "/assets/images/monuments/arc-triomphe.png",
  "/assets/images/monuments/louvre-pyramid.png",
  "/assets/images/monuments/eiffel-tower.png",
  "/assets/images/earth.png",
  "/assets/styles/variables.css",
  "/assets/styles/base.css",
  "/assets/styles/navbar.css",
  "/assets/styles/components/buttons.css",
  "/assets/styles/components/cards.css",
  "/assets/styles/components/forms.css",
  "/assets/styles/components/badges.css",
  "/assets/styles/components/messages.css",
  "/assets/styles/components/loaders.css",
  "/assets/styles/components/flight-loader.css",
  "/assets/styles/components.css",
  "/assets/styles/landing.css",
  "/assets/styles/auth.css",
  "/assets/styles/game.css",
  "/assets/styles/certificate.css",
  "/assets/styles/profile.css",
  "/assets/styles/legal.css",
  "/assets/styles/setup.css",
  "/assets/styles/room.css",
  "/assets/styles/admin.css",
  "/assets/styles/changelog.css",
  "/assets/styles/support.css",
  "/assets/styles/moderation.css",
  "/assets/styles/style.css",
  "/screens/landing.html",
  "/screens/setup.html",
  "/screens/game.html",
  "/screens/certificate.html",
  "/screens/auth.html",
  "/screens/profile.html",
  "/screens/admin.html",
  "/screens/room.html",
  "/screens/legal.html",
  "/screens/load.html",
  "/screens/changelog.html",
  "/screens/support.html",
  "/screens/moderation.html",
  "/CHANGELOG.md",
  "/assets/i18n/fr.json",
  "/assets/i18n/en.json",
  "/src/app.js",
  "/src/Router.js",
  "/src/models/GameSession.js",
  "/src/utils/security.js",
  "/src/controllers/AdminController.js",
  "/src/controllers/AuthController.js",
  "/src/controllers/GameController.js",
  "/src/controllers/ProfileController.js",
  "/src/controllers/RoomController.js",
  "/src/controllers/ScoreController.js",
  "/src/services/ApiService.js",
  "/src/services/AudioService.js",
  "/src/services/ConfettiService.js",
  "/src/services/FlashMessageService.js",
  "/src/services/HapticService.js",
  "/src/services/I18nService.js",
  "/src/services/NetworkService.js",
  "/src/services/OverpassService.js",
  "/src/services/RouteDifficultyService.js",
  "/src/services/ScoringService.js",
  "/src/services/SpatialService.js",
  "/src/services/StorageService.js",
  "/src/views/AdminView.js",
  "/src/views/AuthView.js",
  "/src/views/CertificateView.js",
  "/src/views/GameView.js",
  "/src/views/MapView.js",
  "/src/views/NavbarView.js",
  "/src/views/ProfileView.js",
  "/src/views/RoomView.js",
  "/src/views/ChangelogView.js",
  "/src/views/components/FlightLoader.js",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => {
          return fetch(asset, { cache: "reload" }).then((response) => {
            if (response && response.ok) {
              return cache.put(asset, response);
            }
          });
        }),
      );
    }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (!KEPT_CACHES.includes(key)) {
              return caches.delete(key);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ error: "Vous êtes actuellement hors-ligne." }),
          {
            status: 503,
            statusText: "Service Unavailable",
            headers: {
              "Content-Type": "application/json",
              "X-CityMaster-Offline": "1",
            },
          },
        );
      }),
    );
    return;
  }

  const isTile =
    url.hostname.endsWith("tile.openstreetmap.org") ||
    url.hostname.endsWith("cartocdn.com") ||
    url.hostname.endsWith("arcgisonline.com");

  if (isTile) {
    event.respondWith(serveTile(event.request));
    return;
  }

  const isAllowedCdn =
    url.hostname === "unpkg.com" ||
    url.hostname.endsWith(".unpkg.com") ||
    url.hostname === "cdn.jsdelivr.net" ||
    url.hostname.endsWith(".jsdelivr.net");

  // Les fichiers de villes (souvent plusieurs Mo) sont déjà conservés dans
  // IndexedDB par l'application : inutile de les dupliquer dans ce cache.
  const isCityDataFile =
    url.pathname.startsWith("/assets/data/") &&
    !url.pathname.startsWith("/assets/data/custom_");
  const isCustomDataFile = url.pathname.startsWith("/assets/data/custom_");

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const isCacheable =
          !isCityDataFile &&
          networkResponse &&
          networkResponse.status === 200 &&
          (networkResponse.type === "basic" ||
            (networkResponse.type === "cors" && isAllowedCdn));

        if (isCacheable) {
          const responseToCache = networkResponse.clone();
          caches
            .open(isCustomDataFile ? DATA_CACHE : CACHE_NAME)
            .then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(async () => {
        const cached = await caches.match(event.request, {
          ignoreSearch: true,
        });
        if (cached) return cached;
        if (event.request.mode === "navigate") {
          const indexPage = await caches.match("/index.html");
          if (indexPage) return indexPage;
        }
        return caches.match(url.pathname);
      }),
  );
});

let tilePutCount = 0;

/**
 * Tuiles de carte : servies depuis le cache quand elles y sont (elles changent
 * rarement), sinon téléchargées puis conservées. Le cache est borné à
 * MAX_TILES entrées, les plus anciennes étant supprimées en premier.
 */
async function serveTile(request) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === "cors") {
      await cache.put(request, response.clone());
      tilePutCount++;
      if (tilePutCount % TILE_TRIM_EVERY === 0) {
        trimTileCache(cache).catch(() => {});
      }
    }
    return response;
  } catch (err) {
    return Response.error();
  }
}

async function trimTileCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_TILES;
  for (let i = 0; i < excess; i++) {
    await cache.delete(keys[i]);
  }
}
