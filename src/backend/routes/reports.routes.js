import express from 'express';
import { ReportController } from '../controllers/ReportController.js';
import { optionalAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/', optionalAuth, ReportController.createReport);
router.get('/', requireAdmin, ReportController.getReports);
router.patch('/:id/status', requireAdmin, ReportController.updateReportStatus);
router.delete('/:id', requireAdmin, ReportController.deleteReport);

export default router;
