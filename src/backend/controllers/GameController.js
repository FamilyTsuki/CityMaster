import crypto from 'crypto';
import pool, { isDatabaseEnabled } from '../config/database.js';
import { isValidCityKey } from '../config/paths.js';
import { encryptGameToken, decryptGameToken, getDistanceToStreet } from '../utils/game.js';
import { Score } from '../models/Score.js';
import {
  getPlayableStreets,
  pickStreets,
  seededRandom,
} from '../services/CityStreetsService.js';
import {
  GAME_MODES,
  GAME_DIFFICULTIES,
  evaluateRound,
  buildRoundFeedback,
  getRoundTimeLimit,
  normalizeSeriesCount,
} from '../../services/ScoringService.js';

/**
 * Une partie est entièrement décrite par un jeton chiffré (voir utils/game.js)
 * que le client renvoie à chaque manche : le serveur ne stocke pas les parties.
 *
 * Pour qu'un même jeton ne puisse pas être rejoué (connaître la réponse puis
 * renvoyer le même jeton, ou double envoi après une coupure réseau), le
 * résultat de la dernière manche traitée de chaque partie est gardé en mémoire :
 * - même jeton renvoyé  -> même réponse, sans recalcul ni nouveau score ;
 * - jeton plus ancien   -> refusé (409).
 * Ce cache est perdu au redémarrage du serveur.
 */
const ROUND_CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const ROUND_CACHE_MAX_ENTRIES = 2000;
const processedRounds = new Map();

const MAX_TEST_NUMBER = 2147483647;

function rememberRound(gameId, round, response) {
  processedRounds.delete(gameId);
  processedRounds.set(gameId, { round, response, expiresAt: Date.now() + ROUND_CACHE_TTL_MS });
  while (processedRounds.size > ROUND_CACHE_MAX_ENTRIES) {
    processedRounds.delete(processedRounds.keys().next().value);
  }
}

function getProcessedRound(gameId) {
  const entry = processedRounds.get(gameId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    processedRounds.delete(gameId);
    return null;
  }
  return entry;
}

function parseTestNumber(value) {
  return Number.isInteger(value) && value > 0 && value <= MAX_TEST_NUMBER ? value : null;
}

function buildPrompt(session) {
  const street = session.streets[session.currentRound];
  const prompt = {
    roundIndex: session.currentRound,
    totalRounds: session.streets.length,
    mode: session.mode,
    timeLimit: getRoundTimeLimit(street.difficulty),
  };
  if (session.mode === 'identify') {
    prompt.geometry = street.geometry;
  } else {
    prompt.streetName = street.name;
  }
  return prompt;
}

/**
 * Paramètres imposés par le salon associé à un numéro de test, s'il existe.
 */
async function findRoomSettings(testNumber) {
  if (!testNumber || !isDatabaseEnabled()) return null;
  const result = await pool.query(
    'SELECT city_key, mode, difficulty, series_count FROM rooms WHERE test_id = $1 ORDER BY created_at DESC LIMIT 1',
    [testNumber],
  );
  return result.rows[0] || null;
}

function getSecret(res) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: 'Server security configuration error' });
    return null;
  }
  return secret;
}

export class GameController {
  static async startGame(req, res) {
    try {
      const secret = getSecret(res);
      if (!secret) return;

      const body = req.body || {};
      const testNumber = parseTestNumber(body.testNumber);
      let cityKey = body.cityKey;
      let mode = GAME_MODES.includes(body.mode) ? body.mode : 'target';
      let difficulty = GAME_DIFFICULTIES.includes(body.difficulty) ? body.difficulty : 'hard';
      let seriesCount = normalizeSeriesCount(body.seriesCount);

      const room = await findRoomSettings(testNumber);
      if (room) {
        cityKey = room.city_key;
        if (GAME_MODES.includes(room.mode)) mode = room.mode;
        if (GAME_DIFFICULTIES.includes(room.difficulty)) difficulty = room.difficulty;
        seriesCount = normalizeSeriesCount(room.series_count, seriesCount);
      }

      if (!cityKey) {
        return res.status(400).json({ error: 'cityKey is required' });
      }
      if (!isValidCityKey(cityKey)) {
        return res.status(400).json({ error: 'Invalid cityKey' });
      }

      const playable = await getPlayableStreets(cityKey);
      if (!playable) {
        return res.status(404).json({ error: 'City data not found.' });
      }
      if (playable.streets.length === 0) {
        return res.status(400).json({ error: 'No streets found for this city.' });
      }

      const random = testNumber ? seededRandom(testNumber) : Math.random;
      const selected = pickStreets(playable.streets, difficulty, seriesCount, random);
      if (selected.length < seriesCount) {
        return res.status(400).json({ error: 'not_enough_streets_difficulty' });
      }

      const session = {
        gameId: crypto.randomUUID(),
        username: req.user.username,
        mode,
        difficulty: testNumber ? 'competition' : difficulty,
        testNumber,
        streets: selected.map(({ feature, difficulty: streetDifficulty }, idx) => ({
          id: idx,
          name: feature.properties.name,
          geometry: feature.geometry,
          difficulty: streetDifficulty,
        })),
        currentRound: 0,
        streakCount: 0,
        scores: [],
        sprintHistory: [],
      };

      return res.json({
        gameToken: encryptGameToken(session, secret),
        nextPrompt: buildPrompt(session),
        disablePlaces: playable.disablePlaces,
        isFinished: false,
      });
    } catch (error) {
      console.error('GameController startGame error:', error);
      return res.status(500).json({ error: 'Internal server error starting game' });
    }
  }

  static async submitRound(req, res) {
    try {
      const secret = getSecret(res);
      if (!secret) return;

      const { gameToken, guess, elapsedSeconds } = req.body || {};
      if (!gameToken) {
        return res.status(400).json({ error: 'gameToken is required' });
      }

      let session;
      try {
        session = decryptGameToken(gameToken, secret);
      } catch {
        return res
          .status(400)
          .json({ error: 'Invalid or tampered gameToken', code: 'INVALID_GAME_TOKEN' });
      }

      if (session.username !== req.user.username) {
        return res
          .status(403)
          .json({ error: 'Game session does not belong to you', code: 'GAME_SESSION_MISMATCH' });
      }

      const processed = getProcessedRound(session.gameId);
      if (processed && processed.round === session.currentRound) {
        return res.json(processed.response);
      }
      if (processed && processed.round > session.currentRound) {
        return res
          .status(409)
          .json({ error: 'This round has already been played', code: 'STALE_GAME_TOKEN' });
      }

      if (session.currentRound >= session.streets.length) {
        return res.status(400).json({ error: 'Game is already finished', code: 'GAME_FINISHED' });
      }

      const roundIndex = session.currentRound;
      const currentStreet = session.streets[roundIndex];
      const mode = session.mode;
      const hasGuess = guess && typeof guess.lat === 'number' && typeof guess.lng === 'number';

      const result = evaluateRound({
        mode,
        streetName: currentStreet.name,
        distanceMeters:
          mode !== 'identify' && hasGuess
            ? getDistanceToStreet(guess.lat, guess.lng, currentStreet.geometry)
            : null,
        answer: guess,
        elapsedSeconds,
        timeLimit: getRoundTimeLimit(currentStreet.difficulty),
        streakCount: session.streakCount || 0,
      });
      const feedback = buildRoundFeedback(result, currentStreet);

      if (mode === 'sprint') {
        session.sprintHistory.push({
          name: currentStreet.name,
          distance: result.distance,
          points: result.pointsEarned,
          timeBonus: result.timeBonus,
        });
      }
      session.streakCount = result.streakCount;
      session.scores.push(result.pointsEarned);
      session.currentRound++;

      const isFinished = session.currentRound >= session.streets.length;
      const totalScore = session.scores.reduce((a, b) => a + b, 0);
      if (isFinished && totalScore > 0) {
        await Score.create(session.username, totalScore, session.difficulty, null, session.testNumber);
      }

      const response = {
        gameToken: isFinished ? null : encryptGameToken(session, secret),
        feedback,
        nextPrompt: isFinished ? null : buildPrompt(session),
        isFinished,
        totalScore,
        sprintHistory: session.sprintHistory,
      };
      rememberRound(session.gameId, roundIndex, response);
      return res.json(response);
    } catch (error) {
      console.error('GameController submitRound error:', error);
      return res.status(500).json({ error: 'Internal server error submitting round' });
    }
  }
}
