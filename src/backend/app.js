import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import compression from 'compression';
import { ROOT_DIR, PUBLIC_DIR, UPLOADS_DIR } from './config/paths.js';
import { configureHelmet, globalRateLimiter } from './middleware/security.js';

import authRoutes from './routes/auth.routes.js';
import scoreRoutes from './routes/scores.routes.js';
import overpassRoutes from './routes/overpass.routes.js';
import profileRoutes from './routes/profile.routes.js';
import citiesRoutes from './routes/cities.routes.js';
import gameRoutes from './routes/game.routes.js';
import adminRoutes from './routes/admin.routes.js';
import roomRoutes from './routes/room.routes.js';
import reportsRoutes from './routes/reports.routes.js';

/**
 * Construit l'application Express (sans la démarrer).
 * server.js l'utilise pour lancer le serveur, les tests pour l'interroger.
 * @returns {import('express').Express}
 */
export function createApp() {
  const app = express();

  // Derrière un reverse proxy (nginx, Traefik...), TRUST_PROXY indique combien de
  // proxys précèdent le serveur (souvent 1). Sans cela, toutes les requêtes
  // semblent venir du proxy et partagent les mêmes limites de débit.
  if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set('trust proxy', Number.isInteger(hops) ? hops : process.env.TRUST_PROXY);
  }

  app.use(configureHelmet());
  app.use(globalRateLimiter);

  app.use(cors());
  app.use(express.json());

  app.use(compression());
  app.use(
    express.static(PUBLIC_DIR, {
      setHeaders: (res, filepath) => {
        if (filepath.endsWith('sw.js')) {
          res.setHeader('Service-Worker-Allowed', '/');
          res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          );
        } else if (
          filepath.endsWith('.html') ||
          filepath.endsWith('manifest.json')
        ) {
          res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate',
          );
        } else if (
          filepath.endsWith('.css') ||
          filepath.endsWith('.js') ||
          filepath.endsWith('.json')
        ) {
          // Revalidation à chaque requête (ETag, réponse 304 si inchangé) :
          // le code et les données de carte modifiées par l'admin restent à jour.
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    }),
  );
  app.use(
    '/src',
    (req, res, next) => {
      if (req.path.startsWith('/backend') || req.path.includes('..')) {
        return res.status(403).json({ error: 'Access denied' });
      }
      res.setHeader('Cache-Control', 'no-cache');
      next();
    },
    express.static(path.join(ROOT_DIR, 'src')),
  );
  app.use(
    '/uploads',
    express.static(UPLOADS_DIR, {
      maxAge: '1d',
    }),
  );

  app.use('/api', authRoutes);
  app.use('/api/scores', scoreRoutes);
  app.use('/api/overpass', overpassRoutes);
  app.use('/api/profile', profileRoutes);
  app.use('/api/cities', citiesRoutes);
  app.use('/api/game', gameRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/rooms', roomRoutes);
  app.use('/api/reports', reportsRoutes);

  app.get('/api/version', (req, res) => {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf8'),
      );
      res.json({ version: pkg.version });
    } catch (err) {
      console.error('Unable to read package.json:', err);
      res.json({ version: 'unknown' });
    }
  });

  app.get('/api/changelog', (req, res) => {
    try {
      const changelogPath = path.join(ROOT_DIR, 'CHANGELOG.md');
      if (fs.existsSync(changelogPath)) {
        const content = fs.readFileSync(changelogPath, 'utf8');
        return res.type('text/plain; charset=utf-8').send(content);
      }
      res.status(404).json({ error: 'Changelog not found' });
    } catch (err) {
      console.error('Unable to read CHANGELOG.md:', err);
      res.status(500).json({ error: 'Failed to read changelog' });
    }
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });

  return app;
}
