import express from 'express';
import { GameController } from '../controllers/GameController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/start', authenticateToken, GameController.startGame);
router.post('/submit-round', authenticateToken, GameController.submitRound);

export default router;
