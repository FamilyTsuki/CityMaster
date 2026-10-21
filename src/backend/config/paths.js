import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Chemins des fichiers lus et écrits par le serveur.
 *
 * Tout est résolu depuis la racine du projet (et non depuis process.cwd()),
 * pour que le serveur se comporte de la même façon quel que soit le dossier
 * depuis lequel il est lancé.
 *
 * Deux variables d'environnement permettent de rediriger les données
 * modifiables vers un autre dossier (utilisées par les tests) :
 * - CITYMASTER_DATA_DIR  : données de carte (villes générées, personnalisations admin)
 * - CITYMASTER_STATE_DIR : état local du serveur (comptes du mode local, villes découvertes)
 */
const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(currentDir, '..', '..', '..');
export const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
export const CONFIG_DIR = path.join(ROOT_DIR, 'config');
export const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');

export const DATA_DIR = process.env.CITYMASTER_DATA_DIR
  ? path.resolve(process.env.CITYMASTER_DATA_DIR)
  : path.join(PUBLIC_DIR, 'assets', 'data');

export const STATE_DIR = process.env.CITYMASTER_STATE_DIR
  ? path.resolve(process.env.CITYMASTER_STATE_DIR)
  : CONFIG_DIR;

export const BASE_CITIES_FILE = path.join(CONFIG_DIR, 'cities.json');
export const CUSTOM_CITIES_FILE = path.join(STATE_DIR, 'custom_cities.json');
export const USERS_FILE = path.join(STATE_DIR, 'users.json');

export const CUSTOM_DISTRICTS_FILE = path.join(DATA_DIR, 'custom_districts.json');
export const CUSTOM_ROUTES_FILE = path.join(DATA_DIR, 'custom_routes.json');
export const DIFFICULTY_OVERRIDES_FILE = path.join(DATA_DIR, 'difficulty_overrides.json');
export const GLOBAL_SETTINGS_FILE = path.join(DATA_DIR, 'global_settings.json');

const CITY_KEY_PATTERN = /^[a-z0-9_]+$/;

/**
 * Indique si une clé de ville est sûre pour construire un nom de fichier.
 * @param {unknown} cityKey
 * @returns {boolean}
 */
export function isValidCityKey(cityKey) {
  return typeof cityKey === 'string' && CITY_KEY_PATTERN.test(cityKey);
}

/**
 * Chemin du fichier GeoJSON généré pour une ville.
 * @param {string} cityKey
 * @returns {string}
 */
export function cityDataFile(cityKey) {
  if (!isValidCityKey(cityKey)) {
    throw new Error(`Invalid city key: ${cityKey}`);
  }
  return path.join(DATA_DIR, `${cityKey}.json`);
}
