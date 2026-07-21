export class OverpassService {
  #apiUrl;

  constructor(apiUrl = 'https://overpass-api.de/api/interpreter') {
    this.#apiUrl = apiUrl;
  }

  async fetchStreets(bbox, cityKey = null) {
    if (!cityKey) {
      if (bbox.includes('48.835')) cityKey = 'paris';
      else if (bbox.includes('44.815')) cityKey = 'bordeaux';
      else if (bbox.includes('45.73')) cityKey = 'lyon';
      else if (bbox.includes('47.80')) cityKey = 'saint_cyr';
    }

    if (cityKey) {
      try {
        console.log(`Attempting to load static streets for ${cityKey}...`);
        const response = await fetch(`/assets/data/${cityKey}.json?t=${Date.now()}`);
        if (response.ok) {
          const geojson = await response.json();
          console.log(`Loaded static streets for ${cityKey} successfully!`);
          return geojson;
        }
      } catch (err) {
        console.warn(`Could not load static streets for ${cityKey}`, err);
      }
    }

    throw new Error('Erreur lors du chargement des données cartographiques de la commune. Veuillez réessayer.');
  }

  async fetchStreetNearPoint(lat, lng, radiusMeters = 150, osmId = null, signal = null) {
    if (osmId instanceof AbortSignal) {
      signal = osmId;
      osmId = null;
    }

    let query;
    if (osmId) {
      const relId = osmId > 3600000000 ? osmId - 3600000000 : osmId;
      query = `[out:json][timeout:10];relation(${relId});map_to_area->.a;way(around:${radiusMeters},${lat},${lng})(area.a)["highway"]["name"];out geom;`;
    } else {
      query = `[out:json][timeout:10];way(around:${radiusMeters},${lat},${lng})["highway"]["name"];out geom;`;
    }

    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/overpass', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
      signal
    });
    if (!response.ok) return null;
    const data = await response.json();
    return this.#convertToGeoJSON(data);
  }

  #convertToGeoJSON(data) {
    const streetGroups = {};
    if (data && data.elements) {
      for (const element of data.elements) {
        if (element.type === 'way' && element.geometry && element.tags && element.tags.name) {
          const name = element.tags.name;
          if (!streetGroups[name]) {
            streetGroups[name] = [];
          }
          streetGroups[name].push(element.geometry.map(point => [point.lon, point.lat]));
        }
      }
    }

    const features = Object.entries(streetGroups).map(([name, coordsList], index) => {
      return {
        type: 'Feature',
        id: index,
        properties: {
          name: name
        },
        geometry: {
          type: 'MultiLineString',
          coordinates: coordsList
        }
      };
    });

    return {
      type: 'FeatureCollection',
      features: features
    };
  }
}
