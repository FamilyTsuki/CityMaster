import express from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/districts', requireAdmin, AdminController.getDistricts);
router.post('/districts', requireAdmin, AdminController.saveDistrict);
router.delete('/districts/:cityKey/:id', requireAdmin, AdminController.deleteDistrict);

export default router;
