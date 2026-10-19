export class SpatialService {
  #turf;

  constructor() {
    this.#turf = window.turf;
  }

  calculateBuffer(lineGeoJSON, radiusMeters = 20) {
    if (!this.#turf) {
      throw new Error("Turf.js library is not loaded");
    }
    return this.#turf.buffer(lineGeoJSON, radiusMeters, { units: "meters" });
  }

  isPointInPolygon(latitude, longitude, polygonGeoJSON) {
    if (!this.#turf) {
      throw new Error("Turf.js library is not loaded");
    }
    const point = this.#turf.point([longitude, latitude]);
    try {
      return this.#turf.booleanPointInPolygon(point, polygonGeoJSON);
    } catch (e) {
      return false;
    }
  }

  getCenter(geojson) {
    if (!this.#turf) {
      throw new Error("Turf.js library is not loaded");
    }
    const center = this.#turf.center(geojson);
    return center.geometry.coordinates;
  }

  getNearestPoint(latitude, longitude, lineGeoJSON) {
    if (!this.#turf) {
      throw new Error("Turf.js library is not loaded");
    }
    const point = this.#turf.point([longitude, latitude]);

    const feature =
      lineGeoJSON.type === "Feature"
        ? lineGeoJSON
        : this.#turf.feature(lineGeoJSON);
    const type = feature.geometry ? feature.geometry.type : null;

    if (type === "Polygon" || type === "MultiPolygon") {
      try {
        if (this.#turf.booleanPointInPolygon(point, feature)) {
          return [latitude, longitude];
        }
        const lines = this.#turf.polygonToLine(feature);
        const nearest = this.#turf.nearestPointOnLine(lines, point);
        return [
          nearest.geometry.coordinates[1],
          nearest.geometry.coordinates[0],
        ];
      } catch (e) {
        console.error("Error in polygon distance calc", e);
      }
    }

    try {
      const nearest = this.#turf.nearestPointOnLine(feature, point);
      return [nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]];
    } catch (e) {
      try {
        const center = this.getCenter(feature);
        return [center[1], center[0]];
      } catch (err) {
        if (
          feature.geometry &&
          feature.geometry.coordinates &&
          feature.geometry.coordinates.length > 0
        ) {
          const firstCoords = feature.geometry.coordinates[0];
          if (
            Array.isArray(firstCoords) &&
            typeof firstCoords[0] === "number"
          ) {
            return [firstCoords[1], firstCoords[0]];
          }
        }
        return [latitude, longitude];
      }
    }
  }

  getDistanceToStreet(latitude, longitude, streetGeoJSON) {
    if (!this.#turf) {
      throw new Error("Turf.js library is not loaded");
    }
    const point = this.#turf.point([longitude, latitude]);
    const feature =
      streetGeoJSON.type === "Feature"
        ? streetGeoJSON
        : this.#turf.feature(streetGeoJSON);
    const type = feature.geometry ? feature.geometry.type : null;

    if (type === "Polygon" || type === "MultiPolygon") {
      try {
        if (this.#turf.booleanPointInPolygon(point, feature)) {
          return 0;
        }
        const lines = this.#turf.polygonToLine(feature);
        const nearest = this.#turf.nearestPointOnLine(lines, point);
        return this.#turf.distance(point, nearest, { units: "meters" });
      } catch (e) {}
    } else if (type === "Point") {
      return this.#turf.distance(point, feature, { units: "meters" });
    }

    try {
      const nearest = this.#turf.nearestPointOnLine(feature, point);
      return this.#turf.distance(point, nearest, { units: "meters" });
    } catch (e) {
      try {
        const center = this.getCenter(feature);
        const centerPoint = this.#turf.point(center);
        return this.#turf.distance(point, centerPoint, { units: "meters" });
      } catch (err) {
        return 0;
      }
    }
  }

  findClosestStreet(latitude, longitude, streetsGeoJSON) {
    if (!this.#turf) {
      throw new Error("Turf.js library is not loaded");
    }
    const point = this.#turf.point([longitude, latitude]);
    let minDistance = Infinity;
    let closestStreet = null;
    let closestPoint = null;

    const latTol = 0.01;
    const lngTol = 0.015;

    const candidates = streetsGeoJSON.filter((street) => {
      if (!street.geometry || !street.geometry.coordinates) return false;

      try {
        const coords = this.#turf.coordAll(street);
        let minLat = Infinity,
          maxLat = -Infinity;
        let minLng = Infinity,
          maxLng = -Infinity;

        for (let i = 0; i < coords.length; i++) {
          const pt = coords[i];
          if (pt[1] < minLat) minLat = pt[1];
          if (pt[1] > maxLat) maxLat = pt[1];
          if (pt[0] < minLng) minLng = pt[0];
          if (pt[0] > maxLng) maxLng = pt[0];
        }

        return (
          latitude >= minLat - latTol &&
          latitude <= maxLat + latTol &&
          longitude >= minLng - lngTol &&
          longitude <= maxLng + lngTol
        );
      } catch (e) {
        return true;
      }
    });

    if (candidates.length === 0) {
      return {
        street: null,
        point: null,
        distance: Infinity,
      };
    }

    candidates.forEach((street) => {
      try {
        const isPoly =
          street.geometry.type === "Polygon" ||
          street.geometry.type === "MultiPolygon";
        if (isPoly && this.#turf.booleanPointInPolygon(point, street)) {
          minDistance = 0;
          closestStreet = street;
          closestPoint = [latitude, longitude];
          return;
        }

        const distance = this.getDistanceToStreet(latitude, longitude, street);
        if (distance < minDistance) {
          minDistance = distance;
          closestStreet = street;
          closestPoint = this.getNearestPoint(latitude, longitude, street);
        }
      } catch (e) {
        console.error(
          "Error in distance check for street:",
          street.properties?.name,
          e,
        );
      }
    });

    return {
      street: closestStreet,
      point: closestPoint,
      distance: minDistance,
    };
  }
}

/**
 * Calcule la distance euclidienne / géodésique rapide en mètres entre 2 coordonnées [lng, lat].
 * @param {[number, number]} p1
 * @param {[number, number]} p2
 * @returns {number}
 */
export function pointDistanceMeters(p1, p2) {
  if (!p1 || !p2) return Infinity;
  const dLng = (p1[0] - p2[0]) * Math.cos(((p1[1] + p2[1]) * Math.PI) / 360) * 111320;
  const dLat = (p1[1] - p2[1]) * 110574;
  return Math.sqrt(dLng * dLng + dLat * dLat);
}

/**
 * Raccorde bout-à-bout des segments de coordonnées contigus appartenant à la même voie.
 * @param {Array<Array<[number, number]>>} coordsList - Liste de lignes de coordonnées
 * @param {number} [toleranceMeters=10] - Tolérance de distance aux extrémités pour raccorder
 * @returns {Array<Array<[number, number]>>}
 */
export function stitchCoordinates(coordsList, toleranceMeters = 10) {
  if (!coordsList || coordsList.length <= 1) return coordsList ? [...coordsList] : [];

  const lines = coordsList.map((c) => [...c]);
  let merged = true;

  while (merged) {
    merged = false;
    outerLoop:
    for (let i = 0; i < lines.length; i++) {
      const lineA = lines[i];
      if (!lineA || lineA.length === 0) continue;
      const startA = lineA[0];
      const endA = lineA[lineA.length - 1];

      for (let j = i + 1; j < lines.length; j++) {
        const lineB = lines[j];
        if (!lineB || lineB.length === 0) continue;
        const startB = lineB[0];
        const endB = lineB[lineB.length - 1];

        // 1. Bout de A touche début de B -> lineA + lineB
        if (pointDistanceMeters(endA, startB) <= toleranceMeters) {
          lines[i] = lineA.concat(lineB.slice(1));
          lines.splice(j, 1);
          merged = true;
          break outerLoop;
        }
        // 2. Bout de A touche bout de B -> lineA + reverse(lineB)
        else if (pointDistanceMeters(endA, endB) <= toleranceMeters) {
          lines[i] = lineA.concat(lineB.slice(0, -1).reverse());
          lines.splice(j, 1);
          merged = true;
          break outerLoop;
        }
        // 3. Début de A touche bout de B -> lineB + lineA
        else if (pointDistanceMeters(startA, endB) <= toleranceMeters) {
          lines[i] = lineB.concat(lineA.slice(1));
          lines.splice(j, 1);
          merged = true;
          break outerLoop;
        }
        // 4. Début de A touche début de B -> reverse(lineB) + lineA
        else if (pointDistanceMeters(startA, startB) <= toleranceMeters) {
          lines[i] = lineB.slice(1).reverse().concat(lineA);
          lines.splice(j, 1);
          merged = true;
          break outerLoop;
        }
      }
    }
  }

  return lines;
}

/**
 * Fusionne intelligemment (Street Stitching) les entités de rue portant le même toponyme exact.
 * RÈGLE DE SÉCURITÉ : Ne fusionne JAMAIS des rues différentes (toponymes différents, types différents, ou
 * homonymes distants de plus de maxGapMeters).
 * @param {Array<Object>} features - GeoJSON features
 * @param {Object} [options]
 * @param {number} [options.toleranceMeters=10] - Tolérance pour raccorder bout-à-bout
 * @param {number} [options.maxGapMeters=150] - Distance max pour considérer deux segments comme la même voie continue
 * @returns {Array<Object>}
 */
export function stitchStreetFeatures(features = [], options = {}) {
  const toleranceMeters = options.toleranceMeters ?? 10;
  const maxGapMeters = options.maxGapMeters ?? 150;

  const nonLineFeatures = [];
  const lineFeaturesByName = new Map();

  function getFeatureCoords(feature) {
    if (!feature || !feature.geometry) return [];
    if (feature.geometry.type === 'LineString') return [feature.geometry.coordinates];
    if (feature.geometry.type === 'MultiLineString') return feature.geometry.coordinates;
    return [];
  }

  function minLineDistance(lineA, lineB) {
    if (!lineA || !lineB || lineA.length === 0 || lineB.length === 0) return Infinity;
    const aStart = lineA[0];
    const aEnd = lineA[lineA.length - 1];
    const bStart = lineB[0];
    const bEnd = lineB[lineB.length - 1];
    return Math.min(
      pointDistanceMeters(aStart, bStart),
      pointDistanceMeters(aStart, bEnd),
      pointDistanceMeters(aEnd, bStart),
      pointDistanceMeters(aEnd, bEnd),
    );
  }

  function minFeatureDistance(linesA, linesB) {
    let minD = Infinity;
    for (const lA of linesA) {
      for (const lB of linesB) {
        const d = minLineDistance(lA, lB);
        if (d < minD) minD = d;
      }
    }
    return minD;
  }

  for (const feature of features) {
    if (!feature || !feature.geometry) continue;
    const geomType = feature.geometry.type;
    const name = feature.properties && feature.properties.name ? feature.properties.name.trim() : null;
    const isLotissement = Boolean(feature.properties && feature.properties.isLotissement);

    // Ne fusionner que des LineString / MultiLineString de rue (pas de lotissements, polygones ou points)
    if (!name || isLotissement || (geomType !== 'LineString' && geomType !== 'MultiLineString')) {
      nonLineFeatures.push(feature);
      continue;
    }

    const key = name.toLowerCase();
    if (!lineFeaturesByName.has(key)) {
      lineFeaturesByName.set(key, []);
    }
    lineFeaturesByName.get(key).push(feature);
  }

  const stitchedFeatures = [];

  for (const [, group] of lineFeaturesByName.entries()) {
    if (group.length === 1) {
      const feat = group[0];
      const coords = getFeatureCoords(feat);
      const stitched = stitchCoordinates(coords, toleranceMeters);
      const newGeom = stitched.length === 1
        ? { type: 'LineString', coordinates: stitched[0] }
        : { type: 'MultiLineString', coordinates: stitched };
      stitchedFeatures.push({
        ...feat,
        geometry: newGeom,
      });
      continue;
    }

    // Regrouper par composantes connexes selon maxGapMeters
    const n = group.length;
    const adj = Array.from({ length: n }, () => []);
    const featureLines = group.map((f) => getFeatureCoords(f));

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const gap = minFeatureDistance(featureLines[i], featureLines[j]);
        if (gap <= maxGapMeters) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
    }

    const visited = new Set();
    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;

      const cluster = [];
      const queue = [i];
      visited.add(i);

      while (queue.length > 0) {
        const curr = queue.shift();
        cluster.push(group[curr]);
        for (const neighbor of adj[curr]) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      // Fusionner et raccorder les coordonnées des segments de ce cluster
      const allCoords = [];
      const baseProps = { ...cluster[0].properties };
      const baseId = cluster[0].id;

      for (const feat of cluster) {
        allCoords.push(...getFeatureCoords(feat));
      }

      const stitched = stitchCoordinates(allCoords, toleranceMeters);
      const newGeom = stitched.length === 1
        ? { type: 'LineString', coordinates: stitched[0] }
        : { type: 'MultiLineString', coordinates: stitched };

      stitchedFeatures.push({
        type: 'Feature',
        id: baseId,
        properties: baseProps,
        geometry: newGeom,
      });
    }
  }

  return [...nonLineFeatures, ...stitchedFeatures];
}

/**
 * Merges default OSM street features with custom districts and routes,
 * handling overrides, renames, deletions, and intelligent street stitching.
 * @param {Array} defaultFeatures
 * @param {Array} customDistricts
 * @param {Array} customRoutes
 * @returns {Array}
 */
export function mergeCityStreets(
  defaultFeatures = [],
  customDistricts = [],
  customRoutes = [],
) {
  const overridden = new Set();
  const deleted = new Set();

  [...customDistricts, ...customRoutes].forEach((f) => {
    if (!f || !f.properties) return;
    if (f.properties.isDeleted) {
      if (f.properties.id) deleted.add(f.properties.id);
      if (f.properties.name) deleted.add(f.properties.name);
      if (f.properties.originalName) deleted.add(f.properties.originalName);
    } else {
      if (f.properties.id) overridden.add(f.properties.id);
      if (f.properties.name) overridden.add(f.properties.name);
      if (f.properties.originalName) overridden.add(f.properties.originalName);
    }
  });

  const activeCustom = [...customDistricts, ...customRoutes].filter(
    (f) => f && f.properties && !f.properties.isDeleted && f.properties.name,
  );

  const filteredDefaults = defaultFeatures.filter((f) => {
    if (!f || !f.properties || !f.properties.name) return false;
    const id = f.properties.id;
    const name = f.properties.name;
    if (id && (deleted.has(id) || overridden.has(id))) return false;
    if (name && (deleted.has(name) || overridden.has(name))) return false;
    return true;
  });

  const combined = [...filteredDefaults, ...activeCustom];
  return stitchStreetFeatures(combined);
}
