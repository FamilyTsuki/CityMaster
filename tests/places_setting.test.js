import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { isPlaceStreet as isPlaceStreetFront, RouteDifficultyService } from '../src/services/RouteDifficultyService.js';
import { isPlaceStreet as isPlaceStreetBack } from '../src/backend/utils/game.js';

test('isPlaceStreet: correctly identifies places, squares, and placettes', () => {
  const placeNames = [
    'Place de la République',
    'Place du Martroi',
    'Places des Vosges',
    'Placette des Fleurs',
    'Square de Meeûs',
    'Pl. de la Gare',
    'Pl Jean Jaurès',
    'Esplanade des Invalides',
    'Parvis Notre-Dame',
  ];

  const nonPlaceNames = [
    'Rue de la Paix',
    'Rue de la Place',
    'Avenue des Champs-Élysées',
    'Boulevard Saint-Germain',
    'Chemin du Moulin',
    'Allée de la Place Meffré',
    'Impasse des Lilas',
    'Route de Paris',
  ];

  for (const name of placeNames) {
    assert.strictEqual(isPlaceStreetFront(name), true, `Frontend should detect "${name}" as a place`);
    assert.strictEqual(isPlaceStreetBack(name), true, `Backend should detect "${name}" as a place`);
    assert.strictEqual(RouteDifficultyService.isPlaceStreet(name), true, `RouteDifficultyService.isPlaceStreet should detect "${name}"`);
  }

  for (const name of nonPlaceNames) {
    assert.strictEqual(isPlaceStreetFront(name), false, `Frontend should not detect "${name}" as a place`);
    assert.strictEqual(isPlaceStreetBack(name), false, `Backend should not detect "${name}" as a place`);
    assert.strictEqual(RouteDifficultyService.isPlaceStreet(name), false, `RouteDifficultyService.isPlaceStreet should not detect "${name}"`);
  }

  // Feature object tests
  assert.strictEqual(isPlaceStreetFront({ properties: { name: 'Place Royale' } }), true);
  assert.strictEqual(isPlaceStreetBack({ properties: { name: 'Place Royale' } }), true);
  assert.strictEqual(isPlaceStreetFront({ properties: { name: 'Forum', place: 'square' } }), true);
  assert.strictEqual(isPlaceStreetBack({ properties: { name: 'Forum', place: 'square' } }), true);
  assert.strictEqual(isPlaceStreetFront({ properties: { name: 'Rue Royale' } }), false);
  assert.strictEqual(isPlaceStreetBack({ properties: { name: 'Rue Royale' } }), false);
});

test('admin.html: contains disable-places setting select and i18n tags', () => {
  const adminHtml = fs.readFileSync(path.resolve('public/screens/admin.html'), 'utf8');

  assert.match(adminHtml, /id=["']admin-disable-places-select["']/, 'admin.html must contain #admin-disable-places-select');
  assert.match(adminHtml, /data-i18n=["']admin\.places_setting["']/, 'admin.html must have data-i18n="admin.places_setting"');
  assert.match(adminHtml, /value=["']false["'][^>]*data-i18n=["']admin\.places_option_allowed["']/, 'admin.html must have allowed option');
  assert.match(adminHtml, /value=["']true["'][^>]*data-i18n=["']admin\.places_option_disabled["']/, 'admin.html must have disabled option');
});

test('places filtering: streets array correctly filters out places when disabled', () => {
  const mixedStreets = [
    { properties: { name: 'Rue Principale' }, geometry: { type: 'LineString' } },
    { properties: { name: 'Place de la Mairie' }, geometry: { type: 'LineString' } },
    { properties: { name: 'Avenue de la Gare' }, geometry: { type: 'LineString' } },
    { properties: { name: 'Square Albert 1er' }, geometry: { type: 'LineString' } },
    { properties: { name: 'Boulevard Victor Hugo' }, geometry: { type: 'LineString' } },
    { properties: { name: 'Placette des Écoles' }, geometry: { type: 'LineString' } },
    { properties: { name: 'Chemin des Dames' }, geometry: { type: 'LineString' } },
    { properties: { name: 'Rue du Commerce' }, geometry: { type: 'LineString' } },
  ];

  const filtered = mixedStreets.filter((s) => !isPlaceStreetBack(s));

  assert.strictEqual(filtered.length, 5, 'Should filter out exactly 3 places leaving 5 streets');
  assert.ok(filtered.every((s) => !isPlaceStreetBack(s)), 'No remaining street should be a place');
  assert.deepStrictEqual(
    filtered.map((s) => s.properties.name),
    ['Rue Principale', 'Avenue de la Gare', 'Boulevard Victor Hugo', 'Chemin des Dames', 'Rue du Commerce']
  );
});

