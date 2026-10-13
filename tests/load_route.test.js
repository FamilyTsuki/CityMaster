import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from '../src/Router.js';
import { FlightLoader } from '../src/views/components/FlightLoader.js';

test('load screen template exists and contains valid structure with cartoon flight loader', () => {
  const loadHtmlPath = path.resolve('public/screens/load.html');
  assert.ok(fs.existsSync(loadHtmlPath), 'public/screens/load.html must exist');

  const content = fs.readFileSync(loadHtmlPath, 'utf8');
  assert.ok(content.includes('id="load-screen"'), 'load.html must contain #load-screen');
  assert.ok(content.includes('loader-container'), 'load.html must contain .loader-container for a11y');
  assert.ok(content.includes('loader-spinner'), 'load.html must contain .loader-spinner for a11y');
  assert.ok(content.includes('load-page-message'), 'load.html must contain #load-page-message for a11y');

  // Nouveaux composants visuels Cartoon : Barre, Avion, Monuments, Crash, Point d'interrogation
  assert.ok(content.includes('flight-loader-stage'), 'load.html must contain .flight-loader-stage');
  assert.ok(content.includes('id="flight-sky"'), 'load.html must contain #flight-sky');
  assert.ok(content.includes('id="airplane-carrier"'), 'load.html must contain #airplane-carrier');
  assert.ok(content.includes('id="flight-progress-bar"'), 'load.html must contain #flight-progress-bar');
  assert.ok(content.includes('id="monument-1"'), 'load.html must contain #monument-1');
  assert.ok(content.includes('id="monument-2"'), 'load.html must contain #monument-2');
  assert.ok(content.includes('id="monument-3"'), 'load.html must contain #monument-3');
  assert.ok(content.includes('id="crash-destination"'), 'load.html must contain #crash-destination');
  assert.ok(content.includes('id="mystery-question-mark"'), 'load.html must contain #mystery-question-mark');
  assert.ok(content.includes('question-mark-glyph'), 'load.html must contain .question-mark-glyph');
  assert.ok(content.includes('crash-burst'), 'load.html must contain .crash-burst');
  assert.ok(content.includes('crash-crater'), 'load.html must contain .crash-crater');
  assert.ok(content.includes('plane-propeller'), 'load.html must contain .plane-propeller');

  // Contrôles de test
  assert.ok(content.includes('id="btn-flight-replay"'), 'load.html must contain #btn-flight-replay');
  assert.ok(content.includes('id="btn-flight-pause"'), 'load.html must contain #btn-flight-pause');
  assert.ok(content.includes('id="btn-flight-crash"'), 'load.html must contain #btn-flight-crash');
  assert.ok(content.includes('id="flight-slider"'), 'load.html must contain #flight-slider');
  assert.ok(content.includes('id="btn-flight-theme"'), 'load.html must contain #btn-flight-theme');
});

test('FlightLoader updates milestones, turbulences and triggers crash properly', () => {
  function makeMockEl(id = '', classes = []) {
    const classList = new Set(classes);
    return {
      id,
      classList: {
        add: (...args) => args.forEach((c) => classList.add(c)),
        remove: (...args) => args.forEach((c) => classList.delete(c)),
        contains: (c) => classList.has(c),
      },
      style: {},
      textContent: '',
      value: '',
      addEventListener: () => {},
    };
  }

  const elements = {
    '#airplane-carrier': makeMockEl('airplane-carrier', ['airplane-carrier', 'flying']),
    '#flight-progress-bar': makeMockEl('flight-progress-bar'),
    '#flight-percentage': makeMockEl('flight-percentage'),
    '#flight-status-text': makeMockEl('flight-status-text'),
    '#flight-destination-label': makeMockEl('flight-destination-label'),
    '#flight-sky': makeMockEl('flight-sky'),
    '#monument-1': makeMockEl('monument-1'),
    '#monument-2': makeMockEl('monument-2'),
    '#monument-3': makeMockEl('monument-3'),
    '#crash-destination': makeMockEl('crash-destination'),
    '#flight-slider': makeMockEl('flight-slider'),
    '#btn-flight-replay': makeMockEl('btn-flight-replay'),
    '#btn-flight-pause': makeMockEl('btn-flight-pause'),
    '#btn-flight-pause-label': makeMockEl('btn-flight-pause-label'),
    '#btn-flight-crash': makeMockEl('btn-flight-crash'),
    '#btn-flight-theme': makeMockEl('btn-flight-theme'),
  };

  const mockContainer = {
    querySelector: (sel) => elements[sel] || null,
  };

  const loader = new FlightLoader(mockContainer);

  // 1. Initial State
  loader.setProgress(0);
  assert.equal(loader.progress, 0);
  assert.equal(elements['#flight-progress-bar'].style.width, '0%');
  assert.equal(elements['#airplane-carrier'].style.left, '5%');
  assert.equal(elements['#monument-1'].classList.contains('revealed'), false);

  // 2. Étape 1 : Tour Eiffel (>= 25%)
  loader.setProgress(30);
  assert.equal(loader.progress, 30);
  assert.equal(elements['#monument-1'].classList.contains('revealed'), true);
  assert.equal(elements['#monument-2'].classList.contains('revealed'), false);

  // 3. Étape 2 : Château (>= 55%)
  loader.setProgress(60);
  assert.equal(elements['#monument-1'].classList.contains('revealed'), true);
  assert.equal(elements['#monument-2'].classList.contains('revealed'), true);
  assert.equal(elements['#monument-3'].classList.contains('revealed'), false);

  // 4. Étape 3 : Mont-Saint-Michel (>= 78%)
  loader.setProgress(80);
  assert.equal(elements['#monument-3'].classList.contains('revealed'), true);
  assert.equal(elements['#airplane-carrier'].classList.contains('wobbling'), false);

  // 5. Turbulences (90 - 96%)
  loader.setProgress(92);
  assert.equal(elements['#airplane-carrier'].classList.contains('wobbling'), true);
  assert.equal(elements['#crash-destination'].classList.contains('crashed'), false);

  // 6. Crash (>= 97%)
  loader.setProgress(100);
  assert.equal(elements['#crash-destination'].classList.contains('crashed'), true);
  assert.equal(elements['#airplane-carrier'].classList.contains('crashed'), true);
  assert.equal(elements['#airplane-carrier'].style.top, '170px');

  loader.destroy();
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
