import sharp from "sharp";
import fs from "fs/promises";
import path from "path";
import { User } from "../models/User.js";
import { UPLOADS_DIR } from "../config/paths.js";
import { Score } from "../models/Score.js";

export class ProfileController {
  static async getProfile(req, res) {
    try {
      const user = req.user.id ? await User.findById(req.user.id) : null;
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const totalScore = await Score.getTotalScoreByPlayer(user.username);

      res.json({
        username: user.username,
        profileImageUrl: user.profile_image_url,
        totalScore: totalScore || 0,
        isAdmin: user.is_admin || false,
      });
    } catch (error) {
      console.error("ProfileController getProfile error:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  }

  static async uploadAvatar(req, res) {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier reçu" });
    }

    const userId = Number(req.user.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res
        .status(403)
        .json({ error: "Un compte est nécessaire pour changer d'avatar" });
    }

    try {
      const filename = `avatar_${userId}.webp`;
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      const outputPath = path.join(UPLOADS_DIR, filename);

      await sharp(req.file.buffer)
        .resize(256, 256, { fit: "cover" })
        .webp({ quality: 80 })
        .toFile(outputPath);

      const fileUrl = `/uploads/${filename}?t=${Date.now()}`;
      await User.updateProfileImage(userId, fileUrl);

      res.json({
        message: "Image uploadée et optimisée avec succès",
        profileImageUrl: fileUrl,
      });
    } catch (error) {
      console.error("Error processing image:", error);
      res.status(500).json({ error: "Erreur lors du traitement de l'image" });
    }
  }
}
