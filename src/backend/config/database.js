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
      if (e.code !== '42701') console.error('Error adding profile_image_url:', e);
    }
    
    try {
      await pool.query('ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;');
      await pool.query('ALTER TABLE users ALTER COLUMN password DROP NOT NULL;');
    } catch (e) {
      if (e.code !== '42701') console.error('Error modifying google_id/password:', e);
    }

    try {
      await pool.query('ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;');
    } catch (e) {
      if (e.code !== '42701') console.error('Error adding is_admin:', e);
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
      console.error('Error creating global_settings:', e);
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
      if (e.code !== '42701') console.error('Error adding difficulty column to scores:', e);
    }

    try {
      await pool.query("ALTER TABLE scores ADD COLUMN test_id INTEGER;");
    } catch (e) {
      if (e.code !== '42701') console.error('Error adding test_id column to scores:', e);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        city_key VARCHAR(255),
        difficulty VARCHAR(50),
        test_id INTEGER NOT NULL,
        created_by VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'waiting',
        series_count INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await pool.query('ALTER TABLE rooms ADD COLUMN IF NOT EXISTS series_count INTEGER DEFAULT 10;');
    } catch (e) {
      if (e.code !== '42701') console.error('Error adding series_count to rooms:', e);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS room_participants (
        id SERIAL PRIMARY KEY,
        room_code VARCHAR(10) REFERENCES rooms(code) ON DELETE CASCADE,
        username VARCHAR(255) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        score INTEGER DEFAULT NULL,
        finished BOOLEAN DEFAULT FALSE,
        UNIQUE(room_code, username)
      );
    `);

    console.log('PostgreSQL database tables verified.');
  } catch (error) {
    console.error('Failed to initialize PostgreSQL database:', error);
  }
};

export default pool;
