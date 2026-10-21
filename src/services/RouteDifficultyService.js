export const MINOR_WAY_KEYWORDS = [
  'chemin',
  'chemins',
  'sentier',
  'sentiers',
  'ruelle',
  'ruelles',
  'passage',
  'passages',
  'allée',
  'allées',
  'impasse',
  'impasses',
  'traverse',
  'traverses',
  'chemain',
  'cour',
  'villa',
  'villas',
  'cité',
  'cités',
  'square',
  'squares',
];

export const MAJOR_WAY_TYPES = [
  'primary',
  'secondary',
  'trunk',
  'motorway',
  'tertiary',
];

export const MAJOR_TOPONYMS = [
  'boulevard',
  'boulevards',
  'bd',
  'avenue',
  'avenues',
  'av',
  'mail',
  'mails',
  'quai',
  'quais',
  'pont',
  'ponts',
  'cours',
  'faubourg',
  'faubourgs',
  'fg',
  'promenade',
  'promenades',
  'rocade',
  'rocades',
  'chaussée',
  'chaussées',
  'route',
  'routes',
  'esplanade',
  'parvis',
];

/**
 * Les calculs géographiques ci-dessous reprennent les formules de Turf.js
 * (même rayon terrestre, même définition du centroïde) sans dépendre de la
 * variable globale `turf`, qui n'existe que dans le navigateur. Le serveur
 * et le client classent ainsi les rues exactement de la même façon.
 */
const EARTH_RADIUS_METERS = 6371008.8;
const CENTER_RADIUS_METERS = 200;
const CENTER_MIN_NEIGHBOURS = 4;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const stripAccents = (text) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Les noms sont comparés sans accents : les mots-clés le sont donc aussi
// (sinon « allée », « cité » ou « chaussée » ne seraient jamais reconnus).
const MINOR_WAY_PATTERN = new RegExp(
  `\\b(${[...new Set(MINOR_WAY_KEYWORDS.map(stripAccents))].join('|')})\\b`,
  'i',
);
const MAJOR_TOPONYMS_PLAIN = new Set(MAJOR_TOPONYMS.map(stripAccents));

/**
 * Distance haversine en mètres entre deux positions [lng, lat].
 * @param {number[]} from
 * @param {number[]} to
 * @returns {number}
 */
export function haversineMeters(from, to) {
  const dLat = toRadians(to[1] - from[1]);
  const dLon = toRadians(to[0] - from[0]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from[1])) * Math.cos(toRadians(to[1])) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Listes de positions qui forment les tracés d'une géométrie.
 * @returns {number[][][]}
 */
function getGeometryPaths(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return [];
  switch (geometry.type) {
    case 'LineString':
      return [geometry.coordinates];
    case 'MultiLineString':
    case 'Polygon':
      return geometry.coordinates;
    case 'MultiPolygon':
      return geometry.coordinates.flat();
    default:
      return [];
  }
}

/**
 * Longueur géodésique d'une voie en mètres (périmètre pour un polygone, 0 pour un point).
 * @param {object} feature GeoJSON Feature
 * @returns {number}
 */
export function getFeatureLengthMeters(feature) {
  let totalMeters = 0;
  for (const path of getGeometryPaths(feature?.geometry)) {
    for (let i = 0; i < path.length - 1; i++) {
      totalMeters += haversineMeters(path[i], path[i + 1]);
    }
  }
  return totalMeters;
}

/**
 * Centroïde [lng, lat] : moyenne des sommets (le point de fermeture des
 * anneaux de polygone n'est compté qu'une fois, comme turf.centroid).
 * @param {object} feature GeoJSON Feature
 * @returns {number[]|null}
 */
export function getFeatureCentroid(feature) {
  const geometry = feature?.geometry;
  if (!geometry) return null;
  if (geometry.type === 'Point') return geometry.coordinates;

  const isPolygon = geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';
  let sumLng = 0;
  let sumLat = 0;
  let count = 0;
  for (const path of getGeometryPaths(geometry)) {
    const end = isPolygon && path.length > 1 ? path.length - 1 : path.length;
    for (let i = 0; i < end; i++) {
      sumLng += path[i][0];
      sumLat += path[i][1];
      count++;
    }
  }
  return count > 0 ? [sumLng / count, sumLat / count] : null;
}

function toPosition(pointOrPosition) {
  if (Array.isArray(pointOrPosition)) return pointOrPosition;
  return pointOrPosition?.geometry?.coordinates || null;
}

/**
 * Pour chaque voie, nombre d'autres voies dont le centroïde est à moins de
 * `radiusMeters`. Une grille évite de comparer toutes les paires de voies.
 * @param {object[]} features
 * @param {number} [radiusMeters]
 * @returns {number[]}
 */
export function computeNeighbourCounts(features, radiusMeters = CENTER_RADIUS_METERS) {
  const centroids = features.map((f) => getFeatureCentroid(f));
  // Cellules au moins aussi larges que le rayon partout : un voisin est
  // toujours dans la même cellule ou dans une des 8 cellules adjacentes.
  const latStep = radiusMeters / 111000;
  const maxAbsLat = centroids.reduce((max, c) => (c ? Math.max(max, Math.abs(c[1])) : max), 0);
  const lngStep = latStep / Math.max(Math.cos(toRadians(maxAbsLat)), 0.01);
  const cells = new Map();
  const cellKey = (x, y) => `${x}:${y}`;
  const cellOf = (position) => [
    Math.floor(position[0] / lngStep),
    Math.floor(position[1] / latStep),
  ];

  centroids.forEach((position, index) => {
    if (!position) return;
    const [x, y] = cellOf(position);
    const key = cellKey(x, y);
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(index);
  });

  return centroids.map((position, index) => {
    if (!position) return 0;
    const [x, y] = cellOf(position);
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const other of cells.get(cellKey(x + dx, y + dy)) || []) {
          if (other !== index && haversineMeters(position, centroids[other]) <= radiusMeters) {
            count++;
          }
        }
      }
    }
    return count;
  });
}

/**
 * Service fournissant les calculs de difficulté pour les voies et quartiers.
 */
export class RouteDifficultyService {
  /**
   * Détermine le niveau de difficulté ('easy', 'medium', 'hard') pour une voie GeoJSON.
   * Combine la nomenclature toponymique, la hiérarchie routière et la longueur réelle
   * afin d'éviter qu'une ruelle médiévale courte soit erronément classée facile.
   * Supporte les modes 'length', 'nomenclature' et 'center' ainsi que les surcharges manuelles.
   * @param {object} feature GeoJSON Feature
   * @param {number|object} [cityCentroidLatOrOptions]
   * @param {number} [cityCentroidLng]
   * @param {object} [options]
   * @returns {'easy' | 'medium' | 'hard' | 'lotissement'}
   */
  static getRouteDifficulty(feature, cityCentroidLatOrOptions, cityCentroidLng, options = {}) {
    if (!feature || !feature.geometry) return 'medium';

    let lat = cityCentroidLatOrOptions;
    let lng = cityCentroidLng;
    let opts = options;

    if (typeof cityCentroidLatOrOptions === 'object' && cityCentroidLatOrOptions !== null) {
      opts = cityCentroidLatOrOptions;
      lat = opts.cityCentroidLat;
      lng = opts.cityCentroidLng;
    }

    const props = feature.properties || {};
    if (
      (props.isCustom && props.isLotissement) ||
      props.difficulty === 'lotissement' ||
      props.itemType === 'lotissement'
    ) {
      return 'lotissement';
    }

    if (feature.geometry.type === 'Point') {
      return 'hard';
    }

    const name = (props.name || props.originalName || '').trim();
    const nameLower = name.toLowerCase().trim();
    const origNameLower = (props.originalName || '').toLowerCase().trim();
    const cleanName = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

    const overrides = opts.overrides || opts.difficultyOverrides;
    const manualDiff =
      (overrides && (overrides[nameLower] || (origNameLower && overrides[origNameLower]))) ||
      (props.difficulty && ['easy', 'medium', 'hard'].includes(props.difficulty)
        ? props.difficulty
        : null);

    if (manualDiff && ['easy', 'medium', 'hard'].includes(manualDiff)) {
      return manualDiff;
    }

    const highway = (props.highway || '').toLowerCase();
    const isCourMajor = /^cours\b/i.test(cleanName);
    const isMinorKeyword = !isCourMajor && MINOR_WAY_PATTERN.test(cleanName);

    if (isMinorKeyword || highway === 'living_street') {
      return 'hard';
    }

    const lengthMeters = getFeatureLengthMeters(feature);

    const firstWord = cleanName.split(/[\s'-]+/)[0];
    const isMajorToponym = MAJOR_TOPONYMS_PLAIN.has(firstWord) || isCourMajor;
    const isMajorHighway = ['motorway', 'trunk', 'primary', 'secondary'].includes(highway);

    const diffMode = opts.diffMode || 'length';

    if (diffMode === 'nomenclature') {
      if (isMajorToponym || isMajorHighway || lengthMeters >= 550) {
        return 'easy';
      }
      if (lengthMeters >= 250) {
        return 'medium';
      }
      return 'hard';
    }

    if (diffMode === 'center') {
      let inCenter = false;
      if (typeof opts.nearCount === 'number') {
        inCenter = opts.nearCount >= CENTER_MIN_NEIGHBOURS;
      } else if (opts.centroids && toPosition(opts.centroids[opts.index])) {
        const current = toPosition(opts.centroids[opts.index]);
        let nearCount = 0;
        opts.centroids.forEach((other, j) => {
          const position = toPosition(other);
          if (j !== opts.index && position && haversineMeters(current, position) <= CENTER_RADIUS_METERS) {
            nearCount++;
          }
        });
        inCenter = nearCount >= CENTER_MIN_NEIGHBOURS;
      } else if (lat != null && lng != null) {
        const centroid = getFeatureCentroid(feature);
        inCenter = Boolean(centroid) && haversineMeters([lng, lat], centroid) <= 1500;
      }

      if ((isMajorToponym || isMajorHighway) && lengthMeters >= 80) return 'easy';
      if (lengthMeters >= 550) return 'easy';
      if (inCenter && lengthMeters >= 350) return 'easy';
      if (lengthMeters >= 250) return 'medium';
      return 'hard';
    }

    // Mode par défaut: 'length'
    if (isMajorToponym || isMajorHighway) {
      if (lengthMeters >= 80) {
        return 'easy';
      }
      return 'medium';
    }

    if (lengthMeters >= 550) {
      return 'easy';
    }
    if (highway === 'tertiary' && lengthMeters >= 250) {
      return 'easy';
    }

    if (lengthMeters > 0 && lengthMeters < 200) {
      return 'hard';
    }

    const centroid = lat != null && lng != null ? getFeatureCentroid(feature) : null;
    if (centroid) {
      const distKm = haversineMeters([lng, lat], centroid) / 1000;
      if (distKm <= 1.5) {
        if (lengthMeters >= 350) return 'medium';
        if (lengthMeters > 0 && lengthMeters < 250) return 'hard';
        return 'medium';
      }
      return distKm <= 3.5 ? 'medium' : 'hard';
    }

    if (lengthMeters >= 300) {
      return 'medium';
    }
    return 'hard';
  }

  /**
   * Classifie un tableau de voies GeoJSON avec leur difficulté calculée.
   * @param {Array<object>} features
   * @param {number|object} [cityCentroidLat]
   * @param {number} [cityCentroidLng]
   * @param {object} [options]
   * @returns {Array<object>}
   */
  static classifyRoutes(features = [], cityCentroidLat, cityCentroidLng, options = {}) {
    return features.map((feature, index) => {
      const difficulty = this.getRouteDifficulty(
        feature,
        cityCentroidLat,
        cityCentroidLng,
        { ...options, index },
      );
      return {
        ...feature,
        properties: {
          ...feature.properties,
          difficulty,
        },
      };
    });
  }

  /**
   * Vérifie si une entité ou un nom correspond à une place, un square ou un parvis.
   * @param {object|string} featureOrName
   * @returns {boolean}
   */
  static isPlaceStreet(featureOrName) {
    return isPlaceStreet(featureOrName);
  }

  /**
   * Calcule la longueur d'une voie en mètres.
   * @param {object} feature
   * @returns {number}
   */
  static getFeatureLengthMeters(feature) {
    return getFeatureLengthMeters(feature);
  }

  /**
   * Voisinage de chaque voie pour le mode 'center' (voir computeNeighbourCounts).
   * @param {object[]} features
   * @returns {number[]}
   */
  static computeNeighbourCounts(features) {
    return computeNeighbourCounts(features);
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
