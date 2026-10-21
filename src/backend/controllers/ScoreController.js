import { Score } from '../models/Score.js';
import { GAME_DIFFICULTIES } from '../../services/ScoringService.js';

export class ScoreController {
  static async getLeaderboard(req, res) {
    try {
      const type = req.query.type === 'all_time' ? 'all_time' : 'monthly';
      const difficulty = GAME_DIFFICULTIES.includes(req.query.difficulty)
        ? req.query.difficulty
        : 'hard';
      const scores = await Score.getTopScores(100, type, difficulty);
      res.json(scores);
    } catch (error) {
      console.error('ScoreController getLeaderboard error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getTestLeaderboard(req, res) {
    try {
      const testNumber = parseInt(req.params.testNumber, 10);
      if (!Number.isInteger(testNumber) || testNumber <= 0) {
        return res.status(400).json({ error: 'Invalid test number' });
      }
      const scores = await Score.getTopTestScores(testNumber, 100);
      res.json(scores);
    } catch (error) {
      console.error('ScoreController getTestLeaderboard error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
