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
 * Calcule la longueur géodésique d'une voie en mètres (avec turf ou calcul haversine).
 */
export function getFeatureLengthMeters(feature) {
  if (typeof turf !== 'undefined' && turf.length) {
    try {
      return turf.length(feature, { units: 'meters' });
    } catch (e) {}
  }
  try {
    const geom = feature.geometry;
    if (!geom) return 0;
    const coordsList =
      geom.type === 'LineString'
        ? [geom.coordinates]
        : geom.type === 'MultiLineString'
          ? geom.coordinates
          : [];
    let totalMeters = 0;
    for (const coords of coordsList) {
      for (let i = 0; i < coords.length - 1; i++) {
        const [lon1, lat1] = coords[i];
        const [lon2, lat2] = coords[i + 1];
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        totalMeters += 6371000 * c;
      }
    }
    return totalMeters;
  } catch (e) {
    return 0;
  }
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
    const isMinorKeyword =
      !isCourMajor &&
      MINOR_WAY_KEYWORDS.some((kw) => {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(cleanName) || regex.test(nameLower);
      });

    if (isMinorKeyword || highway === 'living_street') {
      return 'hard';
    }

    const lengthMeters = getFeatureLengthMeters(feature);

    const firstWord = cleanName.split(/[\s'-]+/)[0];
    const isMajorToponym = MAJOR_TOPONYMS.includes(firstWord) || isCourMajor;
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
      if (opts.centroids && opts.centroids[opts.index] && typeof turf !== 'undefined' && turf.distance) {
        let nearCount = 0;
        const currentCentroid = opts.centroids[opts.index];
        for (let j = 0; j < opts.centroids.length; j++) {
          if (opts.index === j || !opts.centroids[j]) continue;
          try {
            const dist = turf.distance(currentCentroid, opts.centroids[j], {
              units: 'meters',
            });
            if (dist <= 200) nearCount++;
          } catch (e) {}
        }
        inCenter = nearCount >= 4;
      } else if (lat != null && lng != null) {
        try {
          let distKm = 2.0;
          if (typeof turf !== 'undefined' && turf.centroid && turf.distance) {
            const routeCentroid = turf.centroid(feature);
            const [cLng, cLat] = routeCentroid.geometry.coordinates;
            distKm = turf.distance(
              turf.point([lng, lat]),
              turf.point([cLng, cLat]),
              { units: 'kilometers' },
            );
          }
          inCenter = distKm <= 1.5;
        } catch (e) {}
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

    if (lat != null && lng != null) {
      try {
        let distKm = 2.0;
        if (typeof turf !== 'undefined' && turf.centroid && turf.distance) {
          const routeCentroid = turf.centroid(feature);
          const [cLng, cLat] = routeCentroid.geometry.coordinates;
          distKm = turf.distance(
            turf.point([lng, lat]),
            turf.point([cLng, cLat]),
            { units: 'kilometers' },
          );
        }

        if (distKm <= 1.5) {
          if (lengthMeters >= 350) return 'medium';
          if (lengthMeters > 0 && lengthMeters < 250) return 'hard';
          return 'medium';
        } else if (distKm <= 3.5) {
          return 'medium';
        } else {
          return 'hard';
        }
      } catch (e) {}
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
