import express from 'express';
import { ScoreController } from '../controllers/ScoreController.js';

const router = express.Router();

// Les scores ne sont jamais envoyés par le client : le serveur les enregistre
// lui-même à la fin de chaque partie (GameController.submitRound).
router.get('/', ScoreController.getLeaderboard);
router.get('/test/:testNumber', ScoreController.getTestLeaderboard);

export default router;
