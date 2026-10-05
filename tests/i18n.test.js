import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

function getNestedKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      keys = keys.concat(getNestedKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function resolveKey(dict, keyPath) {
  const parts = keyPath.split('.');
  let cur = dict;
  for (const p of parts) {
    if (!cur || typeof cur !== 'object' || !(p in cur)) return null;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : null;
}

test('i18n dictionaries: parity between fr.json and en.json', () => {
  const frContent = fs.readFileSync(path.resolve('public/assets/i18n/fr.json'), 'utf8');
  const enContent = fs.readFileSync(path.resolve('public/assets/i18n/en.json'), 'utf8');

  const frDict = JSON.parse(frContent);
  const enDict = JSON.parse(enContent);

  const frKeys = new Set(getNestedKeys(frDict));
  const enKeys = new Set(getNestedKeys(enDict));

  const missingInEn = [...frKeys].filter(k => !enKeys.has(k));
  const missingInFr = [...enKeys].filter(k => !frKeys.has(k));

  assert.deepStrictEqual(missingInEn, [], `Missing keys in en.json: ${missingInEn.join(', ')}`);
  assert.deepStrictEqual(missingInFr, [], `Missing keys in fr.json: ${missingInFr.join(', ')}`);
});

test('i18n templates: all template data-i18n* attributes exist in dictionaries', () => {
  const frDict = JSON.parse(fs.readFileSync(path.resolve('public/assets/i18n/fr.json'), 'utf8'));
  const enDict = JSON.parse(fs.readFileSync(path.resolve('public/assets/i18n/en.json'), 'utf8'));

  const htmlFiles = [
    path.resolve('public/index.html'),
    ...fs.readdirSync(path.resolve('public/screens')).map(f => path.resolve('public/screens', f))
  ];

  const attrRegex = /data-i18n(?:-aria|-aria-label|-title|-placeholder|-alt)?=["']([^"']+)["']/g;

  const missingInFr = [];
  const missingInEn = [];

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = attrRegex.exec(content)) !== null) {
      const key = match[1];
      if (!resolveKey(frDict, key)) {
        missingInFr.push(`${path.basename(file)}: ${key}`);
      }
      if (!resolveKey(enDict, key)) {
        missingInEn.push(`${path.basename(file)}: ${key}`);
      }
    }
  }

  assert.deepStrictEqual(missingInFr, [], `Template keys missing in fr.json:\n${missingInFr.join('\n')}`);
  assert.deepStrictEqual(missingInEn, [], `Template keys missing in en.json:\n${missingInEn.join('\n')}`);
});

test('i18n code: all t() key paths in src/*.js exist in dictionaries', () => {
  const frDict = JSON.parse(fs.readFileSync(path.resolve('public/assets/i18n/fr.json'), 'utf8'));
  const enDict = JSON.parse(fs.readFileSync(path.resolve('public/assets/i18n/en.json'), 'utf8'));

  function getJsFiles(dir) {
    let files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'backend') {
          files = files.concat(getJsFiles(full));
        }
      } else if (entry.name.endsWith('.js')) {
        files.push(full);
      }
    }
    return files;
  }

  const jsFiles = getJsFiles(path.resolve('src'));
  const tCallRegex = /\.t\(["']([a-zA-Z0-9_.]+)["']/g;

  const missingInFr = [];
  const missingInEn = [];

  for (const file of jsFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = tCallRegex.exec(content)) !== null) {
      const key = match[1];
      if (!resolveKey(frDict, key)) {
        missingInFr.push(`${path.relative('src', file)}: ${key}`);
      }
      if (!resolveKey(enDict, key)) {
        missingInEn.push(`${path.relative('src', file)}: ${key}`);
      }
    }
  }

  assert.deepStrictEqual(missingInFr, [], `Code t() keys missing in fr.json:\n${missingInFr.join('\n')}`);
  assert.deepStrictEqual(missingInEn, [], `Code t() keys missing in en.json:\n${missingInEn.join('\n')}`);
});
