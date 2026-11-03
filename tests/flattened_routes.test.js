import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCityCustomizations, splitFlattenedRoute } from '../src/services/SpatialService.js';

// Trois tronçons d'une même rue, éloignés les uns des autres (≈ 1 km).
const partA = [[1.9, 47.8], [1.9005, 47.8], [1.901, 47.8]];
const partB = [[1.9, 47.81], [1.9005, 47.81]];
const partC = [[1.91, 47.82], [1.9105, 47.82], [1.911, 47.82]];
const original = {
  type: 'Feature',
  properties: { name: 'Rue Morcelée' },
  geometry: { type: 'MultiLineString', coordinates: [partA, partB, partC] },
};
const customRoute = (coordinates) => ({
  type: 'Feature',
  properties: { id: 'Rue Morcelée', name: 'Rue Morcelée', originalName: 'Rue Morcelée', isCustom: true },
  geometry: { type: 'LineString', coordinates },
});

test('une rue enregistrée en une seule ligne par les anciennes versions retrouve ses tronçons', () => {
  const flattened = customRoute([...partA, ...partB, ...partC]);
  const [repaired] = applyCityCustomizations([original], [], [flattened]);
  assert.equal(repaired.geometry.type, 'MultiLineString');
  assert.deepEqual(repaired.geometry.coordinates, [partA, partB, partC]);
});

test('les points ajoutés par un administrateur ne sont pas recoupés', () => {
  const added = [1.905, 47.805];
  const route = customRoute([...partA, added, ...partB]);
  assert.equal(splitFlattenedRoute(route, original), route);
});

test('un saut d\'un bout à l\'autre d\'un même tronçon est recoupé', () => {
  const route = customRoute([...partC, partC[0], ...partA]);
  const repaired = splitFlattenedRoute(route, original);
  assert.deepEqual(repaired.geometry.coordinates, [partC, partA]);
});

test('une rue déjà en plusieurs tronçons ou sans voie d\'origine reste inchangée', () => {
  const multi = { ...customRoute([]), geometry: original.geometry };
  assert.equal(splitFlattenedRoute(multi, original), multi);
  const alone = customRoute([...partA, ...partC]);
  assert.equal(splitFlattenedRoute(alone, undefined), alone);
});
