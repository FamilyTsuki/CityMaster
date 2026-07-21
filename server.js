import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import compression from 'compression';
import { initDB } from './src/backend/config/database.js';
import { configureHelmet, globalRateLimiter } from './src/backend/middleware/security.js';

import authRoutes from './src/backend/routes/auth.routes.js';
import scoreRoutes from './src/backend/routes/scores.routes.js';
import overpassRoutes from './src/backend/routes/overpass.routes.js';
import profileRoutes from './src/backend/routes/profile.routes.js';
import citiesRoutes from './src/backend/routes/cities.routes.js';
import gameRoutes from './src/backend/routes/game.routes.js';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is missing.');
  process.exit(1);
}


const app = express();
const port = process.env.PORT || 3000;

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

app.use(configureHelmet());
app.use(globalRateLimiter);

app.use(cors());
app.use(express.json());

app.use(compression());
app.use(express.static(path.join(dirname, 'public'), {
  setHeaders: (res, filepath) => {
    if (filepath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    } else if (filepath.endsWith('.css') || filepath.endsWith('.js') || filepath.endsWith('.json')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));
app.use('/src', express.static(path.join(dirname, 'src')));
app.use('/uploads', express.static(path.join(dirname, 'uploads'), {
  maxAge: '1d'
}));

app.use('/api', authRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/overpass', overpassRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/cities', citiesRoutes);
app.use('/api/game', gameRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(dirname, 'public', 'index.html'));
});
initDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
});
