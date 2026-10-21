import test from 'node:test';
import assert from 'node:assert/strict';
import { GameController } from '../src/backend/controllers/GameController.js';
import { decryptGameToken, encryptGameToken } from '../src/backend/utils/game.js';
import { Score } from '../src/backend/models/Score.js';
import { createMockRes, writeDataFile, makeCity, makeStreet } from './helpers.js';

const CITY = 'round_city';
const secret = () => process.env.JWT_SECRET;

await writeDataFile(
  `${CITY}.json`,
  makeCity([
    makeStreet('Boulevard Long', { lengthMeters: 900, lat: 48.0 }),
    makeStreet('Avenue Large', { lengthMeters: 900, lat: 48.01 }),
  ]),
);

async function startGame(body, username = 'player_one') {
  const res = createMockRes();
  await GameController.startGame({ body: { cityKey: CITY, ...body }, user: { username } }, res);
  return res;
}

async function submit(gameToken, guess, username = 'player_one') {
  const res = createMockRes();
  await GameController.submitRound(
    { body: { gameToken, guess, elapsedSeconds: 5 }, user: { username } },
    res,
  );
  return res;
}

function firstPoint(session, round) {
  const [lng, lat] = session.streets[round].geometry.coordinates[0];
  return { lat, lng };
}

test('startGame: paramètres invalides normalisés et durée de manche dans la consigne', async () => {
  const res = await startGame({ mode: 'evil', difficulty: '<script>', seriesCount: 3 });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  const session = decryptGameToken(res.body.gameToken, secret());
  assert.equal(session.mode, 'target');
  assert.equal(session.difficulty, 'hard');
  assert.equal(res.body.nextPrompt.timeLimit, 90);
  assert.equal(res.body.nextPrompt.totalRounds, 3);

  const easy = await startGame({ difficulty: 'easy', seriesCount: 2 });
  assert.equal(easy.body.nextPrompt.timeLimit, 45, 'les rues faciles ont 45 secondes');
});

test('submitRound: un jeton modifié est refusé avec un code exploitable par le client', async () => {
  const { body } = await startGame({ seriesCount: 2 });
  const parts = body.gameToken.split('.');
  const last = parts[3];
  parts[3] = (last[0] === 'A' ? 'B' : 'A') + last.slice(1);

  const res = await submit(parts.join('.'), null);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, 'INVALID_GAME_TOKEN');

  const legacy = await submit('00112233445566778899aabbccddeeff:abcdef', null);
  assert.equal(legacy.body.code, 'INVALID_GAME_TOKEN');
});

test("submitRound: la partie d'un autre joueur est refusée sans déconnecter personne", async () => {
  const { body } = await startGame({ seriesCount: 2 });
  const res = await submit(body.gameToken, null, 'someone_else');
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.code, 'GAME_SESSION_MISMATCH');
});

test('submitRound: renvoyer le même jeton redonne la même réponse sans nouveau score', async () => {
  const username = 'replay_player';
  const { body } = await startGame({ seriesCount: 1 }, username);
  const session = decryptGameToken(body.gameToken, secret());

  const first = await submit(body.gameToken, firstPoint(session, 0), username);
  assert.equal(first.body.isFinished, true);
  assert.ok(first.body.totalScore > 0);

  // Second envoi du même jeton avec une autre réponse (rejeu ou double clic).
  const second = await submit(body.gameToken, { lat: 0, lng: 0 }, username);
  assert.deepEqual(second.body, first.body);
  assert.equal(await Score.getTotalScoreByPlayer(username), first.body.totalScore);
});

test('submitRound: un jeton déjà dépassé est refusé (409)', async () => {
  const { body } = await startGame({ seriesCount: 3 });
  const round0 = body.gameToken;
  const afterRound0 = await submit(round0, null);
  await submit(afterRound0.body.gameToken, null);

  const replay = await submit(round0, null);
  assert.equal(replay.statusCode, 409);
  assert.equal(replay.body.code, 'STALE_GAME_TOKEN');
});

test('submitRound: totalScore est le cumul de la partie à chaque manche', async () => {
  const { body } = await startGame({ seriesCount: 2 });
  const session = decryptGameToken(body.gameToken, secret());

  const round1 = await submit(body.gameToken, firstPoint(session, 0));
  assert.equal(round1.body.isFinished, false);
  assert.equal(round1.body.totalScore, round1.body.feedback.pointsEarned);
  assert.ok(round1.body.totalScore > 0, 'le score partiel ne doit plus être 0');

  const round2 = await submit(round1.body.gameToken, null);
  assert.equal(round2.body.totalScore, round1.body.totalScore);
});

test('submitRound: en compétition, la durée suit la difficulté de chaque rue', async () => {
  const session = {
    gameId: 'competition-test',
    username: 'player_one',
    mode: 'target',
    difficulty: 'competition',
    testNumber: 1234,
    streets: [
      { id: 0, name: 'Rue A', geometry: { type: 'Point', coordinates: [1.9, 47.9] }, difficulty: 'hard' },
      { id: 1, name: 'Rue B', geometry: { type: 'Point', coordinates: [1.9, 47.9] }, difficulty: 'easy' },
    ],
    currentRound: 0,
    streakCount: 0,
    scores: [],
    sprintHistory: [],
  };
  const res = await submit(encryptGameToken(session, secret()), null);
  assert.equal(res.body.nextPrompt.timeLimit, 45);
});
