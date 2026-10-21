import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import pool, {
  initDB,
  closeDB,
  isDatabaseEnabled,
  isDatabasePending,
  isTransientConnectionError,
  setDatabaseEnabled,
} from '../src/backend/config/database.js';
import { USERS_FILE } from '../src/backend/config/paths.js';
import { writeJsonFile } from '../src/backend/utils/jsonStore.js';
import { requireAccountStorage } from '../src/backend/middleware/auth.js';
import { User } from '../src/backend/models/User.js';
import { CityCustomization } from '../src/backend/models/CityCustomization.js';
import { getPlayableStreets } from '../src/backend/services/CityStreetsService.js';
import { getCustomizationKey, mergeCityStreets } from '../src/services/SpatialService.js';
import { createMockRes, makeCity, makeStreet, writeDataFile } from './helpers.js';

/**
 * Mise à jour d'un serveur existant : ses données (fichiers ignorés par git,
 * base PostgreSQL) doivent rester lues et modifiables comme avant.
 */

function connectionError(code, message = code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/** Simule un serveur configuré avec PostgreSQL (journaux de connexion masqués). */
async function withDatabaseEnv(run) {
  const previous = process.env.DB_DISABLED;
  const originalQuery = pool.query;
  const { log, warn } = console;
  console.log = () => {};
  console.warn = () => {};
  delete process.env.DB_DISABLED;
  try {
    await run();
  } finally {
    pool.query = originalQuery;
    process.env.DB_DISABLED = previous;
    await initDB();
    setDatabaseEnabled(false);
    console.log = log;
    console.warn = warn;
  }
}

test('transient connection errors are told apart from configuration errors', () => {
  assert.equal(isTransientConnectionError(connectionError('ECONNREFUSED')), true);
  assert.equal(isTransientConnectionError(connectionError('57P03', 'the database system is starting up')), true);
  assert.equal(isTransientConnectionError(connectionError('3D000', 'database "citymaster" does not exist')), false);
  assert.equal(isTransientConnectionError(connectionError('28P01', 'password authentication failed')), false);
});

test('initDB waits for a PostgreSQL that starts after the server instead of switching to local mode', async () => {
  await withDatabaseEnv(async () => {
    let available = false;
    const statements = [];
    pool.query = async (sql) => {
      if (!available) throw connectionError('ECONNREFUSED', 'connect ECONNREFUSED 127.0.0.1:5432');
      statements.push(sql);
      return { rows: [], rowCount: 0 };
    };

    let readyCalls = 0;
    const ready = new Promise((resolve) => {
      initDB({
        retryDelaysMs: [5],
        onReady: async () => {
          readyCalls++;
          resolve();
        },
      }).then((enabled) => {
        assert.equal(enabled, false);
        assert.equal(isDatabasePending(), true, 'la base est attendue');
        assert.equal(isDatabaseEnabled(), false, 'aucune donnée ne part dans les fichiers locaux en attendant');
        available = true;
      });
    });

    await ready;
    assert.equal(readyCalls, 1);
    assert.equal(isDatabaseEnabled(), true);
    assert.equal(isDatabasePending(), false);
    assert.ok(statements.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS users')));
  });
});

test('initDB uses local mode right away when the database itself is unusable', async () => {
  await withDatabaseEnv(async () => {
    pool.query = async () => {
      throw connectionError('3D000', 'database "citymaster" does not exist');
    };
    assert.equal(await initDB(), false);
    assert.equal(isDatabasePending(), false);
    assert.equal(isDatabaseEnabled(), false);
  });
});

test('accounts and admin routes answer 503 while PostgreSQL is awaited', async () => {
  await withDatabaseEnv(async () => {
    pool.query = async () => {
      throw connectionError('ECONNREFUSED');
    };
    await initDB({ reconnect: false });
    assert.equal(isDatabasePending(), true);

    const res = createMockRes();
    let passed = false;
    requireAccountStorage({}, res, () => {
      passed = true;
    });
    assert.equal(passed, false);
    assert.equal(res.statusCode, 503);
    assert.equal(res.headers['retry-after'], '10');
  });

  const res = createMockRes();
  let passed = false;
  requireAccountStorage({}, res, () => {
    passed = true;
  });
  assert.equal(passed, true, 'le mode local reste utilisable');
});

test('closeDB stops pending reconnection attempts', async () => {
  const originalEnd = pool.end;
  pool.end = async () => {};
  try {
    await withDatabaseEnv(async () => {
      let attempts = 0;
      pool.query = async () => {
        attempts++;
        throw connectionError('ECONNREFUSED');
      };
      await initDB({ retryDelaysMs: [20] });
      assert.equal(isDatabasePending(), true);
      await closeDB();
      const attemptsAtClose = attempts;
      await new Promise((resolve) => setTimeout(resolve, 60));
      assert.equal(attempts, attemptsAtClose, 'plus aucune tentative après closeDB');
    });
  } finally {
    pool.end = originalEnd;
  }
});

test('accounts stored only in users.json are copied into PostgreSQL without touching existing ones', async () => {
  await fs.writeFile(
    USERS_FILE,
    JSON.stringify([
      { id: 1, username: 'ancien_admin', password: 'hash-1', is_admin: true, profile_image_url: '/uploads/avatar_1.webp' },
      { id: 2, username: 'Deja_En_Base', password: 'hash-2', is_admin: false },
      { id: 3, username: '   ', password: 'hash-3' },
    ]),
  );
  const originalQuery = pool.query;
  const inserted = [];
  pool.query = async (sql, params) => {
    assert.match(sql, /WHERE NOT EXISTS \(SELECT 1 FROM users WHERE LOWER\(username\) = LOWER\(\$1\)\)/);
    if (params[0].toLowerCase() === 'deja_en_base') return { rows: [], rowCount: 0 };
    inserted.push(params);
    return { rows: [], rowCount: 1 };
  };
  setDatabaseEnabled(true);
  try {
    assert.equal(await User.importFileUsersIntoDatabase(), 1);
    assert.deepEqual(inserted, [['ancien_admin', 'hash-1', null, '/uploads/avatar_1.webp', true]]);
  } finally {
    setDatabaseEnabled(false);
    pool.query = originalQuery;
  }
  const fileAfter = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
  assert.equal(fileAfter.length, 3, 'users.json reste intact');
});

test('a session token only grants the account whose id and username both match', async () => {
  const alice = await User.create('session_alice', 'hash');

  assert.equal((await User.findForSession({ id: alice.id, username: 'SESSION_ALICE' })).id, alice.id);
  assert.equal(await User.findForSession({ id: alice.id, username: 'someone_else' }), null);
  assert.equal(await User.findForSession({ id: null, username: 'session_alice', is_guest: true }), null);
  assert.equal(await User.findForSession(null), null);
});

test('deleting an unmodified city street from the admin list removes it everywhere', async () => {
  const target = makeStreet('Rue à Supprimer', { lengthMeters: 120, lat: 47.95 });
  const city = makeCity([target]);
  city.features.forEach((feature, index) => {
    feature.id = index;
  });
  await writeDataFile('upgrade_delete.json', city);

  const adminList = mergeCityStreets(city.features, [], await CityCustomization.getRoutes('upgrade_delete'));
  const listed = adminList.find((f) => f.properties.name === 'Rue à Supprimer');
  const key = getCustomizationKey(listed);
  assert.equal(key, 'Rue à Supprimer', "le nom est envoyé, pas la position de la rue dans le fichier");

  await CityCustomization.deleteRoute('upgrade_delete', key);

  const { streets } = await getPlayableStreets('upgrade_delete');
  assert.ok(!streets.some((s) => s.feature.properties.name === 'Rue à Supprimer'), 'retirée du jeu');
  const listAfter = mergeCityStreets(city.features, [], await CityCustomization.getRoutes('upgrade_delete'));
  assert.ok(!listAfter.some((f) => f.properties.name === 'Rue à Supprimer'), "retirée de l'administration");
  assert.equal(streets.length, 10, 'les autres rues restent jouables');
});

test('a customised street keeps its own id as deletion key', () => {
  assert.equal(getCustomizationKey({ id: 13, properties: { id: 'route_1', name: 'Rue A' } }), 'route_1');
  assert.equal(getCustomizationKey({ id: 13, properties: { id: 13, name: 'Rue A' } }), 13);
  assert.equal(getCustomizationKey({ id: 13, properties: { name: 'Rue A' } }), 'Rue A');
});

test('JSON writes follow symlinks and keep the file permissions', async () => {
  const dir = path.join(process.env.CITYMASTER_DATA_DIR, 'symlink-test');
  const realDir = path.join(dir, 'persistent');
  await fs.mkdir(realDir, { recursive: true });
  const realFile = path.join(realDir, 'custom_routes.json');
  const linkFile = path.join(dir, 'custom_routes.json');
  await fs.writeFile(realFile, '{}');
  await fs.chmod(realFile, 0o640);
  await fs.symlink(realFile, linkFile);

  await writeJsonFile(linkFile, { paris: [] });

  assert.ok((await fs.lstat(linkFile)).isSymbolicLink(), 'le lien est conservé');
  assert.deepEqual(JSON.parse(await fs.readFile(realFile, 'utf8')), { paris: [] });
  assert.equal((await fs.stat(realFile)).mode & 0o777, 0o640);
});

test('JSON writes still work when only the file (not its folder) is writable', async (t) => {
  if (process.getuid?.() === 0) {
    t.skip('root ignore les droits des dossiers');
    return;
  }
  const dir = path.join(process.env.CITYMASTER_DATA_DIR, 'readonly-dir');
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'difficulty_overrides.json');
  await fs.writeFile(file, '{}');
  await fs.chmod(dir, 0o555);
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    await writeJsonFile(file, { paris: { 'rue a': 'easy' } });
    assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), { paris: { 'rue a': 'easy' } });
    assert.deepEqual(await fs.readdir(dir), ['difficulty_overrides.json'], 'aucun fichier temporaire laissé');
  } finally {
    console.warn = originalWarn;
    await fs.chmod(dir, 0o755);
  }
});
