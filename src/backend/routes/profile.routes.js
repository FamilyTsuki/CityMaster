import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configuration Multer : stockage en mémoire pour passer le buffer à Sharp
const storage = multer.memoryStorage();

// Sécurité : Filtrage des types de fichiers (uniquement images)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format de fichier non supporté. Seuls JPG, PNG et WEBP sont autorisés.'));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // Sécurité : Limite stricte à 2 Mo
});

// GET /api/profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query('SELECT username, profile_image_url FROM users WHERE id = $1', [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Obtenir le score total
    const scoreResult = await pool.query('SELECT SUM(score) as total_score FROM scores WHERE player = $1', [user.username]);
    
    res.json({
      username: user.username,
      profileImageUrl: user.profile_image_url,
      totalScore: scoreResult.rows[0].total_score || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/profile/upload
router.post('/upload', authenticateToken, upload.single('avatar'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier reçu' });
  }

  try {
    const userId = req.user.id;
    const filename = `avatar_${userId}.webp`;
    const outputPath = path.join(process.cwd(), 'uploads', filename);

    // Traitement de l'image avec Sharp
    // 1. Redimensionnement (crop centré) à 256x256 pixels
    // 2. Conversion en WebP pour une taille de fichier minimale
    await sharp(req.file.buffer)
      .resize(256, 256, { fit: 'cover' })
      .webp({ quality: 80 })
      .toFile(outputPath);

    // Ajout d'un timestamp pour contourner le cache navigateur
    const fileUrl = `/uploads/${filename}?t=${Date.now()}`;

    // Mise à jour de la base de données
    await pool.query('UPDATE users SET profile_image_url = $1 WHERE id = $2', [fileUrl, userId]);

    res.json({ 
      message: 'Image uploadée et optimisée avec succès',
      profileImageUrl: fileUrl 
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Erreur lors du traitement de l\'image' });
  }
});

// Middleware d'erreur multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'L\'image est trop volumineuse (max 2 Mo)' });
    }
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

export default router;
