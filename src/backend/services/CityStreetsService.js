import { cityDataFile } from '../config/paths.js';
import { readJsonFile } from '../utils/jsonStore.js';
import { CityCustomization } from '../models/CityCustomization.js';
import { Settings } from '../models/Settings.js';
import { applyCityCustomizations } from '../../services/SpatialService.js';
import {
  RouteDifficultyService,
  getFeatureLengthMeters,
  isPlaceStreet,
} from '../../services/RouteDifficultyService.js';

export const MIN_STREET_LENGTH_METERS = 15;
const MIN_STREETS_PER_DIFFICULTY = 5;
const BASE_DIFFICULTIES = ['easy', 'medium', 'hard'];

function hasPlayableName(feature) {
  return typeof feature?.properties?.name === 'string' && feature.properties.name.trim().length > 0;
}

function isMicroSegment(feature) {
  if (!feature.geometry || feature.geometry.type === 'Point') return false;
  const length = getFeatureLengthMeters(feature);
  return length > 0 && length < MIN_STREET_LENGTH_METERS;
}

/**
 * Lit le fichier GeoJSON généré d'une ville.
 * @returns {Promise<object|null>} null si la ville n'a pas encore été générée.
 */
export async function loadCityGeoJSON(cityKey) {
  const geojson = await readJsonFile(cityDataFile(cityKey), null);
  if (!geojson || !Array.isArray(geojson.features)) return null;
  return geojson;
}

/**
 * Rues jouables d'une ville : une entrée par nom de rue, avec sa difficulté.
 * C'est la seule fonction qui décide quelles rues existent et dans quelle
 * difficulté elles tombent ; /api/game/start et /api/cities/:key/difficulties
 * l'utilisent toutes les deux pour rester cohérentes.
 *
 * @param {string} cityKey
 * @returns {Promise<{ streets: Array<{ feature: object, difficulty: string }>, disablePlaces: boolean } | null>}
 *   null si la ville n'a pas encore été générée.
 */
export async function getPlayableStreets(cityKey) {
  const geojson = await loadCityGeoJSON(cityKey);
  if (!geojson) return null;

  const [customDistricts, customRoutes, overrides, settings] = await Promise.all([
    CityCustomization.getDistricts(cityKey),
    CityCustomization.getRoutes(cityKey),
    CityCustomization.getDifficultyOverrides(cityKey),
    Settings.getGameSettings(),
  ]);

  const defaults = geojson.features.filter((f) => hasPlayableName(f) && !isMicroSegment(f));
  const candidates = applyCityCustomizations(defaults, customDistricts, customRoutes).filter(
    (f) => hasPlayableName(f) && f.geometry,
  );

  const neighbourCounts =
    settings.diffMode === 'center' ? RouteDifficultyService.computeNeighbourCounts(candidates) : null;

  const byName = new Map();
  candidates.forEach((feature, index) => {
    const nameKey = feature.properties.name.toLowerCase().trim();
    const existing = byName.get(nameKey);
    if (!existing) {
      byName.set(nameKey, {
        feature,
        difficulty: RouteDifficultyService.getRouteDifficulty(feature, {
          diffMode: settings.diffMode,
          overrides,
          nearCount: neighbourCounts ? neighbourCounts[index] : undefined,
        }),
      });
      return;
    }

    // Plusieurs tronçons portent le même nom : une difficulté explicite sur un
    // tronçon (rue personnalisée) l'emporte, sauf si un administrateur a déjà
    // forcé la difficulté de cette rue.
    const originalNameKey = (feature.properties.originalName || '').toLowerCase().trim();
    const hasOverride = overrides[nameKey] || (originalNameKey && overrides[originalNameKey]);
    const explicit = feature.properties.difficulty;
    if (!hasOverride && BASE_DIFFICULTIES.includes(explicit)) {
      existing.difficulty = explicit;
    }
  });

  let streets = [...byName.values()];
  if (settings.disablePlaces) {
    const withoutPlaces = streets.filter((s) => !isPlaceStreet(s.feature));
    if (withoutPlaces.length >= MIN_STREETS_PER_DIFFICULTY) {
      streets = withoutPlaces;
    }
  }

  return { streets, disablePlaces: settings.disablePlaces };
}

/**
 * Difficultés proposables pour une ville : celles qui ont au moins 5 rues.
 * @param {Array<{ difficulty: string }>} streets
 * @returns {string[]}
 */
export function getAvailableDifficulties(streets) {
  const counts = { easy: 0, medium: 0, hard: 0 };
  for (const street of streets) {
    if (counts[street.difficulty] !== undefined) counts[street.difficulty]++;
  }

  const available = BASE_DIFFICULTIES.filter((d) => counts[d] >= MIN_STREETS_PER_DIFFICULTY);
  if (available.length === 0 && streets.length > 0) {
    const [mostCommon, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    available.push(count > 0 ? mostCommon : 'hard');
  }
  return available;
}

/**
 * Tire `count` rues : d'abord celles de la difficulté demandée, puis des rues
 * de difficulté voisine si la ville n'en a pas assez.
 * @param {Array<{ feature: object, difficulty: string }>} streets
 * @param {string} difficulty
 * @param {number} count
 * @param {() => number} random Générateur dans [0, 1) (déterministe pour les salons).
 * @returns {Array<{ feature: object, difficulty: string }>}
 */
export function pickStreets(streets, difficulty, count, random) {
  const shuffle = (items) => {
    let current = items.length;
    while (current > 0) {
      const target = Math.floor(random() * current);
      current--;
      [items[current], items[target]] = [items[target], items[current]];
    }
    return items;
  };
  const ofDifficulty = (d) => streets.filter((s) => s.difficulty === d);

  const matching =
    difficulty === 'lotissement'
      ? streets.filter((s) => s.feature.properties.isCustom && s.feature.properties.isLotissement)
      : ofDifficulty(difficulty);

  const fallbackOrder = {
    easy: ['medium', 'hard'],
    hard: ['medium', 'easy'],
  }[difficulty] || ['easy', 'hard'];

  // Ordre d'appel du générateur inchangé depuis les versions précédentes
  // (rues de secours puis rues demandées) : un salon déjà créé garde le même tirage.
  const fallbacks = fallbackOrder.map((d) => shuffle(ofDifficulty(d)));
  const primary = shuffle(matching);
  return [...primary, ...fallbacks.flat()].slice(0, count);
}

/**
 * Générateur pseudo-aléatoire déterministe (mulberry32) : tous les joueurs
 * d'un salon reçoivent les mêmes rues dans le même ordre.
 * @param {number} seed
 * @returns {() => number}
 */
export function seededRandom(seed) {
  let state = seed;
  return () => {
    let t = (state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
