import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
});

export const initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        profile_image_url VARCHAR(500)
      );
    `);
    
    try {
      await pool.query('ALTER TABLE users ADD COLUMN profile_image_url VARCHAR(500);');
    } catch (e) {
      if (e.code !== '42701') console.error('Erreur ajout profile_image_url:', e);
    }
    
    try {
      await pool.query('ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;');
      await pool.query('ALTER TABLE users ALTER COLUMN password DROP NOT NULL;');
    } catch (e) {
      if (e.code !== '42701') console.error('Erreur modif google_id/password:', e);
    }

    try {
      await pool.query('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;');
    } catch (e) {
      if (e.code !== '42701') console.error('Erreur ajout is_admin:', e);
    }

    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS global_settings (
          key VARCHAR(50) PRIMARY KEY,
          value VARCHAR(255) NOT NULL
        );
      `);
      await pool.query(`
        INSERT INTO global_settings (key, value) 
        VALUES ('difficulty_mode', 'length') 
        ON CONFLICT (key) DO NOTHING;
      `);
    } catch (e) {
      console.error('Erreur création global_settings:', e);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        player VARCHAR(255) NOT NULL,
        score INTEGER NOT NULL,
        difficulty VARCHAR(50) DEFAULT 'hard',
        test_id INTEGER,
        date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    try {
      await pool.query("ALTER TABLE scores ADD COLUMN difficulty VARCHAR(50) DEFAULT 'hard';");
    } catch (e) {
      if (e.code !== '42701') console.error('Erreur ajout difficulty in scores:', e);
    }

    try {
      await pool.query("ALTER TABLE scores ADD COLUMN test_id INTEGER;");
    } catch (e) {
      if (e.code !== '42701') console.error('Erreur ajout test_id in scores:', e);
    }
    console.log('PostgreSQL database tables verified.');
  } catch (error) {
    console.error('Failed to initialize PostgreSQL database:', error);
  }
};

export default pool;
