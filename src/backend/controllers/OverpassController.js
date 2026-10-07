import crypto from 'crypto';

const OVERPASS_SERVERS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter'
];

const overpassCache = new Map();
const OVERPASS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 heures
const OVERPASS_CACHE_MAX_ENTRIES = 200;

export class OverpassController {
  static async proxyQuery(req, res) {
    try {
      const { query } = req.body;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required' });
      }

      const queryHash = crypto.createHash('sha256').update(query.trim()).digest('hex');
      const cached = overpassCache.get(queryHash);
      if (cached && Date.now() - cached.timestamp < OVERPASS_CACHE_TTL_MS) {
        return res.json(cached.data);
      }

      let lastError = null;

      for (const server of OVERPASS_SERVERS) {
        try {
          console.log(`Querying Overpass on: ${server}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);

          const response = await fetch(server, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json, text/plain, */*',
              'User-Agent': 'CityMaster/1.0 (Game Backend Node.js)'
            },
            body: `data=${encodeURIComponent(query)}`,
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            if (overpassCache.size >= OVERPASS_CACHE_MAX_ENTRIES) {
              const oldestKey = overpassCache.keys().next().value;
              overpassCache.delete(oldestKey);
            }
            overpassCache.set(queryHash, { data, timestamp: Date.now() });

            return res.json(data);
          } else {
            const text = await response.text();
            lastError = `Server ${server} returned ${response.status}: ${text}`;
            console.warn(lastError);
          }
        } catch (err) {
          lastError = `Failed to connect to ${server}: ${err.message}`;
          console.warn(lastError);
        }
      }

      console.error('All Overpass servers failed:', lastError);
      res.status(504).json({ error: 'Overpass servers timed out or returned errors. Please try again.' });
    } catch (error) {
      console.error('Proxy Overpass error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
