import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const configureHelmet = () => helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion, veuillez réessayer plus tard.' }
});

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
});
