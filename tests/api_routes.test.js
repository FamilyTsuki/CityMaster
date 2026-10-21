import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/backend/app.js';

const server = createApp().listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
test.after(() => server.close());

const token = jwt.sign({ id: 1, username: 'api_user', is_admin: false }, process.env.JWT_SECRET);
const auth = { Authorization: `Bearer ${token}` };

test("POST /api/scores n'existe pas : le client ne peut pas envoyer de score", async () => {
  const res = await fetch(`${baseUrl}/api/scores`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ score: 999999 }),
  });
  assert.equal(res.status, 404);
});

test('les salons répondent 503 sans PostgreSQL', async () => {
  const res = await fetch(`${baseUrl}/api/rooms/ABC123`, { headers: auth });
  assert.equal(res.status, 503);
});

test('le jeton en paramètre d’URL n’est accepté que pour le flux SSE', async () => {
  const profile = await fetch(`${baseUrl}/api/profile?token=${token}`);
  assert.equal(profile.status, 401);

  // Accepté (puis refusé plus loin car il n'y a pas de base de données).
  const stream = await fetch(`${baseUrl}/api/rooms/ABC123/stream?token=${token}`);
  assert.equal(stream.status, 503);
});

test('les routes admin refusent un compte non administrateur', async () => {
  const res = await fetch(`${baseUrl}/api/admin/settings`, { headers: auth });
  assert.equal(res.status, 403);
});

test('le code serveur et les fichiers sensibles ne sont pas servis', async () => {
  const backend = await fetch(`${baseUrl}/src/backend/config/database.js`);
  assert.equal(backend.status, 403);

  const front = await fetch(`${baseUrl}/src/app.js`);
  assert.equal(front.status, 200);
  assert.equal(front.headers.get('cache-control'), 'no-cache');
});

test('GET /api/version renvoie la version de package.json', async () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const res = await fetch(`${baseUrl}/api/version`);
  assert.deepEqual(await res.json(), { version: pkg.version });
});

test('signalement : validation des champs et route inconnue', async () => {
  const empty = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 42, description: '   ' }),
  });
  assert.equal(empty.status, 400);

  const created = await fetch(`${baseUrl}/api/reports`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ category: 'wrong_street', description: 'x'.repeat(5000), username: 'spoof' }),
  });
  assert.equal(created.status, 201);
  const { report } = await created.json();
  assert.equal(report.username, 'api_user', 'le pseudo vient du jeton, pas du corps de la requête');
  assert.equal(report.description.length, 2000);

  const unknown = await fetch(`${baseUrl}/api/nope`);
  assert.equal(unknown.status, 404);
});
