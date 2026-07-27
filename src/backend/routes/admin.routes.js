import express from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/districts', authenticateToken, AdminController.getDistricts);
router.post('/districts', authenticateToken, AdminController.saveDistrict);
router.delete('/districts/:cityKey/:id', authenticateToken, AdminController.deleteDistrict);

export default router;
