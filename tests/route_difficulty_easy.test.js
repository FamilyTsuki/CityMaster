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

  const rueJeanneDArc = {
    type: 'Feature',
    properties: { name: "Rue Jeanne d'Arc", highway: 'pedestrian' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [1.904, 47.902],
        [1.913, 47.903] 
      ]
    }
  };
  const diffJeanneDArc = RouteDifficultyService.getRouteDifficulty(rueJeanneDArc, orleansCenter[0], orleansCenter[1]);
  assert.strictEqual(
    diffJeanneDArc,
    'easy',
    `Une artère emblématique longue comme "Rue Jeanne d'Arc" doit être classée facile même si piétonne`
  );

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

  const petiteRueCentre = {
    type: 'Feature',
    properties: { name: 'Rue du Chariot', highway: 'residential' },
    geometry: {
      type: 'LineString',
      coordinates: [
        [1.9090, 47.9029],
        [1.9094, 47.9031] 
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

test('RouteDifficultyService: les voies entre 80m et 800m avec toponyme majeur sont faciles (résolution disparité admin/jeu)', () => {
  // Voies réelles de Bordeaux et Tours qui étaient précédemment classées medium par AdminController (seuil >800m) mais faciles en jeu
  const testFeatures = [
    { name: 'Boulevard Maréchal Foch', lenCoords: [[0.0, 0.0], [0.005, 0.003]] }, // ~560m
    { name: 'Avenue de Paris', lenCoords: [[0.0, 0.0], [0.004, 0.002]] }, // ~450m
    { name: 'Pont George V', lenCoords: [[0.0, 0.0], [0.0018, 0.0005]] }, // ~200m
    { name: 'Quai Richelieu', lenCoords: [[0.0, 0.0], [0.0035, 0.0015]] }, // ~400m
    { name: 'Cours de l\'Intendance', lenCoords: [[0.0, 0.0], [0.003, 0.001]] }, // ~330m
  ];

  for (const item of testFeatures) {
    const f = {
      type: 'Feature',
      properties: { name: item.name },
      geometry: { type: 'LineString', coordinates: item.lenCoords }
    };

    // Mode longueur (default)
    const diffLength = RouteDifficultyService.getRouteDifficulty(f, { diffMode: 'length' });
    assert.strictEqual(
      diffLength,
      'easy',
      `"${item.name}" doit être classée "easy" en mode longueur, reçu: "${diffLength}"`
    );

    // Mode nomenclature
    const diffNom = RouteDifficultyService.getRouteDifficulty(f, { diffMode: 'nomenclature' });
    assert.strictEqual(
      diffNom,
      'easy',
      `"${item.name}" doit être classée "easy" en mode nomenclature, reçu: "${diffNom}"`
    );
  }
});

test('RouteDifficultyService: prise en compte des surcharges manuelles (overrides)', () => {
  const f = {
    type: 'Feature',
    properties: { name: 'Rue Ordinaire' },
    geometry: { type: 'LineString', coordinates: [[0.0, 0.0], [0.003, 0.002]] } // ~400m -> medium par défaut
  };

  const defaultDiff = RouteDifficultyService.getRouteDifficulty(f);
  assert.strictEqual(defaultDiff, 'medium');

  // Surcharge en facile
  const forcedEasy = RouteDifficultyService.getRouteDifficulty(f, {
    overrides: { 'rue ordinaire': 'easy' }
  });
  assert.strictEqual(forcedEasy, 'easy');

  // Surcharge en difficile
  const forcedHard = RouteDifficultyService.getRouteDifficulty(f, {
    overrides: { 'rue ordinaire': 'hard' }
  });
  assert.strictEqual(forcedHard, 'hard');
});


