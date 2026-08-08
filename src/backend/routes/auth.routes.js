import express from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { loginRateLimiter } from '../middleware/security.js';

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

router.post('/register', loginRateLimiter, AuthController.register);
router.post('/login', loginRateLimiter, AuthController.login);
router.post('/google', loginRateLimiter, AuthController.googleLogin);
router.post('/guest', loginRateLimiter, AuthController.guestLogin);
router.post('/auth/guest', loginRateLimiter, AuthController.guestLogin);

export default router;
