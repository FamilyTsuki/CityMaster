export class OverpassService {
  #apiUrl;

  constructor(apiUrl = 'https://overpass-api.de/api/interpreter') {
    this.#apiUrl = apiUrl;
  }

  async fetchStreets(bbox) {
    let cityKey = null;
    if (bbox.includes('48.835')) cityKey = 'paris';
    else if (bbox.includes('44.815')) cityKey = 'bordeaux';
    else if (bbox.includes('45.73')) cityKey = 'lyon';
    else if (bbox.includes('47.80')) cityKey = 'saint_cyr';

    if (cityKey) {
      try {
        console.log(`Attempting to load static streets for ${cityKey}...`);
        const response = await fetch(`/assets/data/${cityKey}.json`);
        if (response.ok) {
          const geojson = await response.json();
          console.log(`Loaded static streets for ${cityKey} successfully!`);
          return geojson;
        }
      } catch (err) {
        console.warn(`Could not load static streets for ${cityKey}, falling back to Overpass API`, err);
      }
    }

    const query = `[out:json][timeout:25];way["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street"]["name"](${bbox});out geom;`;
    
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
