import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import * as turf from '@turf/turf';

/**
 * Mode hors-ligne : détection d'un serveur injoignable et poursuite de la
 * partie sans lui. Le code navigateur tourne dans Node avec des doublures
 * minimales du DOM et de fetch.
 */
function installDomStubs() {
  const makeElement = () => {
    const el = {
      classList: { add: () => {}, remove: () => {}, contains: () => false },
      appendChild: () => {},
      querySelector: () => null,
      innerHTML: '',
    };
    return el;
  };
  const body = makeElement();
  body.contains = () => true;
  global.window = { turf, addEventListener: () => {} };
  global.document = { body, getElementById: () => null, createElement: makeElement };
  global.requestAnimationFrame = () => {};
}

function jsonResponse(data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'content-type': 'application/json', ...headers },
  });
}

const STREETS = ['Rue A', 'Rue B', 'Rue C', 'Rue D'].map((name, i) => ({
  type: 'Feature',
  properties: { name, highway: 'residential' },
  geometry: {
    type: 'LineString',
    coordinates: [
      [2.35 + i * 0.002, 48.85],
      [2.351 + i * 0.002, 48.851],
    ],
  },
}));

test('ApiService : un serveur injoignable passe l’application hors-ligne, une réponse la remet en ligne', async () => {
  installDomStubs();
  const { ApiService } = await import('../src/services/ApiService.js');
  const { NetworkService } = await import('../src/services/NetworkService.js');
  const network = NetworkService.getInstance();

  global.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };
  const failed = await ApiService.get('/cities?q=tours');
  assert.equal(failed.offline, true);
  assert.equal(network.isOnline(), false);

  global.fetch = async () => jsonResponse({ ok: true });
  const ok = await ApiService.get('/version');
  assert.equal(ok.offline, false);
  assert.equal(network.isOnline(), true);

  global.fetch = async () =>
    new Response('{}', {
      status: 503,
      headers: { 'content-type': 'application/json', 'X-CityMaster-Offline': '1' },
    });
  const fallback = await ApiService.get('/cities?q=tours');
  assert.equal(fallback.offline, true, 'réponse de repli du service worker');
  assert.equal(network.isOnline(), false);

  network.reportReachable();
});

test('Partie en cours : la connexion coupée, la manche est évaluée localement et la partie continue', async () => {
  installDomStubs();
  const store = { username: 'alice' };
  global.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
  };

  let serverDown = false;
  global.fetch = async (url) => {
    if (serverDown) throw new TypeError('Failed to fetch');
    if (url === '/api/cities/generate') return jsonResponse({ ok: true });
    if (url === '/api/game/start') {
      return jsonResponse({
        gameToken: 'v2.token',
        isFinished: false,
        nextPrompt: { roundIndex: 0, totalRounds: 3, mode: 'target', streetName: 'Rue B', timeLimit: 60 },
      });
    }
    if (url === '/assets/data/paris.json') {
      return jsonResponse({ type: 'FeatureCollection', features: STREETS });
    }
    return jsonResponse({});
  };

  const callbacks = {};
  const recorder = (overrides = {}) =>
    new Proxy(overrides, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        if (typeof prop === 'string' && prop.startsWith('on')) {
          return (cb) => {
            callbacks[prop] = cb;
          };
        }
        return () => Promise.resolve();
      },
    });
  const gameView = recorder({ isReportModalOpen: () => false });
  const mapView = recorder({ getTempMarkerLatLng: () => ({ lat: 48.851, lng: 2.3525 }) });
  const errors = [];
  gameView.showError = (msg) => errors.push(msg);

  const { GameController } = await import('../src/controllers/GameController.js');
  const { NetworkService } = await import('../src/services/NetworkService.js');
  const controller = new GameController(gameView, mapView, recorder(), { navigate: () => {} }, recorder());

  const city = { key: 'paris', name: 'Paris', bbox: '48.84,2.34,48.86,2.36', center: [48.85, 2.35], osmId: 1 };
  await callbacks.onStart('alice', city, 'target', 'hard');
  assert.deepEqual(errors, []);
  assert.equal(JSON.parse(store.citymaster_session).gameToken, 'v2.token');

  serverDown = true;
  callbacks.onClickMap(48.851, 2.3525);
  await callbacks.onValidate();

  assert.deepEqual(errors, [], 'aucune erreur affichée au joueur');
  const saved = JSON.parse(store.citymaster_session);
  assert.equal(saved.gameToken, 'offline_token', 'la partie continue hors-ligne');
  assert.equal(saved.nextPrompt.roundIndex, 1, 'numérotation des manches conservée');
  assert.equal(saved.nextPrompt.totalRounds, 3, 'nombre total de manches conservé');
  assert.notEqual(saved.nextPrompt.streetName, 'Rue B', 'la manche suivante porte sur une autre rue');

  controller.abandonSession();
  NetworkService.getInstance().reportReachable();
});

test('Démarrage : serveur injoignable, la partie est lancée hors-ligne (ville non enregistrée signalée)', async () => {
  installDomStubs();
  global.fetch = async () => {
    throw new TypeError('Failed to fetch');
  };

  const callbacks = {};
  const errors = [];
  const stub = (overrides = {}) =>
    new Proxy(overrides, {
      get: (target, prop) => {
        if (prop in target) return target[prop];
        if (typeof prop === 'string' && prop.startsWith('on')) {
          return (cb) => {
            callbacks[prop] = cb;
          };
        }
        return () => Promise.resolve();
      },
    });
  const gameView = stub({ showError: (msg) => errors.push(msg) });

  const { GameController } = await import('../src/controllers/GameController.js');
  const { NetworkService } = await import('../src/services/NetworkService.js');
  new GameController(gameView, stub(), stub(), { navigate: () => {} }, stub());

  const city = { key: 'tours', name: 'Tours', bbox: '47.3,0.6,47.4,0.7', center: [47.39, 0.68], osmId: 2 };
  await callbacks.onStart('alice', city, 'target', 'hard');

  assert.equal(errors.length, 1);
  assert.match(errors[0], /pas encore enregistrée pour le mode hors-ligne/);
  NetworkService.getInstance().reportReachable();
});

test('Service worker : carte et corrections conservées entre les versions, bibliothèques pré-cachées', () => {
  const sw = fs.readFileSync('public/sw.js', 'utf8');
  assert.match(sw, /KEPT_CACHES = \[CACHE_NAME, TILE_CACHE, DATA_CACHE\]/);
  assert.match(sw, /!KEPT_CACHES\.includes\(key\)/, 'seuls les caches inconnus sont supprimés à l’activation');
  assert.match(sw, /"https:\/\/unpkg\.com\/leaflet@1\.9\.4\/dist\/leaflet\.js"/);
  assert.match(sw, /"https:\/\/cdn\.jsdelivr\.net\/npm\/@turf\/turf@6\/turf\.min\.js"/);
  assert.match(sw, /"X-CityMaster-Offline": "1"/, 'réponse de repli identifiable par le client');
  assert.match(sw, /isCustomDataFile \? DATA_CACHE : CACHE_NAME/);
});
