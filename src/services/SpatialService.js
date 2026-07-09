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
    return [nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]]; // returns [lat, lng]
  }

  findClosestStreet(latitude, longitude, streetsGeoJSON) {
    if (!this.#turf) {
      throw new Error('Turf.js library is not loaded');
    }
    const point = this.#turf.point([longitude, latitude]);
    let minDistance = Infinity;
    let closestStreet = null;
    let closestPoint = null;

    streetsGeoJSON.forEach(street => {
      try {
        const nearest = this.#turf.nearestPointOnLine(street, point);
        const distance = this.#turf.distance(point, nearest, { units: 'meters' });
        if (distance < minDistance) {
          minDistance = distance;
          closestStreet = street;
          closestPoint = [nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]];
        }
      } catch (e) {
        // Suppress errors for invalid geometries
      }
    });

    return {
      street: closestStreet,
      point: closestPoint,
      distance: minDistance
    };
  }
}
