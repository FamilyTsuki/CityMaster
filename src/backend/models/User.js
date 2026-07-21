import pool from '../config/database.js';

export class User {
  static async create(username, hashedPassword) {
    const result = await pool.query(
      'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, profile_image_url',
      [username, hashedPassword]
    );
    return result.rows[0];
  }

  static async findByUsername(username) {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0] || null;
  }

  static async findById(id) {
    const result = await pool.query('SELECT id, username, profile_image_url FROM users WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async updateProfileImage(id, profileImageUrl) {
    const result = await pool.query(
      'UPDATE users SET profile_image_url = $1 WHERE id = $2 RETURNING id, username, profile_image_url',
      [profileImageUrl, id]
    );
    return result.rows[0];
  }
}
