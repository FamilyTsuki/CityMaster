import fs from 'fs/promises';
import path from 'path';

/**
 * Réponse Express minimale pour appeler un contrôleur directement.
 */
export function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    set(name, value) {
      this.headers[name.toLowerCase()] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
}

/**
 * Écrit un fichier JSON dans le dossier de données temporaire des tests.
 */
export async function writeDataFile(fileName, data) {
  const filePath = path.join(process.env.CITYMASTER_DATA_DIR, fileName);
  await fs.writeFile(filePath, JSON.stringify(data), 'utf8');
  return filePath;
}

export async function readDataFile(fileName) {
  const filePath = path.join(process.env.CITYMASTER_DATA_DIR, fileName);
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function removeDataFile(fileName) {
  await fs.rm(path.join(process.env.CITYMASTER_DATA_DIR, fileName), { force: true });
}

/**
 * Rue rectiligne orientée est-ouest d'environ `lengthMeters` mètres.
 */
export function makeStreet(name, { lengthMeters = 300, lat = 47.9, lng = 1.9, ...properties } = {}) {
  const deltaLng = lengthMeters / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    type: 'Feature',
    properties: { name, highway: 'residential', ...properties },
    geometry: {
      type: 'LineString',
      coordinates: [
        [lng, lat],
        [lng + deltaLng, lat],
      ],
    },
  };
}

/**
 * Ville de test : `count` rues courtes (difficiles) dont les noms sont uniques.
 */
export function makeCity(extraStreets = [], count = 10) {
  const streets = Array.from({ length: count }, (_, i) =>
    makeStreet(`Rue du Test ${i + 1}`, { lengthMeters: 120, lat: 47.9 + i * 0.002 }),
  );
  return { type: 'FeatureCollection', features: [...streets, ...extraStreets] };
}
