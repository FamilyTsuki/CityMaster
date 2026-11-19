import express from 'express';
import { ReportController } from '../controllers/ReportController.js';
import { optionalAuth, requireAdmin, requireReportReviewer } from '../middleware/auth.js';

const router = express.Router();

router.post('/', optionalAuth, ReportController.createReport);
router.get('/', requireReportReviewer, ReportController.getReports);
router.patch('/:id/status', requireReportReviewer, ReportController.updateReportStatus);
router.delete('/:id', requireAdmin, ReportController.deleteReport);

export default router;
