import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs/promises';
import path from 'path';
import { readJsonFile, updateJsonFile } from '../src/backend/utils/jsonStore.js';

const file = (name) => path.join(process.env.CITYMASTER_DATA_DIR, name);

test('updateJsonFile: des mises à jour simultanées ne se perdent pas', async () => {
  const target = file('counter.json');
  await Promise.all(
    Array.from({ length: 50 }, () =>
      updateJsonFile(target, { count: 0 }, (data) => {
        data.count += 1;
      }),
    ),
  );
  assert.deepEqual(await readJsonFile(target, null), { count: 50 });
});

test("updateJsonFile: un fichier corrompu n'est jamais écrasé par des données vides", async () => {
  const target = file('corrupted.json');
  await fs.writeFile(target, '{"bordeaux": [', 'utf8');

  await assert.rejects(
    updateJsonFile(target, {}, (data) => {
      data.bordeaux = [];
    }),
    /Invalid JSON/,
  );
  assert.equal(await fs.readFile(target, 'utf8'), '{"bordeaux": [');

  // La file d'attente du fichier continue de fonctionner après une erreur.
  await fs.writeFile(target, '{}', 'utf8');
  await updateJsonFile(target, {}, (data) => {
    data.ok = true;
  });
  assert.deepEqual(await readJsonFile(target, null), { ok: true });
});

test('readJsonFile: renvoie une copie de la valeur par défaut si le fichier est absent', async () => {
  const fallback = { items: [] };
  const value = await readJsonFile(file('missing.json'), fallback);
  value.items.push(1);
  assert.deepEqual(fallback, { items: [] });
});

test("updateJsonFile: aucun fichier temporaire ne reste après l'écriture", async () => {
  await updateJsonFile(file('clean.json'), {}, (data) => {
    data.a = 1;
  });
  const leftovers = (await fs.readdir(process.env.CITYMASTER_DATA_DIR)).filter((n) => n.endsWith('.tmp'));
  assert.deepEqual(leftovers, []);
});
