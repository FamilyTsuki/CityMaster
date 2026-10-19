import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pointDistanceMeters,
  stitchCoordinates,
  stitchStreetFeatures,
} from '../src/services/SpatialService.js';
import { HapticService } from '../src/services/HapticService.js';

test('SpatialService.stitchCoordinates: raccorde les segments contigus bout-à-bout', () => {
  // Deux segments consécutifs A -> B et B -> C
  const seg1 = [[1.900, 47.900], [1.901, 47.901]];
  const seg2 = [[1.901, 47.901], [1.902, 47.902]];

  const stitched = stitchCoordinates([seg1, seg2], 5);
  assert.equal(stitched.length, 1, 'Les deux segments doivent être raccordés en 1 seule ligne continue');
  assert.equal(stitched[0].length, 3);
  assert.deepEqual(stitched[0], [
    [1.900, 47.900],
    [1.901, 47.901],
    [1.902, 47.902],
  ]);
});

test('SpatialService.stitchCoordinates: gère les inversions de sens de numérisation (reverse)', () => {
  // Segments où le second a été numérisé en sens inverse C -> B
  const seg1 = [[1.900, 47.900], [1.901, 47.901]];
  const seg2Reversed = [[1.902, 47.902], [1.901, 47.901]];

  const stitched = stitchCoordinates([seg1, seg2Reversed], 5);
  assert.equal(stitched.length, 1);
  assert.equal(stitched[0].length, 3);
  assert.deepEqual(stitched[0], [
    [1.900, 47.900],
    [1.901, 47.901],
    [1.902, 47.902],
  ]);
});

test('SpatialService.stitchCoordinates: ne fusionne PAS les segments disjoints / distants', () => {
  const segA = [[1.900, 47.900], [1.901, 47.901]];
  const segFar = [[1.950, 47.950], [1.951, 47.951]]; // ~7 km plus loin

  const stitched = stitchCoordinates([segA, segFar], 10);
  assert.equal(stitched.length, 2, 'Les segments trop éloignés doivent rester strictement séparés');
});

test('SpatialService.stitchStreetFeatures: fusionne les tronçons contigus portant le même nom', () => {
  const featurePart1 = {
    type: 'Feature',
    id: 101,
    properties: { name: 'Avenue des Champs-Élysées', highway: 'primary' },
    geometry: {
      type: 'LineString',
      coordinates: [[2.300, 48.870], [2.305, 48.868]],
    },
  };
  const featurePart2 = {
    type: 'Feature',
    id: 102,
    properties: { name: 'Avenue des Champs-Élysées', highway: 'primary' },
    geometry: {
      type: 'LineString',
      coordinates: [[2.305, 48.868], [2.310, 48.866]],
    },
  };

  const results = stitchStreetFeatures([featurePart1, featurePart2]);
  assert.equal(results.length, 1, 'Les deux parties doivent être unifiées');
  assert.equal(results[0].properties.name, 'Avenue des Champs-Élysées');
  assert.equal(results[0].geometry.type, 'LineString');
  assert.equal(results[0].geometry.coordinates.length, 3);
});

test('SpatialService.stitchStreetFeatures: ne fusionne JAMAIS des rues aux toponymes différents', () => {
  const rueA = {
    type: 'Feature',
    id: 1,
    properties: { name: 'Rue Victor Hugo' },
    geometry: {
      type: 'LineString',
      coordinates: [[1.900, 47.900], [1.901, 47.901]],
    },
  };
  const avenueA = {
    type: 'Feature',
    id: 2,
    properties: { name: 'Avenue Victor Hugo' },
    geometry: {
      type: 'LineString',
      coordinates: [[1.901, 47.901], [1.902, 47.902]],
    },
  };

  const results = stitchStreetFeatures([rueA, avenueA]);
  assert.equal(results.length, 2, 'Deux rues de noms différents ne doivent jamais être fusionnées');
  const names = results.map((r) => r.properties.name);
  assert.ok(names.includes('Rue Victor Hugo'));
  assert.ok(names.includes('Avenue Victor Hugo'));
});

test('SpatialService.stitchStreetFeatures: ne fusionne PAS des homonymes géographiquement distants (> maxGapMeters)', () => {
  const rueDistrict1 = {
    type: 'Feature',
    id: 10,
    properties: { name: 'Rue du Moulin' },
    geometry: {
      type: 'LineString',
      coordinates: [[1.900, 47.900], [1.901, 47.901]],
    },
  };
  const rueDistrict2 = {
    type: 'Feature',
    id: 11,
    properties: { name: 'Rue du Moulin' },
    geometry: {
      type: 'LineString',
      coordinates: [[1.950, 47.950], [1.951, 47.951]], // ~7 km plus loin
    },
  };

  const results = stitchStreetFeatures([rueDistrict1, rueDistrict2], { maxGapMeters: 150 });
  assert.equal(results.length, 2, 'Deux rues homonymes dans deux quartiers distants doivent rester séparées');
});

test('SpatialService.stitchStreetFeatures: préserve les polygones, lotissements et points sans les dénaturer', () => {
  const lotissement = {
    type: 'Feature',
    id: 99,
    properties: { name: 'Les Jardins du Parc', isLotissement: true },
    geometry: {
      type: 'Polygon',
      coordinates: [[[1.90, 47.90], [1.91, 47.90], [1.91, 47.91], [1.90, 47.90]]],
    },
  };
  const streetSameName = {
    type: 'Feature',
    id: 100,
    properties: { name: 'Les Jardins du Parc' },
    geometry: {
      type: 'LineString',
      coordinates: [[1.90, 47.90], [1.91, 47.90]],
    },
  };

  const results = stitchStreetFeatures([lotissement, streetSameName]);
  assert.equal(results.length, 2, 'Un lotissement/polygone ne doit jamais être fusionné avec une voie');
});

test('HapticService: exécution sécurisée et motifs de vibration', () => {
  // Sans navigator.vibrate dans node
  assert.equal(HapticService.isSupported(), false);
  assert.equal(HapticService.tap(), false);
  assert.equal(HapticService.success(), false);
  assert.equal(HapticService.combo(3), false);
  assert.equal(HapticService.error(), false);
  assert.equal(HapticService.warning(), false);

  // Avec un mock navigator.vibrate
  const recorded = [];
  const hadVibrate = 'vibrate' in globalThis.navigator;
  const originalVibrate = globalThis.navigator.vibrate;

  Object.defineProperty(globalThis.navigator, 'vibrate', {
    value: (pattern) => {
      recorded.push(pattern);
      return true;
    },
    configurable: true,
    writable: true,
  });

  try {
    assert.equal(HapticService.isSupported(), true);
    assert.equal(HapticService.tap(), true);
    assert.deepEqual(recorded[recorded.length - 1], 15);

    assert.equal(HapticService.success(), true);
    assert.deepEqual(recorded[recorded.length - 1], [35, 30, 45]);

    assert.equal(HapticService.combo(2), true);
    assert.deepEqual(recorded[recorded.length - 1], [40, 35, 55]);

    assert.equal(HapticService.combo(3), true);
    assert.deepEqual(recorded[recorded.length - 1], [40, 30, 40, 30, 75]);

    assert.equal(HapticService.error(), true);
    assert.deepEqual(recorded[recorded.length - 1], [70, 50, 90]);

    assert.equal(HapticService.warning(), true);
    assert.deepEqual(recorded[recorded.length - 1], 25);
  } finally {
    if (hadVibrate) {
      Object.defineProperty(globalThis.navigator, 'vibrate', {
        value: originalVibrate,
        configurable: true,
        writable: true,
      });
    } else {
      delete globalThis.navigator.vibrate;
    }
  }
});
