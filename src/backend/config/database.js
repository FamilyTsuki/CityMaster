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
 * Mode de stockage du processus, décidé par initDB() :
 * - true  : PostgreSQL est la source de vérité (comptes, scores, salons, signalements).
 * - false : mode local (comptes dans users.json, scores et signalements en mémoire,
 *           salons indisponibles). Utilisé en développement sans base et dans les tests.
 * Tant que initDB() n'a pas réussi, aucune requête n'est envoyée à PostgreSQL.
 *
 * Si PostgreSQL ne répond pas encore au démarrage (machine qui redémarre, base
 * lancée après le serveur), le serveur reste « en attente de la base » et
 * retente la connexion en arrière-plan, au lieu de basculer en mode local :
 * voir isDatabasePending().
 */
let databaseEnabled = false;
let databasePending = false;
let reconnectTimer = null;

export function isDatabaseEnabled() {
  return databaseEnabled;
}

/**
 * Vrai tant que PostgreSQL est attendu mais pas encore joignable. Les comptes
 * et l'administration sont alors indisponibles (503) : écrire dans users.json
 * ou dans les seuls fichiers pendant ce temps ferait diverger les données.
 */
export function isDatabasePending() {
  return databasePending;
}

/** Erreurs de connexion passagères : serveur pas encore démarré, réseau, DNS. */
const TRANSIENT_CONNECTION_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  '57P03', // « the database system is starting up »
]);

/**
 * Indique si l'échec de connexion peut disparaître seul (base en cours de
 * démarrage) ou s'il vient de la configuration (base inexistante, mot de passe).
 * @param {Error & { code?: string }} error
 * @returns {boolean}
 */
export function isTransientConnectionError(error) {
  if (!error) return false;
  if (TRANSIENT_CONNECTION_CODES.has(error.code)) return true;
  return /Connection terminated|timeout/i.test(error.message || '');
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
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'player'",
  // Comptes d'avant les rôles : is_admin devient le rôle admin (is_admin reste synchronisé).
  "UPDATE users SET role = 'admin' WHERE is_admin = TRUE AND role = 'player'",
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
  `CREATE TABLE IF NOT EXISTS moderator_applications (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    city_key VARCHAR(255) NOT NULL,
    city_name VARCHAR(255) NOT NULL,
    motivation TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  'CREATE INDEX IF NOT EXISTS moderator_applications_user_idx ON moderator_applications (LOWER(username))',
  `CREATE UNIQUE INDEX IF NOT EXISTS moderator_applications_active_idx
    ON moderator_applications (LOWER(username), city_key)
    WHERE status IN ('pending', 'approved')`,
  `CREATE TABLE IF NOT EXISTS user_zones (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    city_key VARCHAR(255) NOT NULL,
    city_name VARCHAR(255) NOT NULL,
    granted_by VARCHAR(255),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  'CREATE UNIQUE INDEX IF NOT EXISTS user_zones_user_city_idx ON user_zones (LOWER(username), city_key)',
  `CREATE TABLE IF NOT EXISTS edit_proposals (
    id SERIAL PRIMARY KEY,
    city_key VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    item_type VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL,
    element_key VARCHAR(500) NOT NULL,
    label VARCHAR(255),
    payload JSONB NOT NULL,
    before_state JSONB,
    report_id INTEGER,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewer VARCHAR(255),
    reject_reason TEXT,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  'CREATE INDEX IF NOT EXISTS edit_proposals_city_status_idx ON edit_proposals (city_key, status)',
  `CREATE TABLE IF NOT EXISTS edit_history (
    id SERIAL PRIMARY KEY,
    city_key VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    validator VARCHAR(255),
    item_type VARCHAR(20) NOT NULL,
    action VARCHAR(20) NOT NULL,
    element_key VARCHAR(500) NOT NULL,
    label VARCHAR(255),
    payload JSONB NOT NULL,
    before_state JSONB,
    after_state JSONB,
    proposal_id INTEGER,
    report_id INTEGER,
    undone_by VARCHAR(255),
    undone_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  'CREATE INDEX IF NOT EXISTS edit_history_city_idx ON edit_history (city_key, created_at DESC)',
];

/** Délais entre deux tentatives de connexion ; le dernier est ensuite répété. */
const RECONNECT_DELAYS_MS = [2000, 5000, 10000, 30000];

async function enableDatabase(onReady) {
  databaseEnabled = true;
  databasePending = false;
  for (const statement of SCHEMA_STATEMENTS) {
    try {
      await pool.query(statement);
    } catch (error) {
      console.error('[db] Schema migration failed:', error.message);
    }
  }
  console.log('PostgreSQL database tables verified.');
  if (onReady) {
    try {
      await onReady();
    } catch (error) {
      console.error('[db] Post-connection task failed:', error);
    }
  }
}

function scheduleReconnect(attempt, delays, onReady) {
  const delay = delays[Math.min(attempt, delays.length - 1)];
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      if (!isTransientConnectionError(error) || (attempt + 1) % 10 === 0) {
        console.warn(`[db] Toujours en attente de PostgreSQL (${error.message}).`);
      }
      scheduleReconnect(attempt + 1, delays, onReady);
      return;
    }
    console.log(`[db] PostgreSQL joignable après ${attempt + 1} nouvelle(s) tentative(s).`);
    await enableDatabase(onReady);
  }, delay);
  reconnectTimer.unref?.();
}

/**
 * Vérifie la connexion à PostgreSQL, crée ou met à jour le schéma et fixe le mode de stockage.
 * - DB_DISABLED=true : mode local sans tentative de connexion.
 * - Base injoignable pour une raison passagère : attente de la base (voir
 *   isDatabasePending) et nouvelles tentatives en arrière-plan si `reconnect` est vrai.
 * - Autre échec (base inexistante, identifiants refusés) : mode local.
 *
 * @param {object} [options]
 * @param {boolean} [options.reconnect=true] Retenter en arrière-plan (désactivé pour les scripts).
 * @param {() => Promise<void>} [options.onReady] Appelé une fois PostgreSQL disponible.
 * @param {number[]} [options.retryDelaysMs] Délais entre les tentatives (tests).
 * @returns {Promise<boolean>} true si PostgreSQL est utilisé dès maintenant.
 */
export const initDB = async ({ reconnect = true, onReady, retryDelaysMs = RECONNECT_DELAYS_MS } = {}) => {
  databaseEnabled = false;
  databasePending = false;
  if (process.env.DB_DISABLED === 'true') {
    console.warn('[db] DB_DISABLED=true : mode local (sans PostgreSQL).');
    return false;
  }

  try {
    await pool.query('SELECT 1');
  } catch (error) {
    if (isTransientConnectionError(error)) {
      databasePending = true;
      console.warn(
        `[db] PostgreSQL injoignable (${error.message}). ` +
          (reconnect
            ? 'Nouvelles tentatives en arrière-plan ; connexions et administration indisponibles en attendant.'
            : 'Abandon.'),
      );
      if (reconnect) scheduleReconnect(0, retryDelaysMs, onReady);
      return false;
    }
    console.warn(
      `[db] PostgreSQL inutilisable (${error.message}). Mode local : comptes dans users.json, ` +
        'scores et signalements en mémoire (perdus au redémarrage), salons indisponibles.',
    );
    return false;
  }

  await enableDatabase(onReady);
  return true;
};

export const closeDB = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  return pool.end();
};

export default pool;
