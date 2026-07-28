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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scores (
        id SERIAL PRIMARY KEY,
        player VARCHAR(255) NOT NULL,
        score INTEGER NOT NULL,
        date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('PostgreSQL database tables verified.');
  } catch (error) {
    console.error('Failed to initialize PostgreSQL database:', error);
  }
};

export default pool;
