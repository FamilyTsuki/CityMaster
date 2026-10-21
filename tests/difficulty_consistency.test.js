import test from 'node:test';
import assert from 'node:assert/strict';
import * as turf from '@turf/turf';
import {
  RouteDifficultyService,
  getFeatureLengthMeters,
  getFeatureCentroid,
  haversineMeters,
  computeNeighbourCounts,
} from '../src/services/RouteDifficultyService.js';
import { getPlayableStreets } from '../src/backend/services/CityStreetsService.js';
import { CityController } from '../src/backend/controllers/CityController.js';
import { GameController } from '../src/backend/controllers/GameController.js';
import { Settings } from '../src/backend/models/Settings.js';
import { decryptGameToken } from '../src/backend/utils/game.js';
import { createMockRes, writeDataFile, makeCity, makeStreet, removeDataFile } from './helpers.js';

const closeTo = (actual, expected, message) =>
  assert.ok(Math.abs(actual - expected) <= Math.max(1e-6, Math.abs(expected) * 1e-9), `${message}: ${actual} != ${expected}`);

test('calculs géographiques identiques à Turf.js (serveur et navigateur classent pareil)', () => {
  const line = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'MultiLineString', coordinates: [[[2.35, 48.85], [2.36, 48.86], [2.37, 48.855]], [[2.4, 48.8], [2.41, 48.81]]] },
  };
  const polygon = {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [[[1, 47], [1.01, 47], [1.01, 47.01], [1, 47.01], [1, 47]]] },
  };

  closeTo(getFeatureLengthMeters(line), turf.length(line, { units: 'meters' }), 'longueur');
  closeTo(getFeatureLengthMeters(polygon), turf.length(polygon, { units: 'meters' }), 'périmètre');
  assert.deepEqual(getFeatureCentroid(line), turf.centroid(line).geometry.coordinates);
  assert.deepEqual(getFeatureCentroid(polygon), turf.centroid(polygon).geometry.coordinates);
  closeTo(
    haversineMeters([2.35, 48.85], [4.85, 45.75]),
    turf.distance(turf.point([2.35, 48.85]), turf.point([4.85, 45.75]), { units: 'meters' }),
    'distance',
  );
});

test('computeNeighbourCounts (grille) donne le même résultat que la comparaison de toutes les paires', () => {
  let seed = 42;
  const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const features = Array.from({ length: 300 }, () => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates: [4.83 + random() * 0.03, 45.75 + random() * 0.03] },
  }));

  const expected = features.map((f, i) =>
    features.filter(
      (other, j) => j !== i && haversineMeters(f.geometry.coordinates, other.geometry.coordinates) <= 200,
    ).length,
  );
  assert.deepEqual(computeNeighbourCounts(features), expected);
});

test('mots-clés accentués reconnus : « allée », « cité », « chaussée »', () => {
  const allee = makeStreet('Allée des Roses', { lengthMeters: 600 });
  assert.equal(RouteDifficultyService.getRouteDifficulty(allee, {}), 'hard');

  const cite = makeStreet('Cité Bergère', { lengthMeters: 600 });
  assert.equal(RouteDifficultyService.getRouteDifficulty(cite, {}), 'hard');

  const chaussee = makeStreet("Chaussée d'Antin", { lengthMeters: 100 });
  assert.equal(RouteDifficultyService.getRouteDifficulty(chaussee, {}), 'easy');

  const courbet = makeStreet('Rue Courbet', { lengthMeters: 600 });
  assert.equal(
    RouteDifficultyService.getRouteDifficulty(courbet, {}),
    'easy',
    '« cour » ne doit pas être détecté à l’intérieur de « Courbet »',
  );
});

test("mode 'center' : le centre-ville est détecté côté serveur", async () => {
  // Cinq rues de 400 m très proches les unes des autres, et une rue isolée.
  const cluster = Array.from({ length: 5 }, (_, i) =>
    makeStreet(`Rue du Centre ${i + 1}`, { lengthMeters: 400, lat: 47.9 + i * 0.0002, lng: 1.9 }),
  );
  const isolated = makeStreet('Rue Isolée', { lengthMeters: 400, lat: 47.95, lng: 1.95 });
  await writeDataFile('center_city.json', { type: 'FeatureCollection', features: [...cluster, isolated] });

  await Settings.set('difficulty_mode', 'center');
  try {
    const { streets } = await getPlayableStreets('center_city');
    const byName = Object.fromEntries(streets.map((s) => [s.feature.properties.name, s.difficulty]));
    assert.equal(byName['Rue du Centre 1'], 'easy');
    assert.equal(byName['Rue Isolée'], 'medium');
  } finally {
    await Settings.set('difficulty_mode', 'length');
  }
});

test('/difficulties et /game/start utilisent le même classement', async () => {
  const majors = Array.from({ length: 5 }, (_, i) =>
    makeStreet(`Avenue ${i + 1}`, { lengthMeters: 120, lat: 48.2 + i * 0.002 }),
  );
  // 250-299 m : rangées « medium » par l'ancien calcul de /difficulties mais « hard » par le jeu.
  const ambiguous = Array.from({ length: 5 }, (_, i) =>
    makeStreet(`Rue Ambiguë ${i + 1}`, { lengthMeters: 270, lat: 48.3 + i * 0.002 }),
  );
  await writeDataFile('consistency_city.json', makeCity([...majors, ...ambiguous], 0));

  const res = createMockRes();
  await CityController.getDifficulties({ params: { key: 'consistency_city' } }, res);
  assert.deepEqual(res.body, ['easy', 'hard']);

  const { streets } = await getPlayableStreets('consistency_city');
  const counts = streets.reduce((acc, s) => ({ ...acc, [s.difficulty]: (acc[s.difficulty] || 0) + 1 }), {});
  assert.deepEqual(counts, { easy: 5, hard: 5 });
});

test("le réglage admin « places désactivées » s'applique au jeu sans PostgreSQL", async () => {
  // Régression : le jeu lisait ce réglage uniquement en base alors que
  // l'administration l'enregistrait aussi (et seulement, en mode local) dans un fichier.
  const places = Array.from({ length: 5 }, (_, i) =>
    makeStreet(`Place Numéro ${i + 1}`, { lengthMeters: 120, lat: 48.5 + i * 0.002 }),
  );
  await writeDataFile('places_city.json', makeCity(places, 5));

  await Settings.set('disable_places', 'true');
  try {
    const res = createMockRes();
    await GameController.startGame(
      { body: { cityKey: 'places_city', seriesCount: 10 }, user: { username: 'p' } },
      res,
    );
    assert.equal(res.statusCode, 400, 'seules 5 rues restent quand les places sont exclues');

    const ok = createMockRes();
    await GameController.startGame(
      { body: { cityKey: 'places_city', seriesCount: 5 }, user: { username: 'p' } },
      ok,
    );
    const session = decryptGameToken(ok.body.gameToken, process.env.JWT_SECRET);
    assert.ok(session.streets.every((s) => !s.name.startsWith('Place')));
    assert.equal(ok.body.disablePlaces, true);
  } finally {
    await Settings.set('disable_places', 'false');
    await removeDataFile('global_settings.json');
  }
});
