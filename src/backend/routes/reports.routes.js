import express from 'express';
import jwt from 'jsonwebtoken';
import { ReportController } from '../controllers/ReportController.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token && process.env.JWT_SECRET) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (!err && user) {
        req.user = user;
      }
      next();
    });
  } else {
    next();
  }
};

router.post('/', optionalAuth, ReportController.createReport);
router.get('/', requireAdmin, ReportController.getReports);
router.patch('/:id/status', requireAdmin, ReportController.updateReportStatus);
router.delete('/:id', requireAdmin, ReportController.deleteReport);

export default router;
