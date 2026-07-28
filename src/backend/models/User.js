import pool from '../config/database.js';

const memoryUsers = new Map();

export class User {
  static async create(username, hashedPassword) {
    try {
      const result = await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, profile_image_url, is_admin',
        [username, hashedPassword]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') throw err;
      const existing = [...memoryUsers.values()].find(u => u.username.toLowerCase() === username.toLowerCase());
      if (existing) {
        const error = new Error('Username already exists');
        error.code = '23505';
        throw error;
      }
      const newUser = {
        id: memoryUsers.size + 1,
        username,
        password: hashedPassword,
        profile_image_url: null,
        is_admin: false
      };
      memoryUsers.set(newUser.id, newUser);
      return newUser;
    }
  }

  static async findByUsername(username) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      return result.rows[0] || null;
    } catch (err) {
      return [...memoryUsers.values()].find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
    }
  }

  static async findById(id) {
    try {
      const result = await pool.query('SELECT id, username, profile_image_url, is_admin FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (err) {
      return memoryUsers.get(Number(id)) || null;
    }
  }

  static async updateProfileImage(id, profileImageUrl) {
    try {
      const result = await pool.query(
        'UPDATE users SET profile_image_url = $1 WHERE id = $2 RETURNING id, username, profile_image_url, is_admin',
        [profileImageUrl, id]
      );
      return result.rows[0];
    } catch (err) {
      const user = memoryUsers.get(Number(id));
      if (user) {
        user.profile_image_url = profileImageUrl;
      }
      return user || null;
    }
  }

  static async findByGoogleId(googleId) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
      return result.rows[0] || null;
    } catch (err) {
      return [...memoryUsers.values()].find(u => u.google_id === googleId) || null;
    }
  }

  static async createGoogleUser(username, googleId, profileImageUrl) {
    try {
      const result = await pool.query(
        'INSERT INTO users (username, google_id, profile_image_url) VALUES ($1, $2, $3) RETURNING id, username, profile_image_url, is_admin',
        [username, googleId, profileImageUrl]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') throw err;
      const existing = [...memoryUsers.values()].find(u => u.username.toLowerCase() === username.toLowerCase());
      if (existing) {
        const error = new Error('Username already exists');
        error.code = '23505';
        throw error;
      }
      const newUser = {
        id: memoryUsers.size + 1,
        username,
        password: null,
        google_id: googleId,
        profile_image_url: profileImageUrl,
        is_admin: false
      };
      memoryUsers.set(newUser.id, newUser);
      return newUser;
    }
  }
}
