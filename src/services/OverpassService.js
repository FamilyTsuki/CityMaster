export class OverpassService {
  #apiUrl;

  constructor(apiUrl = '/api/overpass') {
    this.#apiUrl = apiUrl;
  }

  async fetchStreets(bbox, cityKey = null) {
    if (cityKey) {
      try {
        const response = await fetch(`/assets/data/${cityKey}.json?t=${Date.now()}`);
        if (response.ok) {
          const geojson = await response.json();
          return geojson;
        }
      } catch (err) {
        console.warn(`Static data unavailable for city ${cityKey}, falling back to dynamic query.`);
      }
    }

    if (bbox) {
      try {
        const query = `[out:json][timeout:25];(way(${bbox})["highway"]["name"];way(${bbox})["place"]["name"];way(${bbox})["landuse"="residential"]["name"];node(${bbox})["place"]["name"];);out geom;`;
        const response = await fetch(this.#apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        if (response.ok) {
          const data = await response.json();
          return this.#convertToGeoJSON(data);
        }
      } catch (err) {
        console.warn('Dynamic Overpass query failed:', err);
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
      query = `[out:json][timeout:25];relation(${relId});map_to_area->.a;(way(around:${radiusMeters},${lat},${lng})(area.a)["highway"]["name"];way(around:${radiusMeters},${lat},${lng})(area.a)["place"]["name"];way(around:${radiusMeters},${lat},${lng})(area.a)["landuse"="residential"]["name"];node(around:${radiusMeters},${lat},${lng})(area.a)["place"]["name"];);out geom;`;
    } else {
      query = `[out:json][timeout:25];(way(around:${radiusMeters},${lat},${lng})["highway"]["name"];way(around:${radiusMeters},${lat},${lng})["place"]["name"];way(around:${radiusMeters},${lat},${lng})["landuse"="residential"]["name"];node(around:${radiusMeters},${lat},${lng})["place"]["name"];);out geom;`;
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

        const isLotissement = false;

        if (element.type === 'way' && element.geometry) {
          if (!itemGroups[name]) {
            itemGroups[name] = { coords: [], isLotissement: false, highway: element.tags.highway };
          } else if (!itemGroups[name].highway && element.tags.highway) {
            itemGroups[name].highway = element.tags.highway;
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
            itemType: group.isLotissement ? 'lotissement' : 'street',
            highway: group.highway || 'unclassified'
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
