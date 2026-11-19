import express from 'express';
import { EditController } from '../controllers/EditController.js';
import { requireAdmin, requireRole } from '../middleware/auth.js';
import { ZONE_ROLES } from '../models/User.js';

const router = express.Router();

// Le contrôleur filtre par zone : un modérateur ne voit que ses propositions,
// un super-modérateur celles de ses communes, l'administrateur toutes.
router.get('/proposals', requireRole(ZONE_ROLES), EditController.listProposals);
router.get('/proposals/:id', requireRole(ZONE_ROLES), EditController.getProposal);
router.post('/proposals/:id/accept', requireRole(['super_moderator']), EditController.acceptProposal);
router.post('/proposals/:id/reject', requireRole(['super_moderator']), EditController.rejectProposal);

router.get('/history', requireAdmin, EditController.listHistory);
router.post('/history/:id/undo', requireAdmin, EditController.undo);

export default router;
