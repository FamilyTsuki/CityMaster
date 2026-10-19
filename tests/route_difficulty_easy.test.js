import test from 'node:test';
import assert from 'node:assert';
import { RouteDifficultyService } from '../src/services/RouteDifficultyService.js';

test('RouteDifficultyService: les grands axes toponymiques sont classés en mode facile', () => {
  const orleansCenter = [47.9029, 1.909];

  const majorStreets = [
    { name: 'Boulevard Alexandre Martin', coords: [[1.908, 47.905], [1.915, 47.907]] },
    { name: 'Avenue de Paris', coords: [[1.908, 47.910], [1.912, 47.925]] },
    { name: 'Mail Ouest', coords: [[1.895, 47.902], [1.898, 47.908]] },
    { name: 'Quai du Châtelet', coords: [[1.902, 47.898], [1.915, 47.899]] },
    { name: 'Pont George V', coords: [[1.904, 47.899], [1.906, 47.895]] },
    { name: 'Cours Victor Hugo', coords: [[1.901, 47.901], [1.905, 47.903]] },
    { name: 'Faubourg Bannier', coords: [[1.902, 47.912], [1.904, 47.922]] },
  ];

  for (const item of majorStreets) {
    const feature = {
      type: 'Feature',
      properties: { name: item.name },
      geometry: {
        type: 'LineString',
        coordinates: item.coords
      }
    };
    const diff = RouteDifficultyService.getRouteDifficulty(feature, orleansCenter[0], orleansCenter[1]);
    assert.strictEqual(
      diff,
      'easy',
      `Le grand axe "${item.name}" doit être classé en mode facile (easy), reçu: "${diff}"`
    );
  }
});

test('RouteDifficultyService: les artères historiques longues et voies primaires sont faciles', () => {
  const orleansCenter = [47.9029, 1.909];

  // Rue Jeanne d'Arc (longue artère historique > 600m)
  const rueJeanneDArc = {
    type: 'Feature',
    properties: { name: "Rue Jeanne d'Arc", highway: 'pedestrian' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [1.904, 47.902],
        [1.913, 47.903] // ~680 mètres
      ]
    }
  };
  const diffJeanneDArc = RouteDifficultyService.getRouteDifficulty(rueJeanneDArc, orleansCenter[0], orleansCenter[1]);
  assert.strictEqual(
    diffJeanneDArc,
    'easy',
    `Une artère emblématique longue comme "Rue Jeanne d'Arc" doit être classée facile même si piétonne`
  );

  // Voie avec tag routier majeur OSM (primary/secondary)
  const routeDepartementale = {
    type: 'Feature',
    properties: { name: 'D 2020', highway: 'primary' },
    geometry: {
      type: 'LineString',
      coordinates: [[1.90, 47.90], [1.902, 47.903]]
    }
  };
  assert.strictEqual(
    RouteDifficultyService.getRouteDifficulty(routeDepartementale, orleansCenter[0], orleansCenter[1]),
    'easy'
  );
});

test('RouteDifficultyService: les petites ruelles courtes du centre historique ne sont PAS classées en mode facile', () => {
  const orleansCenter = [47.9029, 1.909];

  // Ruelle courte (ex: 45 mètres) au cœur du centre historique
  const petiteRueCentre = {
    type: 'Feature',
    properties: { name: 'Rue du Chariot', highway: 'residential' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [1.9090, 47.9029],
        [1.9094, 47.9031] // ~40 mètres
      ]
    }
  };

  const diff = RouteDifficultyService.getRouteDifficulty(petiteRueCentre, orleansCenter[0], orleansCenter[1]);
  assert.notStrictEqual(
    diff,
    'easy',
    'Une ruelle courte de 40 mètres dans le centre historique ne doit JAMAIS être classée en mode facile'
  );
  assert.strictEqual(
    diff,
    'hard',
    'Une petite ruelle de 40 mètres doit être classée difficile (hard)'
  );
});

test('RouteDifficultyService: les voies mineures (impasses, sentiers, passages) restent difficiles', () => {
  const orleansCenter = [47.9029, 1.909];

  const minorFeatures = [
    { name: 'Impasse des Trois Maries', coords: [[1.909, 47.903], [1.910, 47.904]] },
    { name: 'Sentier du Loiret', coords: [[1.909, 47.880], [1.912, 47.882]] },
    { name: 'Ruelle des Chiens', coords: [[1.905, 47.901], [1.906, 47.902]] },
    { name: 'Passage Sainte-Croix', coords: [[1.910, 47.902], [1.911, 47.903]] }
  ];

  for (const item of minorFeatures) {
    const f = {
      type: 'Feature',
      properties: { name: item.name },
      geometry: { type: 'LineString', coordinates: item.coords }
    };
    const diff = RouteDifficultyService.getRouteDifficulty(f, orleansCenter[0], orleansCenter[1]);
    assert.strictEqual(diff, 'hard', `La voie mineure "${item.name}" doit être classée hard`);
  }
});

