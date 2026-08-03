import { Score } from '../models/Score.js';

export class ScoreController {
  static async getLeaderboard(req, res) {
    try {
      const type = req.query.type === 'all_time' ? 'all_time' : 'monthly';
      const difficulty = req.query.difficulty || 'hard';
      const scores = await Score.getTopScores(100, type, difficulty);
      res.json(scores);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async postScore(req, res) {
    try {
      const { score, difficulty } = req.body;
      if (score === undefined) {
        return res.status(400).json({ error: 'Score is required' });
      }

      const parsedScore = Number(score);
      if (!Number.isInteger(parsedScore) || parsedScore < 0) {
        return res.status(400).json({ error: 'Score must be a non-negative integer' });
      }

      const username = req.user.username;
      const newScore = await Score.create(username, parsedScore, difficulty || 'hard');
      res.status(201).json(newScore);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
