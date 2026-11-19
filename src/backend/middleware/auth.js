import jwt from 'jsonwebtoken';
import { User, ZONE_ROLES } from '../models/User.js';
import { StaffService } from '../services/StaffService.js';
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
 * Communes visées par la requête : chemin (:cityKey ou :key), paramètres et corps.
 * @returns {unknown[]}
 */
function requestedCityKeys(req) {
  return [req.params?.cityKey, req.params?.key, req.query?.cityKey, req.body?.cityKey].filter(
    (value) => value !== undefined && value !== null && value !== '',
  );
}

/**
 * Réserve une route à certains rôles ; les administrateurs passent toujours.
 * Les droits sont relus dans le stockage des comptes (et non dans le jeton) :
 * un rôle retiré prend effet immédiatement. Les invités n'ont aucun rôle.
 *
 * Avec `zone: true`, la requête doit citer au moins une commune, et chaque
 * commune citée doit être dans la zone du compte (un administrateur n'a pas
 * de limite). Sans `zone`, le contrôleur filtre lui-même avec req.access.cities.
 *
 * Renseigne req.access = { role, cities, isAdmin }.
 *
 * @param {string[]} roles Rôles admis en plus de admin.
 * @param {{ zone?: boolean }} [options]
 */
export const requireRole = (roles, { zone = false } = {}) => (req, res, next) => {
  const denied = () => res.status(403).json({ error: 'Access denied' });
  authenticateToken(req, res, () => requireAccountStorage(req, res, async () => {
    if (!req.user || req.user.is_guest || !req.user.id) return denied();
    try {
      const dbUser = await User.findForSession(req.user);
      if (!dbUser) return denied();
      const access = await StaffService.getAccess(dbUser);
      const isAdmin = access.role === 'admin';
      if (!isAdmin && !roles.includes(access.role)) return denied();
      if (zone && !isAdmin) {
        const cityKeys = requestedCityKeys(req);
        if (cityKeys.length === 0 || cityKeys.some((value) => typeof value !== 'string')) return denied();
        const allowed = new Set(access.cities.map((c) => c.key));
        if (!cityKeys.every((value) => allowed.has(value))) return denied();
      }
      req.user.is_admin = isAdmin;
      req.access = { ...access, isAdmin };
      return next();
    } catch (err) {
      console.error('Error checking access rights:', err);
      return res.status(500).json({ error: 'Unable to verify access rights' });
    }
  }));
};

/** Réservé aux administrateurs. */
export const requireAdmin = requireRole([]);

/** Correction de la carte d'une commune : administrateurs, modérateurs et super-modérateurs de la commune. */
export const requireCityEditor = requireRole(ZONE_ROLES, { zone: true });

/** Validation d'une commune : administrateurs et super-modérateurs de la commune. */
export const requireCityValidator = requireRole(['super_moderator'], { zone: true });

/** Signalements : administrateurs, modérateurs et super-modérateurs (filtrés par zone dans le contrôleur). */
export const requireReportReviewer = requireRole(ZONE_ROLES);
