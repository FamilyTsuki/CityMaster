import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { User, isUserAdmin } from '../src/backend/models/User.js';
import { requireAdmin } from '../src/backend/middleware/auth.js';
import { AdminController } from '../src/backend/controllers/AdminController.js';
import { CityCustomization } from '../src/backend/models/CityCustomization.js';
import { createMockRes, readDataFile } from './helpers.js';

function runRequireAdmin(tokenPayload) {
  const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);
  const req = { method: 'GET', path: '/settings', headers: { authorization: `Bearer ${token}` }, query: {} };
  const res = createMockRes();
  return new Promise((resolve) => {
    res.json = (body) => {
      res.body = body;
      resolve({ passed: false, res });
      return res;
    };
    requireAdmin(req, res, () => resolve({ passed: true, res }));
  });
}

test('isUserAdmin strictly checks is_admin property', () => {
  assert.equal(isUserAdmin(null), false);
  assert.equal(isUserAdmin({}), false);
  assert.equal(isUserAdmin({ username: 'random_user', is_admin: false }), false);
  assert.equal(isUserAdmin({ username: 'random_user', is_admin: true }), true);
  assert.equal(isUserAdmin({ username: 'random_user', is_admin: 'true' }), true);
});

test('User.setAdminStatus updates an existing account and ignores unknown accounts', async () => {
  const created = await User.create('admin_status_user', 'hash');

  const promoted = await User.setAdminStatus('ADMIN_STATUS_USER', true);
  assert.equal(promoted.id, created.id);
  assert.equal(promoted.is_admin, true);
  assert.equal((await User.findByUsername('admin_status_user')).is_admin, true);

  await User.setAdminStatus('admin_status_user', false);
  assert.equal((await User.findByUsername('admin_status_user')).is_admin, false);

  assert.equal(await User.setAdminStatus('nobody_here', true), null);
  const users = JSON.parse(
    await (await import('fs/promises')).readFile(`${process.env.CITYMASTER_STATE_DIR}/users.json`, 'utf8'),
  );
  assert.ok(!users.some((u) => u.username === 'nobody_here'), 'unknown accounts must not be created');
});

test('requireAdmin reads admin rights from the account store, not from the token', async () => {
  const admin = await User.create('store_admin', 'hash');
  await User.setAdminStatus('store_admin', true);

  const allowed = await runRequireAdmin({ id: admin.id, username: 'store_admin', is_admin: false });
  assert.equal(allowed.passed, true, 'admin in store must pass even with a stale token claim');

  await User.setAdminStatus('store_admin', false);
  const revoked = await runRequireAdmin({ id: admin.id, username: 'store_admin', is_admin: true });
  assert.equal(revoked.passed, false, 'revoked admin must be rejected even if the token says admin');
  assert.equal(revoked.res.statusCode, 403);
});

test('requireAdmin never grants admin rights to guest sessions', async () => {
  process.env.ADMIN_USERS = 'reserved_boss';
  try {
    const guest = await runRequireAdmin({
      id: null,
      username: 'reserved_boss',
      is_admin: false,
      is_guest: true,
    });
    assert.equal(guest.passed, false);
    assert.equal(guest.res.statusCode, 403);
  } finally {
    process.env.ADMIN_USERS = '';
  }
});

test('CityCustomization.deleteRoute matches string ids, numeric ids and names', async () => {
  const cityKey = 'delete_city';
  await CityCustomization.saveRoute(cityKey, {
    type: 'Feature',
    properties: { id: 42, name: 'Rue Numeric Id' },
    geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
  });
  await CityCustomization.saveRoute(cityKey, {
    type: 'Feature',
    properties: { id: 'custom_str_99', name: 'Avenue String Id' },
    geometry: { type: 'LineString', coordinates: [[0, 0], [1, 1]] },
  });

  await CityCustomization.deleteRoute(cityKey, '42');
  await CityCustomization.deleteRoute(cityKey, 'Avenue String Id');
  await CityCustomization.deleteRoute(cityKey, 'Rue Inconnue');

  const routes = (await readDataFile('custom_routes.json'))[cityKey];
  assert.equal(routes.length, 3);
  assert.ok(routes.every((r) => r.properties.isDeleted === true));
  assert.equal(routes[0].properties.name, 'Rue Numeric Id');
  assert.equal(routes[1].properties.name, 'Avenue String Id');
  assert.equal(routes[2].properties.name, 'Rue Inconnue');
});

test('AdminController settings: validated values are saved and returned', async () => {
  const saveRes = createMockRes();
  await AdminController.saveSettings({ body: { key: 'disable_places', value: true } }, saveRes);
  assert.equal(saveRes.body.success, true);

  const rejected = createMockRes();
  await AdminController.saveSettings({ body: { key: 'difficulty_mode', value: 'random' } }, rejected);
  assert.equal(rejected.statusCode, 400);

  const unknown = createMockRes();
  await AdminController.saveSettings({ body: { key: 'is_admin', value: 'true' } }, unknown);
  assert.equal(unknown.statusCode, 400);

  const getRes = createMockRes();
  await AdminController.getSettings({}, getRes);
  assert.equal(getRes.body.disable_places, 'true');
  assert.equal(getRes.body.difficulty_mode, 'length');
});
