import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { City } from '../models/City.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const OVERPASS_SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];

export class CityController {
  static async getCities(req, res) {
    try {
      const query = req.query.q || '';
      const cities = await City.search(query);
      res.json(cities);
    } catch (error) {
      console.error('Error fetching cities:', error);
      res.status(500).json({ error: error.message });
    }
  }

  static convertToGeoJSON(data, bboxLimits = null) {
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
          const coords = [];
          for (const point of element.geometry) {
            if (bboxLimits) {
              if (point.lat < bboxLimits.minLat || point.lat > bboxLimits.maxLat ||
                  point.lon < bboxLimits.minLng || point.lon > bboxLimits.maxLng) {
                continue;
              }
            }
            coords.push([point.lon, point.lat]);
          }

          if (coords.length < 2) continue;

          if (!itemGroups[name]) {
            itemGroups[name] = { coords: [], isLotissement };
          }
          itemGroups[name].coords.push(coords);
        } else if (element.type === 'node' && element.lat && element.lon) {
          if (bboxLimits) {
            if (element.lat < bboxLimits.minLat || element.lat > bboxLimits.maxLat ||
                element.lon < bboxLimits.minLng || element.lon > bboxLimits.maxLng) {
              continue;
            }
          }
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

  static async generateCity(req, res) {
    try {
      const { cityKey, name, osmId, bbox } = req.body;

      if (!cityKey || !name || !osmId) {
        return res.status(400).json({ error: 'cityKey, name, and osmId are required' });
      }

      if (typeof cityKey !== 'string' || !/^[a-z0-9_]+$/.test(cityKey)) {
        return res.status(400).json({ error: 'Invalid cityKey' });
      }

      const parsedOsmId = Number(osmId);
      if (!Number.isInteger(parsedOsmId) || parsedOsmId <= 0) {
        return res.status(400).json({ error: 'Invalid osmId' });
      }

      let bboxLimits = null;
      if (bbox) {
        if (typeof bbox !== 'string' || !/^-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(bbox)) {
          return res.status(400).json({ error: 'Invalid bbox format' });
        }
        const parts = bbox.split(',').map(Number);
        if (parts.length === 4) {
          bboxLimits = {
            minLat: Math.min(parts[0], parts[2]),
            maxLat: Math.max(parts[0], parts[2]),
            minLng: Math.min(parts[1], parts[3]),
            maxLng: Math.max(parts[1], parts[3])
          };
        }
      }

      const publicDataDir = path.join(dirname, '..', '..', '..', 'public', 'assets', 'data');
      if (!fs.existsSync(publicDataDir)) {
        fs.mkdirSync(publicDataDir, { recursive: true });
      }

      const outputPath = path.join(publicDataDir, `${cityKey}.json`);

      if (fs.existsSync(outputPath)) {
        console.log(`City ${cityKey} is already generated.`);
        return res.json({ success: true, cached: true });
      }

      console.log(`Generating data for ${name} (OSM ID: ${parsedOsmId}) -> ${cityKey}.json`);

      const relId = parsedOsmId > 3600000000 ? parsedOsmId - 3600000000 : parsedOsmId;
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

      let success = false;
      let lastError = null;
      let geojson = null;

      for (const server of OVERPASS_SERVERS) {
        try {
          console.log(`Trying ${server} for ${cityKey}...`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25000);

          const response = await fetch(server, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json, text/plain, */*',
              'User-Agent': 'CityMaster/1.0 (Game Backend Node.js)'
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`Status ${response.status}`);
          }

          const data = await response.json();
          geojson = CityController.convertToGeoJSON(data, bboxLimits);
          success = true;
          break;
        } catch (error) {
          lastError = error;
          console.warn(`Failed on ${server} for ${cityKey}: ${error.message}`);
        }
      }

      if (!success) {
        console.error(`Failed to generate streets for ${cityKey}:`, lastError);
        return res.status(502).json({ error: `Failed to fetch map data from Overpass API: ${lastError.message}` });
      }

      fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2), 'utf8');
      console.log(`Saved ${geojson.features.length} streets and lotissements to ${outputPath}`);
      res.json({ success: true, cached: false, streetCount: geojson.features.length });
    } catch (error) {
      console.error('Error generating city:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
