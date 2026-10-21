import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from '../src/Router.js';
import { ChangelogView } from '../src/views/ChangelogView.js';

test('changelog screen template exists and contains valid structure', () => {
  const changelogHtmlPath = path.resolve('public/screens/changelog.html');
  assert.ok(fs.existsSync(changelogHtmlPath), 'public/screens/changelog.html must exist');

  const content = fs.readFileSync(changelogHtmlPath, 'utf8');
  assert.ok(
    content.includes('id="changelog-screen"'),
    'changelog.html must contain #changelog-screen',
  );
  assert.ok(
    content.includes('id="changelog-container"'),
    'changelog.html must contain #changelog-container',
  );
  assert.ok(
    content.includes('class="btn-back-round"'),
    'changelog.html must contain .btn-back-round',
  );
  assert.ok(
    content.includes('id="changelog-back-btn"'),
    'changelog.html must contain #changelog-back-btn',
  );
});

test('Router matches /changelog and /changelog/ routes correctly', async () => {
  let changelogRouteHandled = false;
  let homeRouteHandled = false;

  const routes = {
    '/': () => {
      homeRouteHandled = true;
    },
    '/changelog': () => {
      changelogRouteHandled = true;
    },
  };

  const router = new Router(routes);

  await router.navigate('/changelog');
  assert.strictEqual(
    changelogRouteHandled,
    true,
    'Router must match and execute /changelog route',
  );

  changelogRouteHandled = false;
  await router.navigate('/changelog/');
  assert.strictEqual(
    changelogRouteHandled,
    true,
    'Router must match and normalize trailing slash /changelog/ route',
  );
  assert.strictEqual(homeRouteHandled, false, 'la route / ne doit pas être appelée');
});

test('ChangelogView can be initialized in node environment with fallback', () => {
  const view = new ChangelogView();
  assert.ok(view !== null, 'ChangelogView instance must be created successfully');
  assert.strictEqual(
    typeof view.loadAndRender,
    'function',
    'ChangelogView must provide loadAndRender function',
  );
});

