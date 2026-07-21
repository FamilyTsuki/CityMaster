import express from 'express';
import { OverpassController } from '../controllers/OverpassController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, OverpassController.proxyQuery);

export default router;
