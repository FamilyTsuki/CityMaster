import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from '../src/Router.js';

test('support screen template exists and contains valid accessible structure with 2 ways to contribute', () => {
  const supportHtmlPath = path.resolve('public/screens/support.html');
  assert.ok(fs.existsSync(supportHtmlPath), 'public/screens/support.html must exist');

  const content = fs.readFileSync(supportHtmlPath, 'utf8');
  assert.ok(
    content.includes('id="support-screen"'),
    'support.html must contain #support-screen',
  );
  assert.ok(
    content.includes('class="btn-back-round"'),
    'support.html must contain .btn-back-round',
  );
  assert.ok(
    content.includes('id="support-back-btn"'),
    'support.html must contain #support-back-btn',
  );
  assert.ok(
    content.includes('data:image/gif;base64,'),
    'support.html must include inline base64 gif animation for instant loading',
  );
  assert.ok(
    content.includes('id="kofi-donate-btn"'),
    'support.html must contain #kofi-donate-btn',
  );
  assert.ok(
    content.includes('kofi-cat.png'),
    'support.html must include kofi-cat.png for light theme',
  );
  assert.ok(
    content.includes('kofi-cat2.png'),
    'support.html must include kofi-cat2.png for dark theme',
  );
  assert.ok(
    fs.existsSync(path.resolve('public/assets/images/kofi-cat.png')),
    'kofi-cat.png must exist',
  );
  assert.ok(
    fs.existsSync(path.resolve('public/assets/images/kofi-cat2.png')),
    'kofi-cat2.png must exist',
  );
  assert.ok(
    content.includes('https://ko-fi.com/tsuki_dev'),
    'support.html must link to https://ko-fi.com/tsuki_dev',
  );
  assert.ok(
    content.includes('rel="noopener noreferrer"'),
    'Ko-fi external link must contain rel="noopener noreferrer"',
  );
  assert.ok(
    content.includes('target="_blank"'),
    'Ko-fi external link must open in a new tab',
  );
  assert.ok(
    content.includes('id="moderator-apply-btn"'),
    'support.html must contain #moderator-apply-btn for routes moderation',
  );
  assert.ok(
    content.includes('href="#/moderation"') || content.includes('href="/moderation"'),
    'moderator button must link to moderation screen',
  );
  assert.ok(
    !content.includes('support-card'),
    'support.html must not contain unnecessary outer support-card',
  );
  assert.ok(
    !content.includes('setup-section'),
    'support.html must not contain setup-section',
  );
  assert.ok(
    !content.includes('goals-section'),
    'support.html must not contain goals-section',
  );
  assert.ok(
    !content.includes('support-nav-bar'),
    'support.html must not contain support-nav-bar',
  );
  assert.ok(
    !content.includes('support-footer-back-btn'),
    'support.html must not contain support-footer-back-btn',
  );
  assert.ok(
    !content.includes('moderator-admin-shortcut'),
    'support.html must not contain moderator-admin-shortcut',
  );
});

test('Router matches /support and /support/ routes correctly', async () => {
  let supportRouteHandled = false;
  let homeRouteHandled = false;

  const routes = {
    '/': () => {
      homeRouteHandled = true;
    },
    '/support': () => {
      supportRouteHandled = true;
    },
  };

  const router = new Router(routes);

  await router.navigate('/support');
  assert.strictEqual(
    supportRouteHandled,
    true,
    'Router must match and execute /support route',
  );

  supportRouteHandled = false;
  await router.navigate('/support/');
  assert.strictEqual(
    supportRouteHandled,
    true,
    'Router must match and normalize trailing slash /support/ route',
  );
});

test('footer templates contain accessible links to support screen', () => {
  const landingHtml = fs.readFileSync(path.resolve('public/screens/landing.html'), 'utf8');
  const setupHtml = fs.readFileSync(path.resolve('public/screens/setup.html'), 'utf8');
  const profileHtml = fs.readFileSync(path.resolve('public/screens/profile.html'), 'utf8');

  assert.ok(
    landingHtml.includes('support-footer-link'),
    'landing.html must include .support-footer-link',
  );
  assert.ok(
    setupHtml.includes('support-footer-link'),
    'setup.html must include .support-footer-link',
  );
  assert.ok(
    profileHtml.includes('support-footer-link'),
    'profile.html must include .support-footer-link',
  );
});

test('moderation screen template exists and contains coming soon structure', () => {
  const moderationHtmlPath = path.resolve('public/screens/moderation.html');
  assert.ok(fs.existsSync(moderationHtmlPath), 'public/screens/moderation.html must exist');

  const content = fs.readFileSync(moderationHtmlPath, 'utf8');
  assert.ok(
    content.includes('id="moderation-screen"'),
    'moderation.html must contain #moderation-screen',
  );
  assert.ok(
    content.includes('id="moderation-back-btn"'),
    'moderation.html must contain #moderation-back-btn',
  );
  assert.ok(
    content.includes('coming-soon-title'),
    'moderation.html must contain .coming-soon-title',
  );
});

test('Router matches /moderation and /moderation/ routes correctly', async () => {
  let moderationRouteHandled = false;

  const routes = {
    '/': () => {},
    '/moderation': () => {
      moderationRouteHandled = true;
    },
  };

  const router = new Router(routes);

  await router.navigate('/moderation');
  assert.strictEqual(
    moderationRouteHandled,
    true,
    'Router must match and execute /moderation route',
  );

  moderationRouteHandled = false;
  await router.navigate('/moderation/');
  assert.strictEqual(
    moderationRouteHandled,
    true,
    'Router must match and normalize trailing slash /moderation/ route',
  );
});
