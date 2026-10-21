import pool, { isDatabaseEnabled } from '../config/database.js';

/**
 * Scores de fin de partie.
 * - Mode PostgreSQL : table `scores`.
 * - Mode local : tableau en mémoire (perdu au redémarrage).
 * Les classements gardent le meilleur score de chaque joueur (MAX).
 */
const memoryScores = [];

function bestScorePerPlayer(scores, limit) {
  const best = new Map();
  for (const s of scores) {
    const current = best.get(s.player);
    if (!current || current.score < s.score) {
      best.set(s.player, s);
    }
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => ({ username: s.player, score: s.score, created_at: s.date }));
}

function matchesDifficulty(score, difficulty) {
  return score.difficulty === difficulty || (!score.difficulty && difficulty === 'hard');
}

export class Score {
  static async create(player, score, difficulty = 'hard', date, testNumber = null) {
    const insertDate = date || new Date().toISOString();
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        'INSERT INTO scores (player, score, difficulty, date, test_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [player, score, difficulty, insertDate, testNumber],
      );
      return result.rows[0];
    }
    const newScore = {
      id: memoryScores.length + 1,
      player,
      score: Number(score),
      difficulty,
      test_id: testNumber,
      date: insertDate,
    };
    memoryScores.push(newScore);
    return newScore;
  }

  static async getTopTestScores(testNumber, limit = 100) {
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        'SELECT player as username, MAX(score) as score, MAX(date) as created_at FROM scores WHERE test_id = $1 GROUP BY player ORDER BY score DESC LIMIT $2',
        [testNumber, limit],
      );
      return result.rows;
    }
    return bestScorePerPlayer(
      memoryScores.filter((s) => s.test_id === testNumber),
      limit,
    );
  }

  static async getTopScores(limit = 100, type = 'monthly', difficulty = 'hard') {
    if (isDatabaseEnabled()) {
      const monthFilter = type === 'monthly' ? "date >= date_trunc('month', CURRENT_DATE) AND " : '';
      const result = await pool.query(
        `SELECT player as username, MAX(score) as score, MAX(date) as created_at FROM scores WHERE ${monthFilter}difficulty = $2 AND test_id IS NULL GROUP BY player ORDER BY score DESC LIMIT $1`,
        [limit, difficulty],
      );
      return result.rows;
    }

    const now = new Date();
    const filtered = memoryScores.filter((s) => {
      if (s.test_id != null || !matchesDifficulty(s, difficulty)) return false;
      if (type !== 'monthly') return true;
      const scoreDate = new Date(s.date);
      return (
        scoreDate.getMonth() === now.getMonth() &&
        scoreDate.getFullYear() === now.getFullYear()
      );
    });
    return bestScorePerPlayer(filtered, limit);
  }

  static async getTotalScoreByPlayer(player) {
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        'SELECT SUM(score) as total_score FROM scores WHERE player = $1',
        [player],
      );
      return Number(result.rows[0]?.total_score || 0);
    }
    return memoryScores
      .filter((s) => s.player === player)
      .reduce((sum, s) => sum + s.score, 0);
  }
}
