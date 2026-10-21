import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';

/**
 * Tests du code navigateur exécuté dans Node avec des doublures minimales
 * de window, history et localStorage.
 */
function installBrowserStubs(initialPath = '/') {
  const store = {};
  const pushed = [];
  const location = { pathname: initialPath, hash: '' };
  global.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
  };
  global.window = {
    location,
    history: {
      pushState: (_state, _title, url) => {
        pushed.push(url);
        location.pathname = url;
      },
    },
    addEventListener: () => {},
    turf: undefined,
  };
  return { store, pushed, location };
}

test("Router : revenir à la page d'arrivée met bien l'URL à jour", async () => {
  const { pushed, location } = installBrowserStubs('/');
  const { Router } = await import('../src/Router.js');
  const visited = [];
  const router = new Router({
    '/': () => visited.push('/'),
    '/setup': () => visited.push('/setup'),
  });

  await router.init();
  await router.navigate('/setup');
  // Régression : l'URL restait sur /setup car le routeur se croyait toujours sur '/'.
  await router.navigate('/');

  assert.deepEqual(visited, ['/', '/setup', '/']);
  assert.deepEqual(pushed, ['/setup', '/']);
  assert.equal(location.pathname, '/');
  assert.equal(router.currentPath, '/');

  await router.navigate('/');
  assert.deepEqual(pushed, ['/setup', '/'], 'pas de nouvelle entrée d’historique pour la même URL');
});

test('Service worker : tous les modules du navigateur sont pré-cachés', () => {
  const sw = fs.readFileSync('public/sw.js', 'utf8');
  const precached = new Set([...sw.matchAll(/"(\/[^"]+)"/g)].map((m) => m[1]));

  const frontendModules = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (full !== path.join('src', 'backend')) walk(full);
      } else if (entry.name.endsWith('.js')) {
        frontendModules.push(`/${full.split(path.sep).join('/')}`);
      }
    }
  };
  walk('src');

  const missing = frontendModules.filter((file) => !precached.has(file));
  assert.deepEqual(missing, [], 'modules absents du pré-cache : l’application ne démarrerait pas hors-ligne');

  const stale = [...precached].filter(
    (url) => url.startsWith('/src/') && !fs.existsSync(`.${url}`),
  );
  assert.deepEqual(stale, [], 'fichiers pré-cachés qui n’existent plus');
});

async function createGameController() {
  const noop = new Proxy({}, { get: () => () => {} });
  const { GameController } = await import('../src/controllers/GameController.js');
  const navigations = [];
  const controller = new GameController(noop, noop, noop, { navigate: (p) => navigations.push(p) }, noop);
  return { controller, navigations };
}

function savedSession(overrides = {}) {
  return JSON.stringify({
    playerName: 'alice',
    city: { key: 'paris', name: 'Paris', center: [48.85, 2.35] },
    currentMode: 'target',
    score: 0,
    gameToken: 'v2.token',
    currentPrompt: { roundIndex: 0, totalRounds: 5, streetName: 'Rue A' },
    difficulty: 'hard',
    ...overrides,
  });
}

test('Reprise de partie : une partie hors-ligne sauvegardée est abandonnée proprement', async () => {
  const { store } = installBrowserStubs('/play');
  store.username = 'alice';
  store.citymaster_session = savedSession({ gameToken: 'offline_token' });

  const { controller } = await createGameController();
  assert.equal(controller.resumeGame(), false);
  assert.equal(store.citymaster_session, undefined);
});

test("Reprise de partie : la partie d'un autre compte n'est jamais reprise", async () => {
  const { store } = installBrowserStubs('/play');
  store.username = 'bob';
  store.citymaster_session = savedSession({ playerName: 'alice' });

  const { controller } = await createGameController();
  assert.equal(controller.hasActiveSession(), false);
  assert.equal(controller.resumeGame(), false);
  assert.equal(store.citymaster_session, undefined);
});

test('Messages flash : le texte est affiché sans être interprété comme du HTML', async () => {
  const created = [];
  const makeElement = () => {
    const el = {
      children: [],
      classList: { add: () => {}, remove: () => {} },
      appendChild: (child) => el.children.push(child),
      querySelector: () => null,
      set innerHTML(value) {
        el.html = value;
      },
    };
    created.push(el);
    return el;
  };
  const body = makeElement();
  body.contains = () => true;
  global.document = {
    body,
    getElementById: () => null,
    createElement: makeElement,
  };
  global.requestAnimationFrame = () => {};

  const { FlashMessageService } = await import('../src/services/FlashMessageService.js');
  FlashMessageService.show('<img src=x onerror=alert(1)>', 'error', 0);

  const flash = created.find((el) => el.html);
  assert.ok(flash.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!flash.html.includes('<img'));
});
