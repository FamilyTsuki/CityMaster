import express from 'express';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Appel serveur à serveur (Node.js -> Overpass) : cela contourne les problèmes de CORS du navigateur !
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'CityMaster/1.0 (Game Backend Node.js)'
      },
      body: `data=${encodeURIComponent(query)}`
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('Overpass error:', text);
      return res.status(response.status).json({ error: 'Failed to fetch from Overpass' });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Proxy Overpass error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
