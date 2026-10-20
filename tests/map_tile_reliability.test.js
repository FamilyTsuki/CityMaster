import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('MapView: configuration de tuiles avec buffer étendu et auto-retry', () => {
  const mapViewSrc = fs.readFileSync(path.resolve('src/views/MapView.js'), 'utf8');

  assert.match(
    mapViewSrc,
    /keepBuffer:\s*8/,
    'MapView tileLayer doit avoir keepBuffer: 8 pour précharger les tuiles périphériques'
  );
  assert.match(
    mapViewSrc,
    /crossOrigin:\s*true/,
    'MapView tileLayer doit avoir crossOrigin: true pour la compatibilité cache'
  );
  assert.match(
    mapViewSrc,
    /updateWhenIdle:\s*false/,
    'MapView tileLayer doit charger en continu (updateWhenIdle: false)'
  );

  assert.match(
    mapViewSrc,
    /attachTileAutoRetry/,
    'MapView doit posséder un mécanisme d auto-retry des tuiles sur tileerror'
  );
  assert.match(
    mapViewSrc,
    /data-retry-count/,
    'MapView doit tracker le nombre de tentatives de rechargement de tuile'
  );

  assert.match(
    mapViewSrc,
    /requestAnimationFrame/,
    'invalidateSize doit ordonnancer un rafraîchissement au frame suivant'
  );
  assert.match(
    mapViewSrc,
    /ResizeObserver/,
    'MapView doit observer les redimensionnements du conteneur #map'
  );
});

test('Service Worker: support du cache des tuiles CartoDB et ArcGIS', () => {
  const swSrc = fs.readFileSync(path.resolve('public/sw.js'), 'utf8');

  assert.match(
    swSrc,
    /cartocdn\.com/,
    'sw.js doit autoriser la mise en cache des tuiles CartoDB'
  );
  assert.match(
    swSrc,
    /arcgisonline\.com/,
    'sw.js doit autoriser la mise en cache des tuiles ArcGIS'
  );
});

