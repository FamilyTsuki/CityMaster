import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

export const configureHelmet = () => helmet({
  contentSecurityPolicy: false, // On désactive CSP pour ne pas bloquer Leaflet/Mapillary
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Permet de charger des images Mapillary et tuiles Leaflet
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false
});

// Limiteur de requêtes pour contrer la force brute sur les connexions
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limite chaque IP à 10 requêtes par fenêtre de 15 minutes
  message: { error: 'Trop de tentatives de connexion, veuillez réessayer plus tard.' }
});

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limite globale plus permissive
});
