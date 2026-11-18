import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/backend/app.js';
import { User } from '../src/backend/models/User.js';

const server = createApp().listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const player = await User.create('mod_candidate', 'hash');
const admin = await User.create('mod_admin', 'hash');
await User.setAdminStatus('mod_admin', true);

const headersFor = (user) => ({
  Authorization: `Bearer ${jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET)}`,
  'Content-Type': 'application/json',
});
const playerHeaders = headersFor(player);
const adminHeaders = headersFor(admin);

const call = (method, path, headers, body) =>
  fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });

test('une candidature exige une commune connue et un seul dépôt actif par commune', async () => {
  const anonymous = await call('POST', '/api/moderation/applications', { 'Content-Type': 'application/json' }, { cityKey: 'paris' });
  assert.equal(anonymous.status, 401);

  const unknown = await call('POST', '/api/moderation/applications', playerHeaders, { cityKey: 'ville_inexistante' });
  assert.equal(unknown.status, 404);

  const created = await call('POST', '/api/moderation/applications', playerHeaders, {
    cityKey: 'paris',
    motivation: '  Je connais bien le 11e  ',
  });
  assert.equal(created.status, 201);
  const { application } = await created.json();
  assert.equal(application.status, 'pending');
  assert.equal(application.city_name, 'Paris');
  assert.equal(application.motivation, 'Je connais bien le 11e');

  const duplicate = await call('POST', '/api/moderation/applications', playerHeaders, { cityKey: 'paris' });
  assert.equal(duplicate.status, 409);
});

test("seul un administrateur voit et traite les candidatures, et l'accord ouvre l'éditeur de la commune", async () => {
  const forbiddenList = await call('GET', '/api/moderation/applications', playerHeaders);
  assert.equal(forbiddenList.status, 403);

  const beforeApproval = await call('GET', '/api/admin/routes?cityKey=paris', playerHeaders);
  assert.equal(beforeApproval.status, 403);

  const list = await (await call('GET', '/api/moderation/applications?status=pending', adminHeaders)).json();
  const pending = list.find((a) => a.username === 'mod_candidate' && a.city_key === 'paris');
  assert.ok(pending);

  const badStatus = await call('PATCH', `/api/moderation/applications/${pending.id}`, adminHeaders, { status: 'pending' });
  assert.equal(badStatus.status, 400);

  const approved = await call('PATCH', `/api/moderation/applications/${pending.id}`, adminHeaders, { status: 'approved' });
  assert.equal(approved.status, 200);
  assert.equal((await approved.json()).application.reviewed_by, 'mod_admin');

  const mine = await (await call('GET', '/api/moderation/applications/mine', playerHeaders)).json();
  assert.deepEqual(mine.cities, [{ key: 'paris', name: 'Paris' }]);

  const profile = await (await call('GET', '/api/profile', playerHeaders)).json();
  assert.deepEqual(profile.moderatorCities, [{ key: 'paris', name: 'Paris' }]);

  const ownCity = await call('GET', '/api/admin/routes?cityKey=paris', playerHeaders);
  assert.equal(ownCity.status, 200);

  const otherCity = await call('GET', '/api/admin/routes?cityKey=lyon', playerHeaders);
  assert.equal(otherCity.status, 403);

  const settings = await call('GET', '/api/admin/settings', playerHeaders);
  assert.equal(settings.status, 403);
});

test("le retrait des droits ferme l'éditeur de la commune", async () => {
  const list = await (await call('GET', '/api/moderation/applications?status=approved', adminHeaders)).json();
  const approved = list.find((a) => a.username === 'mod_candidate');

  const revoked = await call('PATCH', `/api/moderation/applications/${approved.id}`, adminHeaders, { status: 'revoked' });
  assert.equal(revoked.status, 200);

  const afterRevoke = await call('GET', '/api/admin/routes?cityKey=paris', playerHeaders);
  assert.equal(afterRevoke.status, 403);

  const reapply = await call('POST', '/api/moderation/applications', playerHeaders, { cityKey: 'paris' });
  assert.equal(reapply.status, 201);
});

test('un modérateur ne peut pas viser une autre commune en mélangeant les paramètres', async () => {
  const fresh = await User.create('mod_bypass', 'hash');
  const headers = headersFor(fresh);
  const created = await (await call('POST', '/api/moderation/applications', headers, { cityKey: 'paris' })).json();
  await call('PATCH', `/api/moderation/applications/${created.application.id}`, adminHeaders, { status: 'approved' });

  const route = { name: 'Rue pirate', coordinates: [[2.35, 48.85], [2.36, 48.86]] };
  const res = await call('POST', '/api/admin/routes?cityKey=paris', headers, { cityKey: 'lyon', route });
  assert.equal(res.status, 403);
});

test('deux envois simultanés ne créent qu’une candidature active', async () => {
  const racer = await User.create('mod_racer', 'hash');
  const headers = headersFor(racer);
  const results = await Promise.all(
    [1, 2, 3].map(() => call('POST', '/api/moderation/applications', headers, { cityKey: 'lyon' })),
  );
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [201, 409, 409]);
});

test('les changements de statut suivent un ordre fixe', async () => {
  const player2 = await User.create('mod_transitions', 'hash');
  const headers = headersFor(player2);
  const { application } = await (
    await call('POST', '/api/moderation/applications', headers, { cityKey: 'paris' })
  ).json();
  const patch = (status) => call('PATCH', `/api/moderation/applications/${application.id}`, adminHeaders, { status });

  assert.equal((await patch('revoked')).status, 409);
  assert.equal((await patch('rejected')).status, 200);
  assert.equal((await patch('approved')).status, 409);
  assert.equal((await call('PATCH', '/api/moderation/applications/999999', adminHeaders, { status: 'approved' })).status, 404);

  const editor = await call('GET', '/api/admin/routes?cityKey=paris', headers);
  assert.equal(editor.status, 403);
});

test('un joueur ne peut pas avoir plus de 5 candidatures en attente', async () => {
  const spammer = await User.create('mod_spammer', 'hash');
  const headers = headersFor(spammer);
  const { City } = await import('../src/backend/models/City.js');
  const keys = (await City.getAll()).slice(0, 6).map((c) => c.key);
  assert.equal(keys.length, 6);
  for (const cityKey of keys.slice(0, 5)) {
    assert.equal((await call('POST', '/api/moderation/applications', headers, { cityKey })).status, 201);
  }
  assert.equal((await call('POST', '/api/moderation/applications', headers, { cityKey: keys[5] })).status, 429);
});

test('une commune absente ou de type inattendu ne passe pas le contrôle éditeur', async () => {
  const noCity = await call('GET', '/api/admin/routes', playerHeaders);
  assert.equal(noCity.status, 403);
  const arrayCity = await call('GET', '/api/admin/routes?cityKey=paris&cityKey=lyon', playerHeaders);
  assert.equal(arrayCity.status, 403);
});
