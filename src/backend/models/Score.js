import pool from '../config/database.js';

export class Score {
  static async create(player, score, date) {
    const insertDate = date || new Date().toISOString();
    const result = await pool.query(
      'INSERT INTO scores (player, score, date) VALUES ($1, $2, $3) RETURNING *',
      [player, score, insertDate]
    );
    return result.rows[0];
  }

  static async getTopScores(limit = 100) {
    const result = await pool.query(
      'SELECT * FROM scores ORDER BY score DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  static async getTotalScoreByPlayer(player) {
    const result = await pool.query(
      'SELECT SUM(score) as total_score FROM scores WHERE player = $1',
      [player]
    );
    return result.rows[0]?.total_score || 0;
  }
}
