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
}
