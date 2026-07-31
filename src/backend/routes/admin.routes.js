import express from 'express';
import { AdminController } from '../controllers/AdminController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/districts', requireAdmin, AdminController.getDistricts);
router.post('/districts', requireAdmin, AdminController.saveDistrict);
router.delete('/districts/:cityKey/:id', requireAdmin, AdminController.deleteDistrict);

router.get('/routes', requireAdmin, AdminController.getRoutes);
router.post('/routes', requireAdmin, AdminController.saveRoute);
router.delete('/routes/:cityKey/:id', requireAdmin, AdminController.deleteRoute);

router.get('/settings', requireAdmin, AdminController.getSettings);
router.post('/settings', requireAdmin, AdminController.saveSettings);

export default router;
