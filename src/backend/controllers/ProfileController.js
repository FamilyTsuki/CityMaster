import sharp from 'sharp';
import path from 'path';
import { User } from '../models/User.js';
import { Score } from '../models/Score.js';

export class ProfileController {
  static async getProfile(req, res) {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const totalScore = await Score.getTotalScoreByPlayer(user.username);
      
      res.json({
        username: user.username,
        profileImageUrl: user.profile_image_url,
        totalScore: totalScore || 0
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async uploadAvatar(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu' });
    }

    try {
      const userId = req.user.id;
      const filename = `avatar_${userId}.webp`;
      const outputPath = path.join(process.cwd(), 'uploads', filename);

      await sharp(req.file.buffer)
        .resize(256, 256, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(outputPath);

      const fileUrl = `/uploads/${filename}?t=${Date.now()}`;
      await User.updateProfileImage(userId, fileUrl);

      res.json({ 
        message: 'Image uploadée et optimisée avec succès',
        profileImageUrl: fileUrl 
      });
    } catch (error) {
      console.error('Error processing image:', error);
      res.status(500).json({ error: 'Erreur lors du traitement de l\'image' });
    }
  }
}
