/**
 * Règles de jeu partagées par le serveur (parties en ligne) et le navigateur
 * (parties hors-ligne). Ce module ne dépend d'aucune bibliothèque : il peut
 * être importé des deux côtés.
 */
export const GAME_MODES = ['target', 'sprint', 'identify'];
export const GAME_DIFFICULTIES = ['easy', 'medium', 'hard', 'lotissement'];
export const DEFAULT_SERIES_COUNT = 5;
export const MAX_SERIES_COUNT = 50;

const ROUND_TIME_LIMITS = { easy: 45, medium: 60, lotissement: 60, hard: 90 };
const DEFAULT_TIME_LIMIT = 90;

const PERFECT_DISTANCE_METERS = 15;
const NEAR_DISTANCE_METERS = 100;

/**
 * Plus haut score possible pour une manche (sprint parfait, combo x3).
 * Sert à rejeter les scores incohérents envoyés au serveur.
 */
export const MAX_POINTS_PER_ROUND = (100 + 100) * 3;

/**
 * Durée d'une manche en secondes selon la difficulté de la rue.
 * @param {string} difficulty
 * @returns {number}
 */
export function getRoundTimeLimit(difficulty) {
  return ROUND_TIME_LIMITS[difficulty] || DEFAULT_TIME_LIMIT;
}

/**
 * Nombre de manches demandé, borné entre 1 et 50.
 * @param {unknown} value
 * @param {number} [fallback]
 * @returns {number}
 */
export function normalizeSeriesCount(value, fallback = DEFAULT_SERIES_COUNT) {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= MAX_SERIES_COUNT ? parsed : fallback;
}

/**
 * Normalise un nom de rue pour comparer la réponse du joueur (mode identify).
 * @param {unknown} text
 * @returns {string}
 */
export function normalizeStreetAnswer(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/^(le|la|les|l'|d'|du|de|des)\s+/, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Évalue une manche.
 * @param {object} input
 * @param {'target'|'sprint'|'identify'} input.mode
 * @param {string} input.streetName Nom de la rue à trouver.
 * @param {number|null} [input.distanceMeters] Distance entre le clic et la rue (modes target/sprint), null si aucun clic.
 * @param {unknown} [input.answer] Réponse tapée (mode identify).
 * @param {number} [input.elapsedSeconds]
 * @param {number} input.timeLimit
 * @param {number} [input.streakCount] Série de bonnes réponses avant cette manche.
 * @returns {{ pointsEarned: number, isCorrect: boolean, distance: number, code: string,
 *   timeBonus: number, streakCount: number, multiplier: number, message: string }}
 */
export function evaluateRound({
  mode,
  streetName,
  distanceMeters = null,
  answer = '',
  elapsedSeconds = 0,
  timeLimit,
  streakCount = 0,
}) {
  const remainingTime = Math.max(0, timeLimit - (Number(elapsedSeconds) || 0));
  let pointsEarned = 0;
  let isCorrect = false;
  let distance = -1;
  let timeBonus = 0;
  let code;
  let message;

  if (mode === 'identify') {
    const cleanAnswer = normalizeStreetAnswer(answer);
    const cleanCorrect = normalizeStreetAnswer(streetName);
    isCorrect =
      cleanAnswer.length > 0 && (cleanAnswer === cleanCorrect || cleanCorrect.includes(cleanAnswer));
    if (isCorrect) {
      pointsEarned = 15;
      code = 'identify_correct';
      message = `Bonne réponse ! C'était bien : ${streetName}`;
      if (remainingTime > 0) {
        timeBonus = Math.round((remainingTime / timeLimit) * 10);
      }
    } else {
      code = remainingTime <= 0 ? 'identify_timeout' : 'identify_false';
      message =
        remainingTime <= 0
          ? `Temps écoulé ! La bonne réponse était : ${streetName}`
          : `Faux. La bonne réponse était : ${streetName}`;
    }
  } else if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) {
    code = remainingTime <= 0 ? 'timeout_guess' : 'passed';
    message =
      remainingTime <= 0 ? "Temps écoulé ! Vous n'avez pas sélectionné d'emplacement." : 'Passé.';
  } else {
    distance = distanceMeters;
    if (distance <= PERFECT_DISTANCE_METERS) {
      pointsEarned = 100;
      isCorrect = true;
      code = 'perfect';
      message = 'Parfait ! Vous êtes exactement sur la rue.';
    } else if (distance <= NEAR_DISTANCE_METERS) {
      const ratio =
        1 - (distance - PERFECT_DISTANCE_METERS) / (NEAR_DISTANCE_METERS - PERFECT_DISTANCE_METERS);
      pointsEarned = Math.round(10 + 40 * ratio);
      isCorrect = true;
      code = 'near';
      message = `Pas mal ! Vous êtes à ${Math.round(distance)}m de la rue.`;
    } else {
      code = 'miss';
      message = `Raté. Vous étiez à ${Math.round(distance)}m. Voici le véritable emplacement.`;
    }
    if (pointsEarned > 0 && remainingTime > 0) {
      timeBonus = Math.round((remainingTime / timeLimit) * (mode === 'sprint' ? 100 : 30));
    }
  }

  if (timeBonus > 0) {
    pointsEarned += timeBonus;
    message += ` Bonus de temps : +${timeBonus} pts.`;
  }

  const nextStreak = isCorrect ? streakCount + 1 : 0;
  const multiplier = nextStreak >= 3 ? 3 : nextStreak === 2 ? 2 : 1;
  if (pointsEarned > 0 && multiplier > 1) {
    pointsEarned *= multiplier;
    message += ` (Combo x${multiplier} !)`;
  }

  return {
    pointsEarned,
    isCorrect,
    distance: distance === -1 ? -1 : Math.round(distance),
    code,
    timeBonus,
    streakCount: nextStreak,
    multiplier,
    message: `${message} (+${pointsEarned} pts)`,
  };
}

/**
 * Feedback renvoyé au client après une manche (même forme en ligne et hors-ligne).
 * @param {ReturnType<typeof evaluateRound>} result
 * @param {{ name: string, geometry: object }} street
 * @returns {object}
 */
export function buildRoundFeedback(result, street) {
  const feedback = {
    correctName: street.name,
    geometry: street.geometry,
    code: result.code,
    distance: result.distance,
    streakCount: result.streakCount,
    multiplier: result.multiplier,
    pointsEarned: result.pointsEarned,
    message: result.message,
    isCorrect: result.isCorrect,
  };
  if (result.timeBonus > 0) feedback.timeBonus = result.timeBonus;
  return feedback;
}
