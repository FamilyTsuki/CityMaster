import crypto from 'crypto';
import * as turf from '@turf/turf';

const ALGORITHM = 'aes-256-cbc';

export function encrypt(text, secret) {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text, secret) {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift(), 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const key = crypto.createHash('sha256').update(secret).digest();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function getDistanceToStreet(latitude, longitude, lineGeoJSON) {
  const point = turf.point([longitude, latitude]);
  const nearest = turf.nearestPointOnLine(lineGeoJSON, point);
  return turf.distance(point, nearest, { units: 'meters' });
}
