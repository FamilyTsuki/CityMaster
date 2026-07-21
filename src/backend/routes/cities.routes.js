import express from 'express';
import { CityController } from '../controllers/CityController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticateToken, CityController.getCities);
router.post('/generate', authenticateToken, CityController.generateCity);

export default router;
