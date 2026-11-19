import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/backend/app.js';
import { User, getUserRole } from '../src/backend/models/User.js';
import { UserZone } from '../src/backend/models/UserZone.js';
import { Report } from '../src/backend/models/Report.js';
import { StaffService } from '../src/backend/services/StaffService.js';
import { MODERATOR_APPLICATIONS_FILE, USERS_FILE } from '../src/backend/config/paths.js';

const server = createApp().listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const admin = await User.create('roles_admin', 'hash');
await User.setAdminStatus('roles_admin', true);

const headersFor = (user) => ({
  Authorization: `Bearer ${jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET)}`,
  'Content-Type': 'application/json',
});
const adminHeaders = headersFor(admin);

const call = (method, path, headers, body) =>
  fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });

const profileOf = async (user) => (await call('GET', '/api/profile', headersFor(user))).json();

test('un compte de users.json sans champ role garde ses droits administrateur', async () => {
  const users = JSON.parse(await fs.readFile(USERS_FILE, 'utf8'));
  users.push({ id: 900, username: 'ancien_admin', password: 'x', is_admin: true });
  users.push({ id: 901, username: 'ancien_joueur', password: 'x', is_admin: false });
  await fs.writeFile(USERS_FILE, JSON.stringify(users));

  assert.equal((await User.findByUsername('ancien_admin')).role, 'admin');
  assert.equal((await User.findByUsername('ancien_joueur')).role, 'player');
  assert.equal(getUserRole({ username: 'x', role: 'inconnu' }), 'player');

  const profile = await profileOf({ id: 900, username: 'ancien_admin' });
  assert.equal(profile.role, 'admin');
  assert.equal(profile.isAdmin, true);
});

test('une candidature acceptée fait un modérateur, le retrait de sa dernière commune le rend joueur', async () => {
  const player = await User.create('roles_candidate', 'hash');
  const headers = headersFor(player);
  const { application } = await (
    await call('POST', '/api/moderation/applications', headers, { cityKey: 'paris' })
  ).json();
  await call('PATCH', `/api/moderation/applications/${application.id}`, adminHeaders, { status: 'approved' });

  let profile = await profileOf(player);
  assert.equal(profile.role, 'moderator');
  assert.deepEqual(profile.moderatorCities, [{ key: 'paris', name: 'Paris' }]);

  const removed = await call('DELETE', '/api/moderation/staff/roles_candidate/cities/paris', adminHeaders);
  assert.equal(removed.status, 200);
  profile = await profileOf(player);
  assert.equal(profile.role, 'player');
  assert.deepEqual(profile.moderatorCities, []);

  const mine = await (await call('GET', '/api/moderation/applications/mine', headers)).json();
  assert.equal(mine.applications.find((a) => a.id === application.id).status, 'revoked');
  assert.equal((await call('GET', '/api/admin/routes?cityKey=paris', headers)).status, 403);
});

test("seul un administrateur gère l'équipe", async () => {
  const player = await User.create('roles_intruder', 'hash');
  const headers = headersFor(player);
  assert.equal((await call('GET', '/api/moderation/staff', headers)).status, 403);
  assert.equal((await call('PATCH', '/api/moderation/staff/roles_intruder/role', headers, { role: 'admin' })).status, 403);
  assert.equal((await call('POST', '/api/moderation/staff/roles_intruder/cities', headers, { cityKey: 'lyon' })).status, 403);

  assert.equal((await call('PATCH', '/api/moderation/staff/roles_intruder/role', adminHeaders, { role: 'chef' })).status, 400);
  assert.equal((await call('PATCH', '/api/moderation/staff/inconnu/role', adminHeaders, { role: 'moderator' })).status, 404);
  assert.equal((await call('POST', '/api/moderation/staff/roles_intruder/cities', adminHeaders, { cityKey: 'atlantide' })).status, 404);
  assert.equal((await call('PATCH', '/api/moderation/staff/roles_admin/role', adminHeaders, { role: 'player' })).status, 400);
});

test('un super-modérateur valide les communes de sa zone, pas les autres', async () => {
  const superMod = await User.create('roles_super', 'hash');
  const moderator = await User.create('roles_mod', 'hash');
  await call('PATCH', '/api/moderation/staff/roles_super/role', adminHeaders, { role: 'super_moderator' });
  const granted = await call('POST', '/api/moderation/staff/roles_super/cities', adminHeaders, { cityKey: 'lyon' });
  assert.equal(granted.status, 200);
  assert.deepEqual((await granted.json()).user, {
    id: superMod.id,
    username: 'roles_super',
    role: 'super_moderator',
    cities: [{ key: 'lyon', name: 'Lyon' }],
  });
  await call('POST', '/api/moderation/staff/roles_mod/cities', adminHeaders, { cityKey: 'lyon' });

  assert.equal((await call('PATCH', '/api/cities/lyon/verify', headersFor(superMod))).status, 200);
  assert.equal((await call('PATCH', '/api/cities/paris/verify', headersFor(superMod))).status, 403);
  assert.equal((await call('PATCH', '/api/cities/lyon/verify', headersFor(moderator))).status, 403);
  assert.equal((await call('GET', '/api/admin/routes?cityKey=lyon', headersFor(superMod))).status, 200);
  assert.equal((await call('GET', '/api/admin/settings', headersFor(superMod))).status, 403);

  const staff = await (await call('GET', '/api/moderation/staff', adminHeaders)).json();
  assert.deepEqual(
    staff.filter((m) => m.username.startsWith('roles_')).map((m) => [m.username, m.role, m.cities.map((c) => c.key)]),
    [
      ['roles_admin', 'admin', []],
      ['roles_mod', 'moderator', ['lyon']],
      ['roles_super', 'super_moderator', ['lyon']],
    ],
  );
});

test('un super-modérateur sans commune garde son rôle ; le rôle joueur vide la zone', async () => {
  await User.create('roles_keep', 'hash');
  await call('PATCH', '/api/moderation/staff/roles_keep/role', adminHeaders, { role: 'super_moderator' });
  await call('POST', '/api/moderation/staff/roles_keep/cities', adminHeaders, { cityKey: 'bordeaux' });
  await call('DELETE', '/api/moderation/staff/roles_keep/cities/bordeaux', adminHeaders);
  assert.equal((await User.findByUsername('roles_keep')).role, 'super_moderator');

  await call('POST', '/api/moderation/staff/roles_keep/cities', adminHeaders, { cityKey: 'bordeaux' });
  await call('PATCH', '/api/moderation/staff/roles_keep/role', adminHeaders, { role: 'player' });
  assert.deepEqual(await UserZone.getCities('roles_keep'), []);
});

test('les signalements sont filtrés par commune pour les modérateurs', async () => {
  const moderator = await User.create('roles_reports', 'hash');
  await call('POST', '/api/moderation/staff/roles_reports/cities', adminHeaders, { cityKey: 'orleans' });
  const headers = headersFor(moderator);

  const inZone = await Report.create({ cityKey: 'orleans', category: 'rue', description: 'a' });
  const outZone = await Report.create({ cityKey: 'paris', category: 'rue', description: 'b' });
  const noCity = await Report.create({ category: 'autre', description: 'c' });

  const visible = await (await call('GET', '/api/reports', headers)).json();
  assert.deepEqual(visible.map((r) => r.id), [inZone.id]);

  const all = await (await call('GET', '/api/reports', adminHeaders)).json();
  assert.ok([inZone.id, outZone.id, noCity.id].every((id) => all.some((r) => r.id === id)));

  assert.equal((await call('PATCH', `/api/reports/${inZone.id}/status`, headers, { status: 'resolved' })).status, 200);
  assert.equal((await call('PATCH', `/api/reports/${outZone.id}/status`, headers, { status: 'resolved' })).status, 404);
  assert.equal((await call('PATCH', `/api/reports/${noCity.id}/status`, headers, { status: 'resolved' })).status, 404);
  assert.equal((await call('DELETE', `/api/reports/${inZone.id}`, headers)).status, 403);

  const player = await User.create('roles_reports_player', 'hash');
  assert.equal((await call('GET', '/api/reports', headersFor(player))).status, 403);
});

test("l'import des candidatures acceptées est rejoué sans redonner une commune retirée", async () => {
  await User.create('roles_legacy', 'hash');
  const applications = JSON.parse(await fs.readFile(MODERATOR_APPLICATIONS_FILE, 'utf8'));
  applications.push({
    id: 9000,
    username: 'roles_legacy',
    city_key: 'bordeaux',
    city_name: 'Bordeaux',
    motivation: null,
    status: 'approved',
    reviewed_by: 'roles_admin',
    reviewed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
  await fs.writeFile(MODERATOR_APPLICATIONS_FILE, JSON.stringify(applications));

  await StaffService.importApprovedApplications();
  assert.equal((await User.findByUsername('roles_legacy')).role, 'moderator');
  assert.deepEqual(await UserZone.getCities('roles_legacy'), [{ key: 'bordeaux', name: 'Bordeaux' }]);

  await StaffService.importApprovedApplications();
  assert.equal((await UserZone.getCities('roles_legacy')).length, 1);

  await StaffService.revokeCity('roles_legacy', 'bordeaux', 'roles_admin');
  await StaffService.importApprovedApplications();
  assert.deepEqual(await UserZone.getCities('roles_legacy'), []);
  assert.equal((await User.findByUsername('roles_legacy')).role, 'player');
});

test("le retrait des droits d'administrateur ne touche pas un modérateur", async () => {
  await User.create('roles_safe', 'hash');
  await User.setRole('roles_safe', 'moderator');
  await User.setAdminStatus('roles_safe', false);
  assert.equal((await User.findByUsername('roles_safe')).role, 'moderator');
  await User.setAdminStatus('roles_safe', true);
  assert.equal((await User.findByUsername('roles_safe')).is_admin, true);
  await User.setAdminStatus('roles_safe', false);
  const after = await User.findByUsername('roles_safe');
  assert.equal(after.role, 'player');
  assert.equal(after.is_admin, false);
});

test("le rôle choisi à l'accord fait un super-modérateur, sans rétrograder un administrateur", async () => {
  const player = await User.create('roles_promoted', 'hash');
  const { application } = await (
    await call('POST', '/api/moderation/applications', headersFor(player), { cityKey: 'lyon' })
  ).json();
  await call('PATCH', `/api/moderation/applications/${application.id}`, adminHeaders, {
    status: 'approved',
    role: 'super_moderator',
  });
  assert.equal((await User.findByUsername('roles_promoted')).role, 'super_moderator');

  const otherAdmin = await User.create('roles_other_admin', 'hash');
  await User.setAdminStatus('roles_other_admin', true);
  const created = await (
    await call('POST', '/api/moderation/applications', headersFor(otherAdmin), { cityKey: 'lyon' })
  ).json();
  await call('PATCH', `/api/moderation/applications/${created.application.id}`, adminHeaders, {
    status: 'approved',
    role: 'super_moderator',
  });
  assert.equal((await User.findByUsername('roles_other_admin')).role, 'admin');
});
