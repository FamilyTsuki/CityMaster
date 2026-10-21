import express from 'express';
import { AuthController } from '../controllers/AuthController.js';
import { loginRateLimiter } from '../middleware/security.js';
import { requireAccountStorage } from '../middleware/auth.js';

const router = express.Router();

router.get('/config', (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null });
});

router.post('/register', requireAccountStorage, loginRateLimiter, AuthController.register);
router.post('/login', requireAccountStorage, loginRateLimiter, AuthController.login);
router.post('/google', requireAccountStorage, loginRateLimiter, AuthController.googleLogin);
router.post('/guest', requireAccountStorage, loginRateLimiter, AuthController.guestLogin);
router.post('/auth/guest', requireAccountStorage, loginRateLimiter, AuthController.guestLogin);

export default router;
