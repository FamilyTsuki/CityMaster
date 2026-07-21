import express from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { loginRateLimiter } from '../middleware/security.js';

const router = express.Router();

router.post('/register', loginRateLimiter, AuthController.register);
router.post('/login', loginRateLimiter, AuthController.login);

export default router;
