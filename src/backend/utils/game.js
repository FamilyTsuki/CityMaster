import crypto from 'crypto';
import * as turf from '@turf/turf';

const TOKEN_VERSION = 'v2';
const TOKEN_ALGORITHM = 'aes-256-gcm';

function deriveTokenKey(secret) {
  return crypto.createHash('sha256').update(`citymaster-game-token:${secret}`).digest();
}

/**
 * Chiffre l'état d'une partie dans un jeton opaque renvoyé au client.
 * AES-256-GCM authentifie le contenu : toute modification du jeton est détectée.
 * @param {object} session
 * @param {string} secret
 * @returns {string}
 */
export function encryptGameToken(session, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(TOKEN_ALGORITHM, deriveTokenKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [TOKEN_VERSION, iv, tag, encrypted]
    .map((part) => (typeof part === 'string' ? part : part.toString('base64url')))
    .join('.');
}

/**
 * Déchiffre un jeton produit par encryptGameToken.
 * @param {unknown} token
 * @param {string} secret
 * @returns {object} L'état de la partie.
 * @throws {Error} Si le jeton est absent, mal formé, modifié ou signé avec un autre secret.
 */
export function decryptGameToken(token, secret) {
  if (typeof token !== 'string') throw new Error('Game token must be a string');
  const [version, iv, tag, encrypted] = token.split('.');
  if (version !== TOKEN_VERSION || !iv || !tag || !encrypted) {
    throw new Error('Unsupported game token format');
  }
  const decipher = crypto.createDecipheriv(
    TOKEN_ALGORITHM,
    deriveTokenKey(secret),
    Buffer.from(iv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

export function getDistanceToStreet(latitude, longitude, geometry) {
  try {
    const point = turf.point([longitude, latitude]);
    const type = geometry.type;
    const targetFeature = turf.feature(geometry);

    if (type === 'Polygon' || type === 'MultiPolygon') {
      if (turf.booleanPointInPolygon(point, targetFeature)) {
        return 0;
      }
      const lines = turf.polygonToLine(targetFeature);
      const nearest = turf.nearestPointOnLine(lines, point);
      return turf.distance(point, nearest, { units: 'meters' });
    } else if (type === 'Point') {
      return turf.distance(point, targetFeature, { units: 'meters' });
    } else {
      const nearest = turf.nearestPointOnLine(targetFeature, point);
      return turf.distance(point, nearest, { units: 'meters' });
    }
  } catch (error) {
    console.error('Error calculating distance:', error);
    return null;
  }
}
