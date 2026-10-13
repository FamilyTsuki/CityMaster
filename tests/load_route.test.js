import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from '../src/Router.js';

test('load screen template exists and contains valid structure', () => {
  const loadHtmlPath = path.resolve('public/screens/load.html');
  assert.ok(fs.existsSync(loadHtmlPath), 'public/screens/load.html must exist');

  const content = fs.readFileSync(loadHtmlPath, 'utf8');
  assert.ok(content.includes('id="load-screen"'), 'load.html must contain #load-screen');
  assert.ok(content.includes('loader-container'), 'load.html must contain .loader-container');
  assert.ok(content.includes('loader-spinner'), 'load.html must contain .loader-spinner');
  assert.ok(content.includes('load-page-message'), 'load.html must contain #load-page-message');
});

test('Router matches /load and /load/ routes correctly', async () => {
  let loadRouteCalled = 0;
  let defaultRouteCalled = 0;

  const router = new Router({
    '/': () => {
      defaultRouteCalled += 1;
    },
    '/load': () => {
      loadRouteCalled += 1;
    },
  });

  await router.navigate('/load');
  assert.equal(loadRouteCalled, 1, '/load route should trigger the handler');

  await router.navigate('/load/');
  assert.equal(loadRouteCalled, 2, '/load/ route should also trigger the /load handler');
});

test('No visible navigation link or menu item points to /load in templates', () => {
  const htmlFiles = [
    path.resolve('public/index.html'),
    ...fs.readdirSync(path.resolve('public/screens'))
      .filter((f) => f !== 'load.html')
      .map((f) => path.resolve('public/screens', f)),
  ];

  for (const file of htmlFiles) {
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(
      !content.includes('href="/load"') && !content.includes('href="#/load"'),
      `${path.basename(file)} should not contain a link to /load`,
    );
  }
});

