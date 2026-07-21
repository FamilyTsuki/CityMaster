import express from 'express';
import { ScoreController } from '../controllers/ScoreController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', ScoreController.getLeaderboard);

export default router;
