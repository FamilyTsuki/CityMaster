import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('navbar responsive theme toggle: structure and adaptive styles', () => {
  const indexHtml = fs.readFileSync(path.resolve('public/index.html'), 'utf8');
  const navbarCss = fs.readFileSync(path.resolve('public/assets/styles/navbar.css'), 'utf8');

  // Verify DOM elements in index.html
  assert.match(indexHtml, /id=["']theme-toggle["']/, 'index.html must contain header #theme-toggle');
  assert.match(indexHtml, /id=["']menu-theme-toggle["']/, 'index.html must contain menu #menu-theme-toggle');

  // Verify desktop hides menu-theme-btn
  assert.match(navbarCss, /\.menu-theme-btn\s*\{[^}]*display:\s*none\s*!important/s, 'desktop must hide menu-theme-btn by default');

  // Verify compact class moves theme button to burger menu
  assert.match(
    navbarCss,
    /\.navbar\.nav-compact\s+\.navbar-header-actions\s+#theme-toggle\s*\{[^}]*display:\s*none\s*!important/s,
    'nav-compact must hide header theme-toggle'
  );
  assert.match(
    navbarCss,
    /\.navbar\.nav-compact\s+\.navbar-actions\.open\s+\.menu-theme-btn\s*\{[^}]*display:\s*flex\s*!important/s,
    'nav-compact must show menu-theme-btn when burger is open'
  );

  // Verify media query for mobile screens (<= 540px)
  assert.match(
    navbarCss,
    /@media\s*\(\s*max-width:\s*540px\s*\)\s*\{[\s\S]*?\.navbar-header-actions\s+#theme-toggle\s*\{[^}]*display:\s*none\s*!important/s,
    'mobile @media <= 540px must hide header theme toggle'
  );
  assert.match(
    navbarCss,
    /@media\s*\(\s*max-width:\s*540px\s*\)\s*\{[\s\S]*?\.navbar-actions\.open\s+\.menu-theme-btn\s*\{[^}]*display:\s*flex\s*!important/s,
    'mobile @media <= 540px must display menu-theme-btn in open burger'
  );
});
