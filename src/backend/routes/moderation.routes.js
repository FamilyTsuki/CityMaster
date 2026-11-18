import express from 'express';
import { ModerationController } from '../controllers/ModerationController.js';
import { authenticateToken, requireAccountStorage, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/applications', authenticateToken, requireAccountStorage, ModerationController.apply);
router.get('/applications/mine', authenticateToken, requireAccountStorage, ModerationController.getMine);
router.get('/applications', requireAdmin, ModerationController.getAll);
router.patch('/applications/:id', requireAdmin, ModerationController.review);

export default router;
