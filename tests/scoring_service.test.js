import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateRound,
  buildRoundFeedback,
  getRoundTimeLimit,
  normalizeSeriesCount,
  MAX_POINTS_PER_ROUND,
} from '../src/services/ScoringService.js';

const base = { mode: 'target', streetName: 'Rue de la Paix', timeLimit: 90, elapsedSeconds: 90 };

test('evaluateRound: barème de distance (parfait, proche, raté)', () => {
  assert.equal(evaluateRound({ ...base, distanceMeters: 10 }).pointsEarned, 100);
  assert.equal(evaluateRound({ ...base, distanceMeters: 15 }).code, 'perfect');

  const near = evaluateRound({ ...base, distanceMeters: 57.5 });
  assert.equal(near.code, 'near');
  assert.equal(near.pointsEarned, 30);

  const miss = evaluateRound({ ...base, distanceMeters: 250 });
  assert.equal(miss.code, 'miss');
  assert.equal(miss.pointsEarned, 0);
  assert.equal(miss.isCorrect, false);
  assert.equal(miss.distance, 250);
});

test("evaluateRound: une distance incalculable n'accorde aucun point", () => {
  // Régression : le serveur traitait une distance `null` comme un clic parfait (100 pts).
  const result = evaluateRound({ ...base, elapsedSeconds: 10, distanceMeters: null });
  assert.equal(result.pointsEarned, 0);
  assert.equal(result.code, 'passed');
  assert.equal(result.distance, -1);

  const timeout = evaluateRound({ ...base, distanceMeters: Number.NaN });
  assert.equal(timeout.code, 'timeout_guess');
});

test('evaluateRound: bonus de temps selon le mode', () => {
  const target = evaluateRound({ ...base, elapsedSeconds: 45, distanceMeters: 5 });
  assert.equal(target.timeBonus, 15);
  assert.equal(target.pointsEarned, 115);

  const sprint = evaluateRound({ ...base, mode: 'sprint', elapsedSeconds: 45, distanceMeters: 5 });
  assert.equal(sprint.timeBonus, 50);
  assert.equal(sprint.pointsEarned, 150);
});

test('evaluateRound: série et multiplicateur de combo', () => {
  const second = evaluateRound({ ...base, distanceMeters: 5, streakCount: 1 });
  assert.equal(second.streakCount, 2);
  assert.equal(second.multiplier, 2);
  assert.equal(second.pointsEarned, 200);

  const third = evaluateRound({ ...base, distanceMeters: 5, streakCount: 5 });
  assert.equal(third.multiplier, 3);

  const broken = evaluateRound({ ...base, distanceMeters: 500, streakCount: 5 });
  assert.equal(broken.streakCount, 0);
  assert.equal(broken.multiplier, 1);
});

test('evaluateRound: mode identify compare les noms normalisés', () => {
  const identify = { mode: 'identify', streetName: 'Rue de la Paix', timeLimit: 60, elapsedSeconds: 60 };
  assert.equal(evaluateRound({ ...identify, answer: 'rue de la paix' }).isCorrect, true);
  assert.equal(evaluateRound({ ...identify, answer: 'Paix' }).isCorrect, true);
  assert.equal(evaluateRound({ ...identify, answer: '' }).isCorrect, false);
  assert.equal(evaluateRound({ ...identify, answer: { lat: 1 } }).isCorrect, false);
  assert.equal(evaluateRound({ ...identify, answer: 'Avenue Foch' }).code, 'identify_timeout');
});

test('le score maximal par manche couvre le meilleur cas réel', () => {
  const best = evaluateRound({ ...base, mode: 'sprint', elapsedSeconds: 0, distanceMeters: 0, streakCount: 10 });
  assert.equal(best.pointsEarned, MAX_POINTS_PER_ROUND);
});

test('buildRoundFeedback, getRoundTimeLimit et normalizeSeriesCount', () => {
  const feedback = buildRoundFeedback(evaluateRound({ ...base, distanceMeters: 500 }), {
    name: 'Rue de la Paix',
    geometry: { type: 'Point', coordinates: [0, 0] },
  });
  assert.equal(feedback.correctName, 'Rue de la Paix');
  assert.equal('timeBonus' in feedback, false);

  assert.equal(getRoundTimeLimit('easy'), 45);
  assert.equal(getRoundTimeLimit('lotissement'), 60);
  assert.equal(getRoundTimeLimit('competition'), 90);

  assert.equal(normalizeSeriesCount('12'), 12);
  assert.equal(normalizeSeriesCount(0), 5);
  assert.equal(normalizeSeriesCount(51), 5);
  assert.equal(normalizeSeriesCount(undefined, 10), 10);
});
