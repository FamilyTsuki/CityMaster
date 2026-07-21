import fs from 'fs/promises';
import path from 'path';

const filePath = path.join(process.cwd(), 'config', 'cities.json');

const slugify = (text) => text
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/(^_+|_+$)/g, '');

export class City {
  static async getAll() {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  static async search(query) {
    const cities = await this.getAll();
    const normalizedQuery = query ? query.trim().toLowerCase() : '';

    if (!normalizedQuery) {
      return cities;
    }

    const localMatches = cities.filter(city => 
      city.name.toLowerCase().includes(normalizedQuery) ||
      city.key.includes(normalizedQuery)
    );

    if (localMatches.length > 0) {
      return localMatches;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalizedQuery)}&format=json&countrycodes=fr&limit=5&featuretype=settlement`,
        {
          headers: {
            'User-Agent': 'CityMaster/1.0'
          }
        }
      );

      if (!response.ok) {
        return [];
      }

      const results = await response.json();
      const newCities = [];

      for (const result of results) {
        if (!result.osm_id || !result.boundingbox || result.boundingbox.length < 4) {
          continue;
        }

        const name = result.display_name.split(',')[0].trim();
        const key = slugify(name);

        if (cities.some(c => c.key === key)) {
          continue;
        }

        const south = parseFloat(result.boundingbox[0]);
        const north = parseFloat(result.boundingbox[1]);
        const west = parseFloat(result.boundingbox[2]);
        const east = parseFloat(result.boundingbox[3]);

        const centerLat = (south + north) / 2;
        const centerLng = (west + east) / 2;

        const cityData = {
          key,
          name,
          osmId: parseInt(result.osm_id, 10),
          bbox: `${south},${west},${north},${east}`,
          center: [centerLat, centerLng]
        };

        cities.push(cityData);
        newCities.push(cityData);
      }

      if (newCities.length > 0) {
        await fs.writeFile(filePath, JSON.stringify(cities, null, 2), 'utf-8');
      }

      return newCities;
    } catch (error) {
      console.error('Nominatim query error:', error);
      return [];
    }
  }
}
