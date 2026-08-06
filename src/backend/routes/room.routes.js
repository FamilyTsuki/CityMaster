import express from 'express';
import { RoomController } from '../controllers/RoomController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/', RoomController.createRoom);
router.post('/:code/join', RoomController.joinRoom);
router.get('/:code', RoomController.getRoom);
router.post('/:code/start', RoomController.startRoomGame);
router.post('/:code/submit-score', RoomController.submitRoomScore);

export default router;
