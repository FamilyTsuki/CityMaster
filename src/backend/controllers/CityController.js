import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as turf from '@turf/turf';
import { City } from '../models/City.js';
import pool from '../config/database.js';

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

        const isLotissement = false;

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
            itemGroups[name] = { coords: [], isLotissement: false, highway: element.tags.highway };
          } else if (element.tags.highway && !itemGroups[name].highway) {
            itemGroups[name].highway = element.tags.highway;
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

  static async getDifficulties(req, res) {
    try {
      const { key } = req.params;
      const filePath = path.join(dirname, '..', '..', '..', 'public', 'assets', 'data', `${key}.json`);

      if (!fs.existsSync(filePath)) {
        return res.json(['easy', 'medium', 'hard']);
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const geojson = JSON.parse(fileContent);

      const allCityStreets = geojson.features.filter(f => f.properties && f.properties.name && !f.properties.isLotissement);

      const diffCount = { easy: new Set(), medium: new Set(), hard: new Set() };

      let diffMode = 'length';
      try {
        const modeRes = await pool.query("SELECT value FROM global_settings WHERE key = 'difficulty_mode'");
        if (modeRes.rows.length > 0) {
          diffMode = modeRes.rows[0].value;
        }
      } catch (e) {}

      let centroids = [];
      if (diffMode === 'center') {
        centroids = allCityStreets.map(f => {
          if (f.geometry.type === 'Point') return f;
          try { return turf.centroid(f); } catch(e) { return null; }
        });
      }

      allCityStreets.forEach((f, i) => {
        const nameKey = f.properties.name.toLowerCase().trim();

        if (diffMode === 'nomenclature') {
          const firstWord = nameKey.split(/[\s'-]+/)[0];
          const MAJOR_TYPES = ['boulevard', 'avenue', 'place', 'cours', 'quai', 'pont'];
          const MINOR_TYPES = ['impasse', 'allée', 'chemin', 'passage', 'ruelle', 'square', 'cour', 'villa', 'cité', 'sentier', 'traverse'];
          
          if (MAJOR_TYPES.includes(firstWord)) {
            diffCount.easy.add(nameKey);
          } else if (MINOR_TYPES.includes(firstWord) || nameKey.startsWith('grand chemin')) {
            diffCount.hard.add(nameKey);
          } else {
            diffCount.medium.add(nameKey);
          }
        } else if (diffMode === 'center') {
          const mediumWords = ['rue', 'route', 'avenue', 'boulevard', 'place', 'cours', 'quai'];
          const easyWords = [...mediumWords, 'impasse'];
          let isEasyType = easyWords.some(w => nameKey.includes(w));
          let isMediumType = mediumWords.some(w => nameKey.includes(w));
          let isHardType = nameKey.includes('chemin') || nameKey.includes('allée') || nameKey.includes('ruelle');
          
          let nearCount = 0;
          if (centroids[i]) {
            for (let j = 0; j < centroids.length; j++) {
              if (i === j || !centroids[j]) continue;
              try {
                const dist = turf.distance(centroids[i], centroids[j], { units: 'meters' });
                if (dist <= 200) nearCount++;
              } catch(e) {}
            }
          }
          
          const inCenter = nearCount >= 4;
          if (isHardType) {
            diffCount.hard.add(nameKey);
          } else if (inCenter && isEasyType) {
            diffCount.easy.add(nameKey);
          } else if (isMediumType) {
            diffCount.medium.add(nameKey);
          } else {
            diffCount.hard.add(nameKey);
          }
        } else {
          let streetLength = 0;
          if (f.geometry.type === 'Point') {
            diffCount.hard.add(nameKey);
            return;
          }
          try {
            streetLength = turf.length(f, { units: 'meters' });
          } catch (e) {
            diffCount.hard.add(nameKey);
            return;
          }

          if (streetLength > 800) diffCount.easy.add(nameKey);
          else if (streetLength >= 250) diffCount.medium.add(nameKey);
          else diffCount.hard.add(nameKey);
        }
      });

      const available = [];
      if (diffCount.easy.size >= 5) available.push('easy');
      if (diffCount.medium.size >= 5) available.push('medium');
      if (diffCount.hard.size >= 5) available.push('hard');

      res.json(available);
    } catch (error) {
      console.error('Error in getDifficulties:', error);
      res.status(500).json({ error: error.message });
    }
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
