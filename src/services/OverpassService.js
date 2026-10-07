import { ApiService } from './ApiService.js';
import { I18nService } from './I18nService.js';
import { StorageService } from './StorageService.js';

export class OverpassService {
  #apiUrl;

  constructor(apiUrl = '/overpass') {
    this.#apiUrl = apiUrl;
  }

  async fetchStreets(bbox, cityKey = null) {
    if (cityKey) {
      try {
        const cachedData = await StorageService.getCity(cityKey);
        if (cachedData && cachedData.features && cachedData.features.length > 0) {
          return cachedData;
        }
      } catch (e) {}

      try {
        const res = await ApiService.get(`/assets/data/${cityKey}.json`, { includeAuth: false });
        if (res.ok && res.data) {
          StorageService.setCity(cityKey, res.data).catch(() => {});
          return res.data;
        }
      } catch (err) {
        console.warn(`Static data unavailable for city ${cityKey}, falling back to dynamic query.`);
      }
    }

    if (bbox) {
      try {
        const query = `[out:json][timeout:25];(way(${bbox})["highway"~"^(primary|secondary|tertiary|unclassified|residential|living_street)$"]["name"];way(${bbox})["place"]["name"];way(${bbox})["landuse"="residential"]["name"];node(${bbox})["place"]["name"];);out geom;`;
        const res = await ApiService.post(this.#apiUrl, { query });
        if (res.ok && res.data) {
          return this.#convertToGeoJSON(res.data);
        }
      } catch (err) {
        console.warn('Dynamic Overpass query failed:', err);
      }
    }

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

    const res = await ApiService.post('/overpass', { query }, { signal });
    if (!res.ok || !res.data) return null;
    return this.#convertToGeoJSON(res.data);
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
