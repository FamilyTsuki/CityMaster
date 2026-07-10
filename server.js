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

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// Middlewares de sécurité
app.use(configureHelmet());
app.use(globalRateLimiter);

// Middlewares basiques
app.use(cors());
app.use(express.json());

// Fichiers statiques
app.use(compression());
app.use(express.static(path.join(dirname, 'public'), {
  maxAge: '1d', // Cache d'un jour pour les assets publics (images, css, data json)
  setHeaders: (res, path) => {
    if (path.endsWith('.json')) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
}));
app.use('/src', express.static(path.join(dirname, 'src')));
app.use('/uploads', express.static(path.join(dirname, 'uploads'), {
  maxAge: '1d'
}));

// Routes API
app.use('/api', authRoutes); // Contient /register et /login
app.use('/api/scores', scoreRoutes); // Contient / et / post/get
app.use('/api/overpass', overpassRoutes); // Proxy API Overpass
app.use('/api/profile', profileRoutes); // Profil joueur et upload

// Route par défaut (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(dirname, 'public', 'index.html'));
});

// Initialisation de la BDD et démarrage du serveur
initDB().then(() => {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
});
