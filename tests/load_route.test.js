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
  assert.ok(
    content.includes('id="load-screen"'),
    'load.html must contain #load-screen',
  );
  assert.ok(
    content.includes('loader-container'),
    'load.html must contain .loader-container for a11y',
  );
  assert.ok(
    content.includes('loader-spinner'),
    'load.html must contain .loader-spinner for a11y',
  );
  assert.ok(
    content.includes('load-page-message'),
    'load.html must contain #load-page-message for a11y',
  );

  assert.ok(
    content.includes('flight-loader-stage'),
    'load.html must contain .flight-loader-stage',
  );
  assert.ok(
    content.includes('id="flight-sky"'),
    'load.html must contain #flight-sky',
  );
  assert.ok(
    content.includes('id="airplane-carrier"'),
    'load.html must contain #airplane-carrier',
  );
  assert.ok(
    content.includes('id="flight-progress-bar"'),
    'load.html must contain #flight-progress-bar',
  );
  assert.ok(
    content.includes('id="monument-1"'),
    'load.html must contain #monument-1',
  );
  assert.ok(
    content.includes('id="monument-2"'),
    'load.html must contain #monument-2',
  );
  assert.ok(
    content.includes('id="monument-3"'),
    'load.html must contain #monument-3',
  );
  assert.ok(
    content.includes('id="destination-cloud"'),
    'load.html must contain #destination-cloud',
  );
  assert.ok(
    content.includes('cloud-svg'),
    'load.html must contain .cloud-svg',
  );
  assert.ok(
    content.includes('id="mystery-question-mark"'),
    'load.html must contain #mystery-question-mark',
  );
  assert.ok(
    content.includes('question-mark-glyph'),
    'load.html must contain .question-mark-glyph',
  );
  assert.ok(
    content.includes('plane-propeller'),
    'load.html must contain .plane-propeller',
  );
  assert.ok(
    content.includes('peek-earth-container'),
    'load.html must contain .peek-earth-container',
  );
  assert.ok(
    content.includes('/assets/images/earth.png'),
    'load.html must reference /assets/images/earth.png',
  );
});

test('FlightLoader positions monuments along trajectory curve, rotates plane & monuments, and vanishes in cloud at 80%', () => {
  function makeMockEl(id = '', classes = []) {
    const classList = new Set(classes);
    const styles = {};
    return {
      id,
      classList: {
        add: (...args) => args.forEach((c) => classList.add(c)),
        remove: (...args) => args.forEach((c) => classList.delete(c)),
        contains: (c) => classList.has(c),
      },
      style: new Proxy(styles, {
        get: (target, prop) => {
          if (prop === 'setProperty') {
            return (k, v) => {
              target[k] = v;
            };
          }
          return target[prop] || '';
        },
        set: (target, prop, val) => {
          target[prop] = val;
          return true;
        },
      }),
      textContent: '',
      value: '',
      addEventListener: () => {},
      querySelector: () => ({ style: { setProperty: () => {} } }),
    };
  }

  const planeWrapperEl = { style: {} };
  const airplaneCarrier = makeMockEl('airplane-carrier', [
    'airplane-carrier',
    'flying',
  ]);
  airplaneCarrier.querySelector = (sel) =>
    sel === '.plane-wrapper' ? planeWrapperEl : { style: {} };

  const elements = {
    '#airplane-carrier': airplaneCarrier,
    '#flight-progress-bar': makeMockEl('flight-progress-bar'),
    '#flight-percentage': makeMockEl('flight-percentage'),
    '#flight-sky': makeMockEl('flight-sky'),
    '#monument-1': makeMockEl('monument-1'),
    '#monument-2': makeMockEl('monument-2'),
    '#monument-3': makeMockEl('monument-3'),
    '#destination-cloud': makeMockEl('destination-cloud'),
  };

  const mockContainer = {
    querySelector: (sel) => elements[sel] || null,
  };

  const loader = new FlightLoader(mockContainer);

  assert.equal(elements['#monument-1'].style.left, '27.9%');
  assert.equal(elements['#monument-1'].style.top, '64%');
  assert.ok(elements['#monument-1'].style.transform.includes('rotate(-3.4deg)'));
  assert.ok(elements['#monument-1'].style.transform.includes('scale(0.6)'));

  assert.equal(elements['#monument-2'].style.left, '51.2%');
  assert.equal(elements['#monument-2'].style.top, '62.1%');
  assert.ok(elements['#monument-2'].style.transform.includes('rotate(1deg)'));

  assert.equal(elements['#monument-3'].style.left, '70%');
  assert.equal(elements['#monument-3'].style.top, '65.7%');
  assert.ok(elements['#monument-3'].style.transform.includes('rotate(4.7deg)'));

  assert.equal(elements['#destination-cloud'].style.left, '79.4%');
  assert.equal(elements['#destination-cloud'].style.top, '69.3%');
  assert.ok(elements['#destination-cloud'].style.transform.includes('rotate(6.6deg)'));
  assert.ok(elements['#destination-cloud'].style.transform.includes('scale(0.35)'));
  assert.equal(elements['#destination-cloud'].classList.contains('revealed'), false);

  loader.setProgress(0);
  assert.equal(loader.progress, 0);
  assert.equal(elements['#flight-progress-bar'].style.width, '0%');
  assert.equal(elements['#airplane-carrier'].style.left, '6%');
  assert.equal(elements['#airplane-carrier'].style.top, '72%');
  assert.equal(planeWrapperEl.style.transform, 'rotate(-7.4deg)');
  assert.equal(elements['#monument-1'].classList.contains('revealed'), false);
  assert.equal(elements['#airplane-carrier'].classList.contains('flying'), true);
  assert.equal(elements['#airplane-carrier'].classList.contains('in-cloud'), false);
  assert.equal(elements['#destination-cloud'].classList.contains('revealed'), false);
  assert.equal(elements['#destination-cloud'].classList.contains('active'), false);

  loader.setProgress(30);
  assert.equal(loader.progress, 30);
  assert.equal(elements['#monument-1'].classList.contains('revealed'), true);
  assert.ok(elements['#monument-1'].style.transform.includes('scale(1)'));
  assert.ok(elements['#monument-1'].style.transform.includes('rotate(-3.4deg)'));
  assert.equal(elements['#monument-2'].classList.contains('revealed'), false);
  assert.equal(elements['#destination-cloud'].classList.contains('revealed'), false);

  loader.setProgress(46);
  assert.equal(planeWrapperEl.style.transform, 'rotate(0deg)');
  assert.equal(elements['#destination-cloud'].classList.contains('revealed'), false);

  loader.setProgress(50);
  assert.equal(elements['#destination-cloud'].classList.contains('revealed'), true);
  assert.ok(elements['#destination-cloud'].style.transform.includes('rotate(6.6deg)'));
  assert.ok(elements['#destination-cloud'].style.transform.includes('scale(1)'));
  assert.equal(elements['#destination-cloud'].classList.contains('active'), false);

  loader.setProgress(60);
  assert.equal(elements['#monument-1'].classList.contains('revealed'), true);
  assert.equal(elements['#monument-2'].classList.contains('revealed'), true);
  assert.ok(elements['#monument-2'].style.transform.includes('scale(1)'));
  assert.ok(elements['#monument-2'].style.transform.includes('rotate(1deg)'));
  assert.equal(elements['#monument-3'].classList.contains('revealed'), false);
  assert.equal(elements['#destination-cloud'].classList.contains('revealed'), true);

  loader.setProgress(75);
  assert.equal(elements['#monument-3'].classList.contains('revealed'), true);
  assert.ok(elements['#monument-3'].style.transform.includes('scale(1)'));
  assert.ok(elements['#monument-3'].style.transform.includes('rotate(4.7deg)'));
  assert.equal(elements['#airplane-carrier'].classList.contains('flying'), true);
  assert.equal(elements['#airplane-carrier'].classList.contains('in-cloud'), false);
  assert.equal(elements['#destination-cloud'].classList.contains('active'), false);

  loader.setProgress(82);
  assert.equal(elements['#airplane-carrier'].classList.contains('flying'), false);
  assert.equal(elements['#airplane-carrier'].classList.contains('in-cloud'), true);
  assert.equal(elements['#destination-cloud'].classList.contains('revealed'), true);
  assert.equal(elements['#destination-cloud'].classList.contains('active'), true);

  loader.setProgress(100);
  assert.equal(elements['#airplane-carrier'].classList.contains('in-cloud'), true);
  assert.equal(elements['#destination-cloud'].classList.contains('active'), true);

  loader.setProgress(40);
  assert.equal(elements['#airplane-carrier'].classList.contains('flying'), true);
  assert.equal(elements['#airplane-carrier'].classList.contains('in-cloud'), false);
  assert.equal(elements['#destination-cloud'].classList.contains('revealed'), false);
  assert.equal(elements['#destination-cloud'].classList.contains('active'), false);

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
  assert.equal(
    loadRouteCalled,
    2,
    '/load/ route should also trigger the /load handler',
  );
  assert.strictEqual(defaultRouteCalled, 0, 'la route / ne doit pas être appelée');
});

test('No visible navigation link or menu item points to /load in templates', () => {
  const htmlFiles = [
    path.resolve('public/index.html'),
    ...fs
      .readdirSync(path.resolve('public/screens'))
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
