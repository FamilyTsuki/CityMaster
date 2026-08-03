import express from 'express';
import { ScoreController } from '../controllers/ScoreController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', ScoreController.getLeaderboard);
router.get('/test/:testNumber', ScoreController.getTestLeaderboard);

export default router;
