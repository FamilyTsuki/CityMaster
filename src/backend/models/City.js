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

    const hasExactLocalMatch = localMatches.some(c => 
      c.name.toLowerCase() === normalizedQuery || c.key === normalizedQuery
    );

    if (hasExactLocalMatch) {
      localMatches.sort((a, b) => {
        const aExact = a.name.toLowerCase() === normalizedQuery || a.key === normalizedQuery;
        const bExact = b.name.toLowerCase() === normalizedQuery || b.key === normalizedQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.name.localeCompare(b.name);
      });
      return localMatches;
    }

    const combinedResults = [...localMatches];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalizedQuery)}&format=json&countrycodes=fr&limit=10&addressdetails=1&extratags=1`,
        {
          headers: {
            'User-Agent': 'CityMaster/1.0 (Interactive Map Game)'
          }
        }
      );

      if (response.ok) {
        const results = await response.json();
        let addedNew = false;

        for (const result of results) {
          if (!result.osm_id || !result.boundingbox || result.boundingbox.length < 4) {
            continue;
          }

          const south = parseFloat(result.boundingbox[0]);
          const north = parseFloat(result.boundingbox[1]);
          const west = parseFloat(result.boundingbox[2]);
          const east = parseFloat(result.boundingbox[3]);

          const latDiff = Math.abs(north - south);
          const lngDiff = Math.abs(east - west);
          if (latDiff < 0.005 || lngDiff < 0.005) {
            continue;
          }

          const isSettlement = result.class === 'boundary' || 
                              result.type === 'administrative' || 
                              ['city', 'town', 'village', 'municipality', 'commune'].includes(result.type) ||
                              ['city', 'town', 'village', 'municipality', 'commune'].includes(result.addresstype);

          if (!isSettlement) {
            continue;
          }

          const name = (result.name || result.display_name.split(',')[0]).trim();
          const key = slugify(name);

          if (!cities.some(c => c.key === key) && !combinedResults.some(c => c.key === key)) {
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
            combinedResults.push(cityData);
            addedNew = true;
          }
        }

        if (addedNew) {
          await fs.writeFile(filePath, JSON.stringify(cities, null, 2), 'utf-8');
        }
      }
    } catch (error) {
      console.error('Nominatim dynamic query error:', error);
    }

    combinedResults.sort((a, b) => {
      const aExact = a.name.toLowerCase() === normalizedQuery || a.key === normalizedQuery;
      const bExact = b.name.toLowerCase() === normalizedQuery || b.key === normalizedQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.name.localeCompare(b.name);
    });

    return combinedResults;
  }
}
