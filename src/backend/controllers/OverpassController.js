import crypto from 'crypto';

const OVERPASS_SERVERS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
];

// Les requêtes envoyées par le client font quelques centaines de caractères :
// la limite empêche d'utiliser ce relais pour des requêtes arbitraires lourdes.
const MAX_QUERY_LENGTH = 2000;
const REQUEST_TIMEOUT_MS = 20000;

// Cache borné en taille totale (et non en nombre d'entrées), car une réponse
// peut peser plusieurs dizaines de Mo.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_BYTES = 100 * 1024 * 1024;
const CACHE_MAX_ENTRY_BYTES = 20 * 1024 * 1024;
const overpassCache = new Map();
let cacheBytes = 0;

function cacheGet(key) {
  const entry = overpassCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    overpassCache.delete(key);
    cacheBytes -= entry.size;
    return null;
  }
  return entry.body;
}

function cacheSet(key, body) {
  const size = Buffer.byteLength(body);
  if (size > CACHE_MAX_ENTRY_BYTES || overpassCache.has(key)) return;
  overpassCache.set(key, { body, size, timestamp: Date.now() });
  cacheBytes += size;
  for (const [oldKey, entry] of overpassCache) {
    if (cacheBytes <= CACHE_MAX_BYTES) break;
    overpassCache.delete(oldKey);
    cacheBytes -= entry.size;
  }
}

export class OverpassController {
  static async proxyQuery(req, res) {
    try {
      const { query } = req.body || {};

      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }
      if (query.length > MAX_QUERY_LENGTH) {
        return res.status(413).json({ error: 'Query is too long' });
      }

      const queryHash = crypto.createHash('sha256').update(query.trim()).digest('hex');
      const cached = cacheGet(queryHash);
      if (cached) {
        return res.type('application/json').send(cached);
      }

      for (const server of OVERPASS_SERVERS) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
        try {
          const response = await fetch(server, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json, text/plain, */*',
              'User-Agent': 'CityMaster/1.0 (Game Backend Node.js)',
            },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal,
          });

          if (!response.ok) {
            console.warn(`Overpass server ${server} returned ${response.status}`);
            continue;
          }

          const body = await response.text();
          JSON.parse(body);
          cacheSet(queryHash, body);
          return res.type('application/json').send(body);
        } catch (err) {
          console.warn(`Overpass server ${server} failed: ${err.message}`);
        } finally {
          clearTimeout(timeoutId);
        }
      }

      console.error('All Overpass servers failed');
      res.status(504).json({ error: 'Overpass servers timed out or returned errors. Please try again.' });
    } catch (error) {
      console.error('Proxy Overpass error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
