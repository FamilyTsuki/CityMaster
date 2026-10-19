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

export function isPlaceStreet(featureOrName) {
  if (!featureOrName) return false;
  const name =
    typeof featureOrName === 'string'
      ? featureOrName
      : (featureOrName.properties?.name ||
         featureOrName.properties?.originalName ||
         '');
  if (!name || typeof name !== 'string') return false;

  const clean = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  const startsWithPlace =
    /^(place|places|placette|placettes|square|squares|pl\b|pl\.|esplanade|parvis)\b/i.test(
      clean,
    );

  if (typeof featureOrName === 'object' && featureOrName !== null) {
    const props = featureOrName.properties || {};
    if (
      props.place === 'square' ||
      props.itemType === 'place' ||
      props.itemType === 'square'
    ) {
      return true;
    }
  }

  return startsWithPlace;
}
