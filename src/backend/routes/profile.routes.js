import express from 'express';
import multer from 'multer';
import { ProfileController } from '../controllers/ProfileController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.memoryStorage();

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
  limits: { fileSize: 2 * 1024 * 1024 }
});

router.get('/', authenticateToken, ProfileController.getProfile);
router.post('/upload', authenticateToken, upload.single('avatar'), ProfileController.uploadAvatar);

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
