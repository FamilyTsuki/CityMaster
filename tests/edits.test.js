import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/backend/app.js';
import { User } from '../src/backend/models/User.js';
import { Report } from '../src/backend/models/Report.js';
import { CityCustomization } from '../src/backend/models/CityCustomization.js';
import { StaffService } from '../src/backend/services/StaffService.js';

const server = createApp().listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const PARIS = { key: 'paris', name: 'Paris' };
const admin = await User.create('edits_admin', 'hash');
await User.setAdminStatus('edits_admin', true);
const superMod = await User.create('edits_super', 'hash');
await StaffService.setRole('edits_super', 'super_moderator', 'edits_admin');
await StaffService.grantCity('edits_super', PARIS, 'edits_admin');
const moderator = await User.create('edits_mod', 'hash');
await StaffService.grantCity('edits_mod', PARIS, 'edits_admin');
const otherMod = await User.create('edits_other', 'hash');
await StaffService.grantCity('edits_other', PARIS, 'edits_admin');
const lyonSuper = await User.create('edits_lyon', 'hash');
await StaffService.setRole('edits_lyon', 'super_moderator', 'edits_admin');
await StaffService.grantCity('edits_lyon', { key: 'lyon', name: 'Lyon' }, 'edits_admin');

const headersFor = (user) => ({
  Authorization: `Bearer ${jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET)}`,
  'Content-Type': 'application/json',
});
const as = {
  admin: headersFor(admin),
  super: headersFor(superMod),
  mod: headersFor(moderator),
  other: headersFor(otherMod),
  lyon: headersFor(lyonSuper),
};

const call = async (method, path, headers, body) => {
  const res = await fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, body: await res.json() };
};

const route = (id, name) => ({ id, name, coordinates: [[2.35, 48.85], [2.36, 48.86]] });
const storedRoute = async (id) =>
  (await CityCustomization.getRoutes('paris')).find((r) => r.properties.id === id) || null;

test("la modification d'un modérateur devient une proposition, sans toucher la carte", async () => {
  const res = await call('POST', '/api/admin/routes', as.mod, { cityKey: 'paris', route: route('r_prop', 'Rue Proposée') });
  assert.equal(res.status, 202);
  assert.equal(res.body.proposal.status, 'pending');
  assert.equal(res.body.proposal.author, 'edits_mod');
  assert.deepEqual(res.body.proposal.before_state, { feature: null });
  assert.equal(await storedRoute('r_prop'), null);

  const mine = await call('GET', '/api/edits/proposals', as.mod);
  assert.ok(mine.body.some((p) => p.id === res.body.proposal.id));
  const other = await call('GET', '/api/edits/proposals', as.other);
  assert.ok(!other.body.some((p) => p.id === res.body.proposal.id));
  const reviewer = await call('GET', '/api/edits/proposals?status=pending', as.super);
  assert.ok(reviewer.body.some((p) => p.id === res.body.proposal.id));

  assert.equal((await call('POST', `/api/edits/proposals/${res.body.proposal.id}/accept`, as.mod)).status, 403);
  assert.equal((await call('POST', `/api/edits/proposals/${res.body.proposal.id}/accept`, as.lyon)).status, 404);
});

test("l'acceptation applique la proposition et l'inscrit dans l'historique", async () => {
  const { body } = await call('POST', '/api/admin/routes', as.mod, { cityKey: 'paris', route: route('r_ok', 'Rue Acceptée') });
  const preview = await call('GET', `/api/edits/proposals/${body.proposal.id}`, as.super);
  assert.equal(preview.status, 200);
  assert.equal(preview.body.changed, false);
  assert.equal(preview.body.payload.feature.properties.name, 'Rue Acceptée');

  const accepted = await call('POST', `/api/edits/proposals/${body.proposal.id}/accept`, as.super);
  assert.equal(accepted.status, 200);
  assert.equal(accepted.body.proposal.status, 'accepted');
  assert.equal(accepted.body.history.author, 'edits_mod');
  assert.equal(accepted.body.history.validator, 'edits_super');
  assert.equal((await storedRoute('r_ok')).properties.name, 'Rue Acceptée');

  const again = await call('POST', `/api/edits/proposals/${body.proposal.id}/accept`, as.super);
  assert.equal(again.status, 409);
  assert.equal(again.body.code, 'NOT_PENDING');
});

test('un refus exige un motif, visible par l’auteur', async () => {
  const { body } = await call('POST', '/api/admin/routes/difficulty', as.mod, {
    cityKey: 'paris',
    streetName: 'Rue Refusée',
    difficulty: 'easy',
  });
  const id = body.proposal.id;
  assert.equal((await call('POST', `/api/edits/proposals/${id}/reject`, as.super, { reason: '  ' })).status, 400);
  const rejected = await call('POST', `/api/edits/proposals/${id}/reject`, as.super, { reason: 'Rue trop longue' });
  assert.equal(rejected.status, 200);

  const mine = await call('GET', '/api/edits/proposals?status=rejected', as.mod);
  const mineRejected = mine.body.find((p) => p.id === id);
  assert.equal(mineRejected.reject_reason, 'Rue trop longue');
  assert.equal(mineRejected.reviewer, 'edits_super');
  assert.equal((await CityCustomization.getDifficultyOverrides('paris'))['rue refusée'], undefined);
});

test("l'acceptation est refusée si l'élément a changé depuis la proposition", async () => {
  const { body } = await call('POST', '/api/admin/routes/difficulty', as.mod, {
    cityKey: 'paris',
    streetName: 'Rue Disputée',
    difficulty: 'easy',
  });
  const direct = await call('POST', '/api/admin/routes/difficulty', as.super, {
    cityKey: 'paris',
    streetName: 'Rue Disputée',
    difficulty: 'hard',
  });
  assert.equal(direct.status, 200);
  assert.ok(direct.body.historyId);

  const preview = await call('GET', `/api/edits/proposals/${body.proposal.id}`, as.super);
  assert.equal(preview.body.changed, true);

  const accept = await call('POST', `/api/edits/proposals/${body.proposal.id}/accept`, as.super);
  assert.equal(accept.status, 409);
  assert.equal(accept.body.code, 'CONFLICT');
  assert.deepEqual(accept.body.current_state, { difficulty: 'hard' });
  const still = await call('GET', `/api/edits/proposals/${body.proposal.id}`, as.super);
  assert.equal(still.body.status, 'pending');
});

test("l'annulation remet l'état d'avant et prévient d'une modification plus récente", async () => {
  const first = await call('POST', '/api/admin/routes', as.admin, { cityKey: 'paris', route: route('r_undo', 'Rue V1') });
  const second = await call('POST', '/api/admin/routes', as.super, { cityKey: 'paris', route: route('r_undo', 'Rue V2') });
  assert.equal((await storedRoute('r_undo')).properties.name, 'Rue V2');

  const blocked = await call('POST', `/api/edits/history/${first.body.historyId}/undo`, as.admin, {});
  assert.equal(blocked.status, 409);
  assert.equal(blocked.body.code, 'CONFLICT');
  assert.deepEqual(blocked.body.later.map((e) => e.id), [second.body.historyId]);

  const undoSecond = await call('POST', `/api/edits/history/${second.body.historyId}/undo`, as.admin, {});
  assert.equal(undoSecond.status, 200);
  assert.equal((await storedRoute('r_undo')).properties.name, 'Rue V1');

  const undoFirst = await call('POST', `/api/edits/history/${first.body.historyId}/undo`, as.admin, {});
  assert.equal(undoFirst.status, 200);
  assert.equal(await storedRoute('r_undo'), null);

  const twice = await call('POST', `/api/edits/history/${first.body.historyId}/undo`, as.admin, {});
  assert.equal(twice.body.code, 'ALREADY_UNDONE');
});

test("l'annulation forcée passe outre le conflit, et une suppression annulée rend l'élément", async () => {
  const created = await call('POST', '/api/admin/districts', as.admin, {
    cityKey: 'paris',
    district: { id: 'd_undo', name: 'Lotissement', coordinates: [[2.3, 48.8], [2.31, 48.8], [2.31, 48.81], [2.3, 48.8]] },
  });
  const deleted = await call('DELETE', '/api/admin/districts/paris/d_undo', as.admin);
  assert.ok(deleted.body.historyId);
  let district = (await CityCustomization.getDistricts('paris')).find((d) => d.properties.id === 'd_undo');
  assert.equal(district.properties.isDeleted, true);

  const restored = await call('POST', `/api/edits/history/${deleted.body.historyId}/undo`, as.admin, {});
  assert.equal(restored.status, 200);
  district = (await CityCustomization.getDistricts('paris')).find((d) => d.properties.id === 'd_undo');
  assert.equal(district.properties.isDeleted, undefined);
  assert.equal(district.properties.name, 'Lotissement');

  await call('POST', '/api/admin/districts', as.admin, {
    cityKey: 'paris',
    district: { id: 'd_undo', name: 'Lotissement renommé', coordinates: [[2.3, 48.8], [2.31, 48.8], [2.31, 48.81], [2.3, 48.8]] },
  });
  const blocked = await call('POST', `/api/edits/history/${created.body.historyId}/undo`, as.admin, {});
  assert.equal(blocked.status, 409);
  const forced = await call('POST', `/api/edits/history/${created.body.historyId}/undo`, as.admin, { force: true });
  assert.equal(forced.status, 200);
  assert.equal((await CityCustomization.getDistricts('paris')).find((d) => d.properties.id === 'd_undo'), undefined);
});

test("une proposition liée à un signalement le marque traité à l'acceptation", async () => {
  const report = await Report.create({ cityKey: 'paris', category: 'rue', description: 'mauvaise difficulté' });
  const lyonReport = await Report.create({ cityKey: 'lyon', category: 'rue', description: 'autre ville' });
  const { body } = await call('POST', '/api/admin/routes/difficulty', as.mod, {
    cityKey: 'paris',
    streetName: 'Rue Signalée',
    difficulty: 'medium',
    reportId: report.id,
  });
  assert.equal(body.proposal.report_id, report.id);
  const ignored = await call('POST', '/api/admin/routes/difficulty', as.mod, {
    cityKey: 'paris',
    streetName: 'Rue Signalée 2',
    difficulty: 'medium',
    reportId: lyonReport.id,
  });
  assert.equal(ignored.body.proposal.report_id, null);

  await call('POST', `/api/edits/proposals/${body.proposal.id}/accept`, as.super);
  assert.equal((await Report.findById(report.id)).status, 'resolved');
});

test("l'historique est réservé à l'administrateur et filtrable", async () => {
  assert.equal((await call('GET', '/api/edits/history', as.super)).status, 403);
  const byAuthor = await call('GET', '/api/edits/history?author=edits_mod', as.admin);
  assert.ok(byAuthor.body.length > 0);
  assert.ok(byAuthor.body.every((e) => e.author === 'edits_mod'));
  const lyon = await call('GET', '/api/edits/history?cityKey=lyon', as.admin);
  assert.deepEqual(lyon.body, []);
});
