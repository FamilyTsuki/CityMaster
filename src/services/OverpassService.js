export class OverpassService {
  #apiUrl;

  constructor(apiUrl = 'https://overpass-api.de/api/interpreter') {
    this.#apiUrl = apiUrl;
  }

  async fetchStreets(bbox) {
    const query = `[out:json][timeout:25];way["highway"]["name"](${bbox});out geom;`;
    
    // On appelle notre propre serveur backend qui va faire la requête à notre place
    const response = await fetch('/api/overpass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch street data from Overpass via proxy');
    }
    const data = await response.json();
    return this.#convertToGeoJSON(data);
  }

  async fetchStreetNearPoint(lat, lng, radiusMeters = 150) {
    const query = `[out:json][timeout:10];way(around:${radiusMeters},${lat},${lng})["highway"]["name"];out geom;`;
    const response = await fetch('/api/overpass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
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
