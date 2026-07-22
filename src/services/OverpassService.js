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

    const { I18nService } = await import('./I18nService.js');
    throw new Error(I18nService.getInstance().t('errors.network_error'));
  }

  async fetchStreetNearPoint(lat, lng, radiusMeters = 150, osmId = null, signal = null) {
    if (osmId instanceof AbortSignal) {
      signal = osmId;
      osmId = null;
    }

    let query;
    if (osmId) {
      const relId = osmId > 3600000000 ? osmId - 3600000000 : osmId;
      query = `[out:json][timeout:10];relation(${relId});map_to_area->.a;(way(around:${radiusMeters},${lat},${lng})(area.a)["highway"]["name"];way(around:${radiusMeters},${lat},${lng})(area.a)["place"]["name"];way(around:${radiusMeters},${lat},${lng})(area.a)["landuse"="residential"]["name"];node(around:${radiusMeters},${lat},${lng})(area.a)["place"]["name"];);out geom;`;
    } else {
      query = `[out:json][timeout:10];(way(around:${radiusMeters},${lat},${lng})["highway"]["name"];way(around:${radiusMeters},${lat},${lng})["place"]["name"];way(around:${radiusMeters},${lat},${lng})["landuse"="residential"]["name"];node(around:${radiusMeters},${lat},${lng})["place"]["name"];);out geom;`;
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
    const itemGroups = {};
    if (data && data.elements) {
      for (const element of data.elements) {
        if (!element.tags) continue;
        const name = element.tags.name || element.tags.ref;
        if (!name) continue;

        const isLotissement = !!(
          element.tags.place ||
          element.tags.landuse === 'residential' ||
          element.tags.residential === 'housing_estate' ||
          /^(lotissement|résidence|residence|quartier|hameau|domaine|zone|clos|pavilion)/i.test(name)
        );

        if (element.type === 'way' && element.geometry) {
          if (!itemGroups[name]) {
            itemGroups[name] = { coords: [], isLotissement };
          }
          itemGroups[name].coords.push(element.geometry.map(point => [point.lon, point.lat]));
        } else if (element.type === 'node' && element.lat && element.lon) {
          if (!itemGroups[name]) {
            itemGroups[name] = { coords: [], isLotissement: true, nodePoint: [element.lon, element.lat] };
          }
        }
      }
    }

    const features = Object.entries(itemGroups).map(([name, group], index) => {
      if (group.coords.length > 0) {
        return {
          type: 'Feature',
          id: index,
          properties: {
            name: name,
            isLotissement: group.isLotissement,
            itemType: group.isLotissement ? 'lotissement' : 'street'
          },
          geometry: {
            type: 'MultiLineString',
            coordinates: group.coords
          }
        };
      } else if (group.nodePoint) {
        return {
          type: 'Feature',
          id: index,
          properties: {
            name: name,
            isLotissement: true,
            itemType: 'lotissement'
          },
          geometry: {
            type: 'Point',
            coordinates: group.nodePoint
          }
        };
      }
      return null;
    }).filter(Boolean);

    return {
      type: 'FeatureCollection',
      features: features
    };
  }
}
