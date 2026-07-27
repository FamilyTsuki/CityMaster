import pool from '../config/database.js';

const memoryScores = [];

export class Score {
  static async create(player, score, date) {
    const insertDate = date || new Date().toISOString();
    try {
      const result = await pool.query(
        'INSERT INTO scores (player, score, date) VALUES ($1, $2, $3) RETURNING *',
        [player, score, insertDate]
      );
      return result.rows[0];
    } catch (err) {
      const newScore = {
        id: memoryScores.length + 1,
        player,
        score: Number(score),
        date: insertDate,
        username: player,
        created_at: insertDate
      };
      memoryScores.push(newScore);
      return newScore;
    }
  }

  static async getTopScores(limit = 100) {
    try {
      const result = await pool.query(
        'SELECT id, player as username, score, date as created_at FROM scores ORDER BY score DESC LIMIT $1',
        [limit]
      );
      return result.rows;
    } catch (err) {
      return [...memoryScores]
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);
    }
  }

  static async getTotalScoreByPlayer(player) {
    try {
      const result = await pool.query(
        'SELECT SUM(score) as total_score FROM scores WHERE player = $1',
        [player]
      );
      return Number(result.rows[0]?.total_score || 0);
    } catch (err) {
      return memoryScores
        .filter(s => s.player === player)
        .reduce((sum, s) => sum + s.score, 0);
    }
  }
}
