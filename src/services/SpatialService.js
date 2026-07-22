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
    try {
      return this.#turf.booleanPointInPolygon(point, polygonGeoJSON);
    } catch (e) {
      return false;
    }
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

    if (lineGeoJSON.geometry && (lineGeoJSON.geometry.type === 'Polygon' || lineGeoJSON.geometry.type === 'MultiPolygon')) {
      try {
        if (this.#turf.booleanPointInPolygon(point, lineGeoJSON)) {
          return [latitude, longitude];
        }
      } catch (e) {}
    }

    try {
      const nearest = this.#turf.nearestPointOnLine(lineGeoJSON, point);
      return [nearest.geometry.coordinates[1], nearest.geometry.coordinates[0]];
    } catch (e) {
      const center = this.getCenter(lineGeoJSON);
      return [center[1], center[0]];
    }
  }

  getDistanceToStreet(latitude, longitude, streetGeoJSON) {
    if (!this.#turf) {
      throw new Error('Turf.js library is not loaded');
    }
    const point = this.#turf.point([longitude, latitude]);

    const isPolygon = streetGeoJSON.geometry && (
      streetGeoJSON.geometry.type === 'Polygon' ||
      streetGeoJSON.geometry.type === 'MultiPolygon' ||
      streetGeoJSON.properties?.isLotissement
    );

    if (isPolygon) {
      try {
        if (this.#turf.booleanPointInPolygon(point, streetGeoJSON)) {
          return 0;
        }
      } catch (e) {}
    }

    try {
      const nearest = this.#turf.nearestPointOnLine(streetGeoJSON, point);
      return this.#turf.distance(point, nearest, { units: 'meters' });
    } catch (e) {
      try {
        const center = this.getCenter(streetGeoJSON);
        const centerPoint = this.#turf.point(center);
        return this.#turf.distance(point, centerPoint, { units: 'meters' });
      } catch (err) {
        return 0;
      }
    }
  }

  findClosestStreet(latitude, longitude, streetsGeoJSON) {
    if (!this.#turf) {
      throw new Error('Turf.js library is not loaded');
    }
    const point = this.#turf.point([longitude, latitude]);
    let minDistance = Infinity;
    let closestStreet = null;
    let closestPoint = null;

    const latTol = 0.01;
    const lngTol = 0.015;

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

      if (street.geometry.type === 'Point') {
        updateBounds(street.geometry.coordinates);
      } else if (street.geometry.type === 'LineString') {
        for (let i = 0; i < street.geometry.coordinates.length; i++) {
          updateBounds(street.geometry.coordinates[i]);
        }
      } else if (street.geometry.type === 'MultiLineString' || street.geometry.type === 'Polygon') {
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
        const isPoly = street.geometry.type === 'Polygon' || street.geometry.type === 'MultiPolygon' || street.properties?.isLotissement;
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
        console.error('Error in distance check for street:', street.properties?.name, e);
      }
    });

    return {
      street: closestStreet,
      point: closestPoint,
      distance: minDistance
    };
  }
}
