const OVERPASS_SERVERS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter'
];

export class OverpassController {
  static async proxyQuery(req, res) {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      let lastError = null;

      for (const server of OVERPASS_SERVERS) {
        try {
          console.log(`Querying Overpass on: ${server}`);
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);

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
      res.status(500).json({ error: error.message });
    }
  }
}
