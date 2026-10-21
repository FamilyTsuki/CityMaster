import fs from "fs/promises";
import { BASE_CITIES_FILE, CUSTOM_CITIES_FILE, cityDataFile } from "../config/paths.js";
import { readJsonFile, updateJsonFile } from "../utils/jsonStore.js";

/**
 * Liste des villes jouables : config/cities.json (versionné) complété par
 * custom_cities.json (villes découvertes via la recherche Nominatim ou
 * modifiées par un administrateur, qui priment sur la liste de base).
 */

const slugify = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_+|_+$)/g, "");

let cachedCities = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000;

const nominatimCache = new Map();
const NOMINATIM_CACHE_TTL_MS = 60 * 60 * 1000;
const NOMINATIM_CACHE_MAX_ENTRIES = 500;

export class City {
  static async getAll() {
    const now = Date.now();
    if (cachedCities && now - lastCacheTime < CACHE_TTL_MS) {
      return [...cachedCities];
    }

    const baseCities = await readJsonFile(BASE_CITIES_FILE, []);
    const customCities = await readJsonFile(CUSTOM_CITIES_FILE, []);

    const cityMap = new Map();
    for (const city of baseCities) {
      cityMap.set(city.key, city);
    }
    for (const city of customCities) {
      cityMap.set(city.key, city);
    }

    cachedCities = Array.from(cityMap.values());
    lastCacheTime = now;
    return [...cachedCities];
  }

  static async getByKey(key) {
    if (!key) return null;
    const cities = await this.getAll();
    return cities.find((c) => c.key === key) || null;
  }

  static async saveCustomCities(citiesToSave) {
    if (!Array.isArray(citiesToSave) || citiesToSave.length === 0) return;

    await updateJsonFile(CUSTOM_CITIES_FILE, [], (customCities) => {
      for (const city of citiesToSave) {
        const index = customCities.findIndex((c) => c.key === city.key);
        if (index >= 0) {
          customCities[index] = city;
        } else {
          customCities.push(city);
        }
      }
    });
    cachedCities = null;
  }

  static async saveCustomCity(city) {
    await this.saveCustomCities([city]);
  }

  static async search(query) {
    const cities = await this.getAll();
    const normalizedQuery = query ? query.trim().toLowerCase() : "";

    if (!normalizedQuery) {
      return cities;
    }

    const localMatches = cities.filter(
      (city) =>
        city.name.toLowerCase().includes(normalizedQuery) ||
        city.key.includes(normalizedQuery),
    );

    const hasExactLocalMatch = localMatches.some(
      (c) =>
        c.name.toLowerCase() === normalizedQuery || c.key === normalizedQuery,
    );

    if (hasExactLocalMatch) {
      localMatches.sort((a, b) => {
        const aExact =
          a.name.toLowerCase() === normalizedQuery || a.key === normalizedQuery;
        const bExact =
          b.name.toLowerCase() === normalizedQuery || b.key === normalizedQuery;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.name.localeCompare(b.name);
      });
      return localMatches;
    }

    const combinedResults = [...localMatches];

    let results = null;
    const cachedNominatim = nominatimCache.get(normalizedQuery);
    if (cachedNominatim && Date.now() - cachedNominatim.timestamp < NOMINATIM_CACHE_TTL_MS) {
      results = cachedNominatim.results;
    } else {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(normalizedQuery)}&format=json&countrycodes=fr&limit=10&addressdetails=1&extratags=1`,
          {
            headers: {
              "User-Agent": "CityMaster/1.0 (Interactive Map Game)",
            },
          },
        );

        if (response.ok) {
          results = await response.json();
          if (nominatimCache.size >= NOMINATIM_CACHE_MAX_ENTRIES) {
            const oldestKey = nominatimCache.keys().next().value;
            nominatimCache.delete(oldestKey);
          }
          nominatimCache.set(normalizedQuery, { results, timestamp: Date.now() });
        }
      } catch (error) {
        console.error("Nominatim dynamic query error:", error);
      }
    }

    if (results && Array.isArray(results)) {
      const newCitiesToSave = [];

      for (const result of results) {
          if (
            !result.osm_id ||
            !result.boundingbox ||
            result.boundingbox.length < 4
          ) {
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

          const isSettlement =
            result.class === "boundary" ||
            result.type === "administrative" ||
            ["city", "town", "village", "municipality", "commune"].includes(
              result.type,
            ) ||
            ["city", "town", "village", "municipality", "commune"].includes(
              result.addresstype,
            );

          if (!isSettlement) {
            continue;
          }

          const name = (
            result.name || String(result.display_name || "").split(",")[0]
          ).trim();
          const key = slugify(name);
          if (!key) {
            continue;
          }

          if (
            !cities.some((c) => c.key === key) &&
            !combinedResults.some((c) => c.key === key)
          ) {
            const centerLat = (south + north) / 2;
            const centerLng = (west + east) / 2;

            const cityData = {
              key,
              name,
              osmId: parseInt(result.osm_id, 10),
              bbox: `${south},${west},${north},${east}`,
              center: [centerLat, centerLng],
            };

            cities.push(cityData);
            combinedResults.push(cityData);
            newCitiesToSave.push(cityData);
          }
        }

        if (newCitiesToSave.length > 0) {
          await this.saveCustomCities(newCitiesToSave);
        }
      }

    combinedResults.sort((a, b) => {
      const aExact =
        a.name.toLowerCase() === normalizedQuery || a.key === normalizedQuery;
      const bExact =
        b.name.toLowerCase() === normalizedQuery || b.key === normalizedQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.name.localeCompare(b.name);
    });

    return combinedResults;
  }

  /**
   * Inverse le statut « vérifiée » d'une ville.
   * @returns {Promise<object|null>} La ville modifiée, ou null si elle n'existe pas.
   */
  static async toggleVerification(key) {
    let city = await this.getByKey(key);
    if (!city) {
      try {
        await fs.access(cityDataFile(key));
      } catch {
        return null;
      }
      const name = key
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      city = { key, name, isVerified: false };
    }

    const updated = { ...city, isVerified: !city.isVerified };
    await this.saveCustomCity(updated);
    return updated;
  }
}
