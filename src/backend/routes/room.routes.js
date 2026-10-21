import express from 'express';
import { RoomController } from '../controllers/RoomController.js';
import { authenticateToken } from '../middleware/auth.js';
import { roomRateLimiter } from '../middleware/security.js';
import { isDatabaseEnabled } from '../config/database.js';

const router = express.Router();

router.use(roomRateLimiter);
router.use(authenticateToken);
router.use((req, res, next) => {
  if (!isDatabaseEnabled()) {
    return res
      .status(503)
      .json({ error: 'Les salons multijoueurs nécessitent PostgreSQL.' });
  }
  next();
});

router.post('/', RoomController.createRoom);
router.post('/:code/join', RoomController.joinRoom);
router.get('/:code/stream', RoomController.streamRoom);
router.get('/:code', RoomController.getRoom);
router.post('/:code/start', RoomController.startRoomGame);
router.post('/:code/submit-score', RoomController.submitRoomScore);
router.post('/:code/reset', RoomController.resetRoom);

export default router;
