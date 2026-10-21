import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  database: process.env.PGDATABASE,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

/**
 * Mode de stockage du processus, décidé une seule fois par initDB() :
 * - true  : PostgreSQL est la source de vérité (comptes, scores, salons, signalements).
 * - false : mode local (comptes dans users.json, scores et signalements en mémoire,
 *           salons indisponibles). Utilisé en développement sans base et dans les tests.
 * Tant que initDB() n'a pas réussi, aucune requête n'est envoyée à PostgreSQL.
 */
let databaseEnabled = false;

export function isDatabaseEnabled() {
  return databaseEnabled;
}

/**
 * Force le mode de stockage. Réservé à initDB() et aux tests.
 * @param {boolean} enabled
 */
export function setDatabaseEnabled(enabled) {
  databaseEnabled = Boolean(enabled);
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    profile_image_url VARCHAR(500)
  )`,
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500)',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE',
  'ALTER TABLE users ALTER COLUMN password DROP NOT NULL',
  'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE',
  `CREATE TABLE IF NOT EXISTS global_settings (
    key VARCHAR(50) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
  )`,
  `INSERT INTO global_settings (key, value) VALUES ('difficulty_mode', 'length')
   ON CONFLICT (key) DO NOTHING`,
  `INSERT INTO global_settings (key, value) VALUES ('disable_places', 'false')
   ON CONFLICT (key) DO NOTHING`,
  `CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    player VARCHAR(255) NOT NULL,
    score INTEGER NOT NULL,
    difficulty VARCHAR(50) DEFAULT 'hard',
    test_id INTEGER,
    date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  "ALTER TABLE scores ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50) DEFAULT 'hard'",
  'ALTER TABLE scores ADD COLUMN IF NOT EXISTS test_id INTEGER',
  `CREATE TABLE IF NOT EXISTS rooms (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    city_key VARCHAR(255),
    difficulty VARCHAR(50),
    mode VARCHAR(50) DEFAULT 'target',
    test_id INTEGER NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'waiting',
    series_count INTEGER DEFAULT 10,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS series_count INTEGER DEFAULT 10',
  "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'target'",
  'ALTER TABLE rooms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP',
  `CREATE TABLE IF NOT EXISTS room_participants (
    id SERIAL PRIMARY KEY,
    room_code VARCHAR(10) REFERENCES rooms(code) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score INTEGER DEFAULT NULL,
    finished BOOLEAN DEFAULT FALSE,
    UNIQUE(room_code, username)
  )`,
  `CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    city_key VARCHAR(255),
    target_street VARCHAR(255),
    clicked_street VARCHAR(255),
    game_mode VARCHAR(50),
    difficulty VARCHAR(50),
    category VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS route_difficulties (
    city_key VARCHAR(255) NOT NULL,
    street_name VARCHAR(255) NOT NULL,
    difficulty VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (city_key, street_name)
  )`,
];

/**
 * Vérifie la connexion à PostgreSQL, crée ou met à jour le schéma et fixe le mode de stockage.
 * DB_DISABLED=true force le mode local sans tenter de connexion.
 * @returns {Promise<boolean>} true si PostgreSQL est utilisé.
 */
export const initDB = async () => {
  if (process.env.DB_DISABLED === 'true') {
    databaseEnabled = false;
    console.warn('[db] DB_DISABLED=true : mode local (sans PostgreSQL).');
    return false;
  }

  try {
    await pool.query('SELECT 1');
  } catch (error) {
    databaseEnabled = false;
    console.warn(
      `[db] PostgreSQL injoignable (${error.message}). Mode local : comptes dans users.json, ` +
        'scores et signalements en mémoire (perdus au redémarrage), salons indisponibles.',
    );
    return false;
  }

  databaseEnabled = true;
  for (const statement of SCHEMA_STATEMENTS) {
    try {
      await pool.query(statement);
    } catch (error) {
      console.error('[db] Schema migration failed:', error.message);
    }
  }
  console.log('PostgreSQL database tables verified.');
  return true;
};

export const closeDB = () => pool.end();

export default pool;
