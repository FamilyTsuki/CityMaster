import { ApiService } from './ApiService.js';
import { I18nService } from './I18nService.js';
import { StorageService } from './StorageService.js';
import { RouteDifficultyService } from './RouteDifficultyService.js';
import { stitchCoordinates, sanitizeStreetCoordinates } from './SpatialService.js';

export class OverpassService {
  #apiUrl;

  constructor(apiUrl = '/overpass') {
    this.#apiUrl = apiUrl;
  }

  /**
   * Voies d'une ville. Ordre de priorité :
   * 1. fichier généré par le serveur (/assets/data/<ville>.json), revalidé par
   *    ETag : le cache IndexedDB est réutilisé tant que le fichier n'a pas changé ;
   * 2. cache IndexedDB seul (hors-ligne ou serveur indisponible) ;
   * 3. requête Overpass dynamique sur la zone `bbox`.
   * @param {string|null} bbox
   * @param {string|null} [cityKey]
   * @param {object|null} [cityMeta] Métadonnées enregistrées avec le cache (nom, bbox, centre).
   */
  async fetchStreets(bbox, cityKey = null, cityMeta = null) {
    if (cityKey) {
      let cached = null;
      try {
        cached = await StorageService.getCityRecord(cityKey);
      } catch (e) {
        console.warn(`Unable to read cached city ${cityKey}:`, e);
      }
      const hasCachedData = Boolean(cached?.data?.features?.length);

      const res = await ApiService.get(`/assets/data/${cityKey}.json`, {
        includeAuth: false,
        headers: hasCachedData && cached.etag ? { 'If-None-Match': cached.etag } : {},
      });

      if (res.status === 304 && hasCachedData) {
        if (cityMeta && !cached.cityData?.bbox) {
          StorageService.setCity(cityKey, cached.data, cityMeta, cached.etag).catch(() => {});
        }
        return cached.data;
      }
      if (res.ok && res.data?.features) {
        const etag = res.response?.headers?.get('etag') || null;
        StorageService.setCity(cityKey, res.data, cityMeta, etag).catch(() => {});
        return res.data;
      }
      if (hasCachedData) {
        return cached.data;
      }
      console.warn(`Static data unavailable for city ${cityKey}, falling back to dynamic query.`);
    }

    if (bbox) {
      try {
        const query = `[out:json][timeout:25];(way(${bbox})["highway"~"^(primary|secondary|tertiary|unclassified|residential|living_street)$"]["name"];way(${bbox})["place"]["name"];way(${bbox})["landuse"="residential"]["name"];node(${bbox})["place"]["name"];);out geom;`;
        const res = await ApiService.post(this.#apiUrl, { query });
        if (res.ok && res.data) {
          const geojson = this.#convertToGeoJSON(res.data);
          if (cityKey && geojson && geojson.features && geojson.features.length > 0) {
            StorageService.setCity(cityKey, geojson, cityMeta).catch(() => {});
          }
          return geojson;
        }
      } catch (err) {
        console.warn('Dynamic Overpass query failed:', err);
      }
    }

    throw new Error(I18nService.getInstance().t('errors.network_error'));
  }

  #convertToGeoJSON(data) {
    const itemGroups = {};
    if (data && data.elements) {
      for (const element of data.elements) {
        if (!element.tags) continue;
        const name = element.tags.name || element.tags.ref;
        if (!name) continue;

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
        const stitchedCoords = stitchCoordinates(group.coords, 10);
        const sanitizedCoords = sanitizeStreetCoordinates(stitchedCoords, { name, highway: group.highway });
        const isSingleLine = sanitizedCoords.length === 1;
        const feature = {
          type: 'Feature',
          id: index,
          properties: {
            name,
            isLotissement: group.isLotissement,
            itemType: group.isLotissement ? 'lotissement' : 'street',
            highway: group.highway || 'unclassified'
          },
          geometry: {
            type: isSingleLine ? 'LineString' : 'MultiLineString',
            coordinates: isSingleLine ? sanitizedCoords[0] : sanitizedCoords
          }
        };
        const len = RouteDifficultyService.getFeatureLengthMeters(feature);
        if (len > 0 && len < 15) return null;
        return feature;
      } else if (group.nodePoint) {
        return {
          type: 'Feature',
          id: index,
          properties: {
            name,
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
      features
    };
  }
}
