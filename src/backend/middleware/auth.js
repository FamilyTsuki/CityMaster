import jwt from 'jsonwebtoken';
import { User, isUserAdmin } from '../models/User.js';
import { isDatabasePending } from '../config/database.js';

/**
 * Extrait le jeton JWT de l'en-tête Authorization.
 * Le paramètre ?token= n'est accepté que pour les flux SSE (GET .../stream),
 * car EventSource ne permet pas d'envoyer d'en-tête ; partout ailleurs il
 * finirait dans les journaux et l'historique du navigateur.
 */
function extractToken(req) {
  const authHeader = req.headers['authorization'];
  const headerToken = authHeader && authHeader.split(' ')[1];
  if (headerToken) return headerToken;
  if (req.method === 'GET' && req.path.endsWith('/stream') && typeof req.query?.token === 'string') {
    return req.query.token;
  }
  return null;
}

export const authenticateToken = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server security configuration error' });
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * Authentification facultative : renseigne req.user si un jeton valide est fourni.
 */
export const optionalAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token || !process.env.JWT_SECRET) return next();
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (!err && user) req.user = user;
    next();
  });
};

/**
 * Refuse temporairement (503) les routes qui lisent ou écrivent des comptes ou
 * des données d'administration tant que PostgreSQL est attendu mais pas encore
 * joignable (voir isDatabasePending).
 */
export const requireAccountStorage = (req, res, next) => {
  if (isDatabasePending()) {
    res.set('Retry-After', '10');
    return res
      .status(503)
      .json({ error: 'Service momentanément indisponible, réessayez dans quelques secondes.' });
  }
  next();
};

/**
 * Réservé aux administrateurs. Les droits sont relus dans le stockage des
 * comptes (et non dans le jeton) : un administrateur retiré perd l'accès
 * immédiatement. Les sessions invité ne sont jamais administrateur.
 */
export const requireAdmin = (req, res, next) => {
  authenticateToken(req, res, () => requireAccountStorage(req, res, async () => {
    if (!req.user || req.user.is_guest || !req.user.id) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      const dbUser = await User.findForSession(req.user);
      if (dbUser && isUserAdmin(dbUser)) {
        req.user.is_admin = true;
        return next();
      }
      return res.status(403).json({ error: 'Admin access required' });
    } catch (err) {
      console.error('Error checking admin status:', err);
      return res.status(500).json({ error: 'Unable to verify admin access' });
    }
  }));
};
