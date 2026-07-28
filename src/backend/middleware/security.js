import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const configureHelmet = () => helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://accounts.google.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://accounts.google.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.cartocdn.com", "https://*.tile.openstreetmap.org", "https://*.openstreetmap.org", "https://server.arcgisonline.com", "https://*.arcgisonline.com", "https://unpkg.com", "https://*.googleusercontent.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://fonts.googleapis.com"],
      connectSrc: ["'self'", "https://*.cartocdn.com", "https://*.tile.openstreetmap.org", "https://*.openstreetmap.org", "https://overpass-api.de", "https://unpkg.com", "https://cdn.jsdelivr.net", "https://server.arcgisonline.com", "https://*.arcgisonline.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://accounts.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  frameguard: { action: 'deny' },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' }
});

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded. Please slow down your requests.' }
});
