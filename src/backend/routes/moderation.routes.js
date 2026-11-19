import express from 'express';
import { ModerationController } from '../controllers/ModerationController.js';
import { authenticateToken, requireAccountStorage, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/applications', authenticateToken, requireAccountStorage, ModerationController.apply);
router.get('/applications/mine', authenticateToken, requireAccountStorage, ModerationController.getMine);
router.get('/applications', requireAdmin, ModerationController.getAll);
router.patch('/applications/:id', requireAdmin, ModerationController.review);

router.get('/staff', requireAdmin, ModerationController.getStaff);
router.patch('/staff/:username/role', requireAdmin, ModerationController.setRole);
router.post('/staff/:username/cities', requireAdmin, ModerationController.grantCity);
router.delete('/staff/:username/cities/:cityKey', requireAdmin, ModerationController.revokeCity);

export default router;
