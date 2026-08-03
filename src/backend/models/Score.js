import pool from '../config/database.js';

const memoryScores = [];

export class Score {
  static async create(player, score, difficulty = 'hard', date) {
    const insertDate = date || new Date().toISOString();
    try {
      const result = await pool.query(
        'INSERT INTO scores (player, score, difficulty, date) VALUES ($1, $2, $3, $4) RETURNING *',
        [player, score, difficulty, insertDate]
      );
      return result.rows[0];
    } catch (err) {
      const newScore = {
        id: memoryScores.length + 1,
        player,
        score: Number(score),
        difficulty,
        date: insertDate,
        username: player,
        created_at: insertDate
      };
      memoryScores.push(newScore);
      return newScore;
    }
  }

  static async getTopScores(limit = 100, type = 'monthly', difficulty = 'hard') {
    try {
      let query = 'SELECT id, player as username, score, difficulty, date as created_at FROM scores WHERE difficulty = $2 ORDER BY score DESC LIMIT $1';
      if (type === 'monthly') {
        query = 'SELECT id, player as username, score, difficulty, date as created_at FROM scores WHERE date >= date_trunc(\'month\', CURRENT_DATE) AND difficulty = $2 ORDER BY score DESC LIMIT $1';
      }
      
      const result = await pool.query(query, [limit, difficulty]);
      return result.rows;
    } catch (err) {
      if (type === 'monthly') {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        return [...memoryScores]
          .filter(s => {
            const scoreDate = new Date(s.date);
            return scoreDate.getMonth() === currentMonth && scoreDate.getFullYear() === currentYear && (s.difficulty === difficulty || (!s.difficulty && difficulty === 'hard'));
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, limit);
      }
      
      return [...memoryScores]
        .filter(s => s.difficulty === difficulty || (!s.difficulty && difficulty === 'hard'))
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
