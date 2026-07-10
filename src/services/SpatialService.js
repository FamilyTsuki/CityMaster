export class SpatialService {
  #turf;

  constructor() {
    this.#turf = window.turf;
  }

  calculateBuffer(lineGeoJSON, radiusMeters = 20) {
    if (!this.#turf) {
      throw new Error('Turf.js library is not loaded');
    }
    return this.#turf.buffer(lineGeoJSON, radiusMeters, { units: 'meters' });
  }

  isPointInPolygon(latitude, longitude, polygonGeoJSON) {
    if (!this.#turf) {
      throw new Error('Turf.js library is not loaded');
    }
    const point = this.#turf.point([longitude, latitude]);
    return this.#turf.booleanPointInPolygon(point, polygonGeoJSON);
  }

  getCenter(geojson) {
    if (!this.#turf) {
      throw new Error('Turf.js library is not loaded');
    }
    const center = this.#turf.center(geojson);
    return center.geometry.coordinates;
  }

  getNearestPoint(latitude, longitude, lineGeoJSON) {
    if (!this.#turf) {
      throw new Error('Turf.js library is not loaded');
    }
    const point = this.#turf.point([longitude, latitude]);
    const nearest = this.#turf.nearestPointOnLine(lineGeoJSON, point);
    return [nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]];
  }

  getDistanceToStreet(latitude, longitude, lineGeoJSON) {
    if (!this.#turf) {
      throw new Error('Turf.js library is not loaded');
    }
    const point = this.#turf.point([longitude, latitude]);
    const nearest = this.#turf.nearestPointOnLine(lineGeoJSON, point);
    return this.#turf.distance(point, nearest, { units: 'meters' });
  }

  findClosestStreet(latitude, longitude, streetsGeoJSON) {
    if (!this.#turf) {
      throw new Error('Turf.js library is not loaded');
    }
    const point = this.#turf.point([longitude, latitude]);
    let minDistance = Infinity;
    let closestStreet = null;
    let closestPoint = null;

    const latTol = 0.005;
    const lngTol = 0.007;

    const candidates = streetsGeoJSON.filter(street => {
      if (!street.geometry || !street.geometry.coordinates) return false;
      
      let minLat = Infinity, maxLat = -Infinity;
      let minLng = Infinity, maxLng = -Infinity;
      
      const updateBounds = (pt) => {
        if (pt[1] < minLat) minLat = pt[1];
        if (pt[1] > maxLat) maxLat = pt[1];
        if (pt[0] < minLng) minLng = pt[0];
        if (pt[0] > maxLng) maxLng = pt[0];
      };

      if (street.geometry.type === 'LineString') {
        for (let i = 0; i < street.geometry.coordinates.length; i++) {
          updateBounds(street.geometry.coordinates[i]);
        }
      } else if (street.geometry.type === 'MultiLineString') {
        for (let i = 0; i < street.geometry.coordinates.length; i++) {
          const line = street.geometry.coordinates[i];
          for (let j = 0; j < line.length; j++) {
            updateBounds(line[j]);
          }
        }
      }

      if (latitude >= minLat - latTol && latitude <= maxLat + latTol &&
          longitude >= minLng - lngTol && longitude <= maxLng + lngTol) {
        return true;
      }
      
      return false;
    });

    if (candidates.length === 0) {
      return {
        street: null,
        point: null,
        distance: Infinity
      };
    }

    candidates.forEach(street => {
      try {
        const nearest = this.#turf.nearestPointOnLine(street, point);
        const distance = this.#turf.distance(point, nearest, { units: 'meters' });
        if (distance < minDistance) {
          minDistance = distance;
          closestStreet = street;
          closestPoint = [nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]];
        }
      } catch (e) {
        console.error('Error in turf.nearestPointOnLine for street:', street.properties.name, e);
      }
    });

    return {
      street: closestStreet,
      point: closestPoint,
      distance: minDistance
    };
  }
}
