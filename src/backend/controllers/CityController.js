import fs from 'fs/promises';
import * as turf from '@turf/turf';
import { City } from '../models/City.js';
import { cityDataFile, isValidCityKey } from '../config/paths.js';
import { writeJsonFile } from '../utils/jsonStore.js';
import { getPlayableStreets, getAvailableDifficulties, MIN_STREET_LENGTH_METERS } from '../services/CityStreetsService.js';
import { stitchCoordinates, sanitizeStreetCoordinates } from '../../services/SpatialService.js';

const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const BBOX_PATTERN = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/;

/** Générations en cours, par ville : deux joueurs qui lancent la même ville partagent la même requête. */
const pendingGenerations = new Map();

function isOutsideBbox(lat, lon, bboxLimits) {
  return (
    bboxLimits &&
    (lat < bboxLimits.minLat ||
      lat > bboxLimits.maxLat ||
      lon < bboxLimits.minLng ||
      lon > bboxLimits.maxLng)
  );
}

async function fetchOverpassStreets(osmId, bboxLimits, cityKey) {
  const relId = osmId > 3600000000 ? osmId - 3600000000 : osmId;
  const query = `[out:json][timeout:30];
        relation(${relId});map_to_area->.a;
        (
          way(area.a)["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street"]["name"];
          way(area.a)["highway"~"motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street"]["ref"];
          way(area.a)["place"~"suburb|neighbourhood|quarter|hamlet|isolated_dwelling"]["name"];
          relation(area.a)["place"~"suburb|neighbourhood|quarter|hamlet|isolated_dwelling"]["name"];
          node(area.a)["place"~"suburb|neighbourhood|quarter|hamlet|isolated_dwelling"]["name"];
          way(area.a)["landuse"="residential"]["name"];
          relation(area.a)["landuse"="residential"]["name"];
          way(area.a)["residential"="housing_estate"]["name"];
        );
        out geom;`;

  let lastError = null;
  for (const server of OVERPASS_SERVERS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(server, {
        method: 'POST',
        body: `data=${encodeURIComponent(query)}`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json, text/plain, */*',
          'User-Agent': 'CityMaster/1.0 (Game Backend Node.js)',
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }
      return CityController.convertToGeoJSON(await response.json(), bboxLimits);
    } catch (error) {
      lastError = error;
      console.warn(`Failed on ${server} for ${cityKey}: ${error.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw lastError || new Error('No Overpass server available');
}

export class CityController {
  static async getCities(req, res) {
    try {
      const query = typeof req.query.q === 'string' ? req.query.q.slice(0, 100) : '';
      const cities = await City.search(query);
      res.json(cities);
    } catch (error) {
      console.error('Error fetching cities:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async toggleVerification(req, res) {
    try {
      const cityKey = req.params.key;
      if (!isValidCityKey(cityKey)) {
        return res.status(400).json({ error: 'Invalid cityKey' });
      }
      const updatedCity = await City.toggleVerification(cityKey);
      if (!updatedCity) {
        return res.status(404).json({ error: 'City not found' });
      }
      res.json(updatedCity);
    } catch (error) {
      console.error('Error toggling city verification:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Convertit une réponse Overpass en GeoJSON : une entité par nom de rue
   * (tronçons raccordés et nettoyés), un point par lieu-dit.
   */
  static convertToGeoJSON(data, bboxLimits = null) {
    const itemGroups = {};
    for (const element of data?.elements || []) {
      if (!element.tags) continue;
      const name = element.tags.name || element.tags.ref;
      if (!name) continue;

      if (element.type === 'way' && element.geometry) {
        const coords = element.geometry
          .filter((point) => !isOutsideBbox(point.lat, point.lon, bboxLimits))
          .map((point) => [point.lon, point.lat]);
        if (coords.length < 2) continue;

        if (!itemGroups[name]) {
          itemGroups[name] = { coords: [], isLotissement: false, highway: element.tags.highway };
        } else if (element.tags.highway && !itemGroups[name].highway) {
          itemGroups[name].highway = element.tags.highway;
        }
        itemGroups[name].coords.push(coords);
      } else if (element.type === 'node' && element.lat && element.lon) {
        if (isOutsideBbox(element.lat, element.lon, bboxLimits)) continue;
        if (!itemGroups[name]) {
          itemGroups[name] = {
            coords: [],
            isLotissement: true,
            nodePoint: [element.lon, element.lat],
          };
        }
      }
    }

    const features = Object.entries(itemGroups)
      .map(([name, group], index) => {
        if (group.coords.length > 0) {
          const stitchedCoords = stitchCoordinates(group.coords, 10);
          const sanitizedCoords = sanitizeStreetCoordinates(stitchedCoords, {
            name,
            highway: group.highway,
          });
          const isSingleLine = sanitizedCoords.length === 1;
          const feature = {
            type: 'Feature',
            id: index,
            properties: {
              name,
              isLotissement: group.isLotissement,
              itemType: group.isLotissement ? 'lotissement' : 'street',
              highway: group.highway || 'unclassified',
            },
            geometry: {
              type: isSingleLine ? 'LineString' : 'MultiLineString',
              coordinates: isSingleLine ? sanitizedCoords[0] : sanitizedCoords,
            },
          };
          try {
            const len = turf.length(feature, { units: 'meters' });
            if (len > 0 && len < MIN_STREET_LENGTH_METERS) return null;
          } catch {
            return null;
          }
          return feature;
        }
        if (group.nodePoint) {
          return {
            type: 'Feature',
            id: index,
            properties: { name, isLotissement: true, itemType: 'lotissement' },
            geometry: { type: 'Point', coordinates: group.nodePoint },
          };
        }
        return null;
      })
      .filter(Boolean);

    return { type: 'FeatureCollection', features };
  }

  static async getDifficulties(req, res) {
    try {
      const { key } = req.params;
      if (!isValidCityKey(key)) {
        return res.status(400).json({ error: 'Invalid cityKey' });
      }
      const playable = await getPlayableStreets(key);
      if (!playable) {
        // Ville pas encore générée : toutes les difficultés sont proposées.
        return res.json(['easy', 'medium', 'hard']);
      }
      res.json(getAvailableDifficulties(playable.streets));
    } catch (error) {
      console.error('Error in getDifficulties:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async generateCity(req, res) {
    try {
      let { cityKey, name, osmId, bbox } = req.body || {};
      if (!osmId && req.body?.osm_id) {
        osmId = req.body.osm_id;
      }

      if (isValidCityKey(cityKey) && (!name || !osmId || !bbox)) {
        const localCity = await City.getByKey(cityKey);
        if (localCity) {
          name = name || localCity.name;
          osmId = osmId || localCity.osmId;
          bbox = bbox || localCity.bbox;
        }
      }

      if (!cityKey || !name || !osmId) {
        return res.status(400).json({ error: 'cityKey, name, and osmId are required' });
      }
      if (!isValidCityKey(cityKey)) {
        return res.status(400).json({ error: 'Invalid cityKey' });
      }

      const parsedOsmId = Number(osmId);
      if (!Number.isInteger(parsedOsmId) || parsedOsmId <= 0) {
        return res.status(400).json({ error: 'Invalid osmId' });
      }

      let bboxLimits = null;
      if (bbox) {
        if (typeof bbox !== 'string' || !BBOX_PATTERN.test(bbox)) {
          return res.status(400).json({ error: 'Invalid bbox format' });
        }
        const parts = bbox.split(',').map(Number);
        bboxLimits = {
          minLat: Math.min(parts[0], parts[2]),
          maxLat: Math.max(parts[0], parts[2]),
          minLng: Math.min(parts[1], parts[3]),
          maxLng: Math.max(parts[1], parts[3]),
        };
      }

      const outputPath = cityDataFile(cityKey);
      try {
        const stats = await fs.stat(outputPath);
        if (stats.size > 150) {
          return res.json({ success: true, cached: true });
        }
        console.warn(`City ${cityKey} file is empty or corrupted, regenerating...`);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }

      let generation = pendingGenerations.get(cityKey);
      if (!generation) {
        console.log(`Generating data for ${name} (OSM ID: ${parsedOsmId}) -> ${cityKey}.json`);
        generation = fetchOverpassStreets(parsedOsmId, bboxLimits, cityKey).finally(() => {
          pendingGenerations.delete(cityKey);
        });
        pendingGenerations.set(cityKey, generation);
      }

      let geojson;
      try {
        geojson = await generation;
      } catch (error) {
        console.error(`Failed to generate streets for ${cityKey}:`, error);
        return res.status(502).json({ error: 'Failed to fetch map data from Overpass API' });
      }

      if (!geojson.features.length) {
        return res.status(422).json({
          error:
            "Aucune rue n'a pu être trouvée pour cette commune. Veuillez vérifier ses limites géographiques ou essayer une autre commune.",
        });
      }

      await writeJsonFile(outputPath, geojson);
      console.log(`Saved ${geojson.features.length} streets and lotissements to ${outputPath}`);
      res.json({ success: true, cached: false, streetCount: geojson.features.length });
    } catch (error) {
      console.error('Error generating city:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
