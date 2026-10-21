import pool, { isDatabaseEnabled } from '../config/database.js';
import { USERS_FILE } from '../config/paths.js';
import { readJsonFile, updateJsonFile } from '../utils/jsonStore.js';

/**
 * Comptes joueurs.
 * - Mode PostgreSQL : la table `users` est la seule source de vérité.
 * - Mode local (sans base) : le fichier users.json la remplace.
 * Les deux sources ne sont jamais mélangées : leurs identifiants numériques
 * se recouvrent et désigneraient des personnes différentes.
 */
const PUBLIC_COLUMNS = 'id, username, profile_image_url, is_admin';

export function getEnvAdmins() {
  const envAdmins = process.env.ADMIN_USERS || process.env.ADMINS || '';
  return envAdmins
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isUserAdmin(user) {
  if (!user) return false;
  if (user.is_admin === true || user.is_admin === 'true') return true;
  const username = (user.username || '').toLowerCase().trim();
  return getEnvAdmins().includes(username);
}

function withAdminFlag(user) {
  if (user && !user.is_admin && isUserAdmin(user)) {
    user.is_admin = true;
  }
  return user || null;
}

function toPublicUser(user) {
  if (!user) return null;
  return withAdminFlag({
    id: user.id,
    username: user.username,
    profile_image_url: user.profile_image_url || null,
    is_admin: Boolean(user.is_admin),
  });
}

function sameUsername(a, b) {
  return (a || '').toLowerCase().trim() === (b || '').toLowerCase().trim();
}

function duplicateUsernameError() {
  const error = new Error('Username already exists');
  error.code = '23505';
  return error;
}

async function readFileUsers() {
  const users = await readJsonFile(USERS_FILE, []);
  return Array.isArray(users) ? users : [];
}

function insertFileUser(fields) {
  return updateJsonFile(USERS_FILE, [], (users) => {
    if (users.some((u) => sameUsername(u.username, fields.username))) {
      throw duplicateUsernameError();
    }
    const nextId = users.reduce((max, u) => Math.max(max, Number(u.id) || 0), 0) + 1;
    const user = {
      id: nextId,
      username: fields.username,
      password: fields.password || null,
      google_id: fields.google_id || null,
      profile_image_url: fields.profile_image_url || null,
      is_admin: Boolean(fields.is_admin),
    };
    users.push(user);
    return toPublicUser(user);
  });
}

function updateFileUser(predicate, changes) {
  return updateJsonFile(USERS_FILE, [], (users) => {
    const user = users.find(predicate);
    if (!user) return null;
    Object.assign(user, typeof changes === 'function' ? changes(user) : changes);
    return toPublicUser(user);
  });
}

export class User {
  static async create(username, hashedPassword) {
    const isAdmin = isUserAdmin({ username });
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        `INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3) RETURNING ${PUBLIC_COLUMNS}`,
        [username, hashedPassword, isAdmin],
      );
      return withAdminFlag(result.rows[0]);
    }
    return insertFileUser({ username, password: hashedPassword, is_admin: isAdmin });
  }

  static async createGoogleUser(username, googleId, profileImageUrl) {
    const isAdmin = isUserAdmin({ username });
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        `INSERT INTO users (username, google_id, profile_image_url, is_admin) VALUES ($1, $2, $3, $4) RETURNING ${PUBLIC_COLUMNS}`,
        [username, googleId, profileImageUrl, isAdmin],
      );
      return withAdminFlag(result.rows[0]);
    }
    return insertFileUser({
      username,
      google_id: googleId,
      profile_image_url: profileImageUrl,
      is_admin: isAdmin,
    });
  }

  /**
   * Recherche insensible à la casse. Renvoie aussi le hash du mot de passe
   * (nécessaire à la connexion) : ne jamais renvoyer cet objet tel quel au client.
   */
  static async findByUsername(username) {
    if (!username || typeof username !== 'string') return null;
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
        [username.trim()],
      );
      return withAdminFlag(result.rows[0]);
    }
    const users = await readFileUsers();
    return withAdminFlag(users.find((u) => sameUsername(u.username, username)));
  }

  static async findById(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId) || numericId <= 0) return null;
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        `SELECT ${PUBLIC_COLUMNS} FROM users WHERE id = $1`,
        [numericId],
      );
      return withAdminFlag(result.rows[0]);
    }
    const users = await readFileUsers();
    return toPublicUser(users.find((u) => Number(u.id) === numericId));
  }

  static async findByGoogleId(googleId) {
    if (!googleId) return null;
    if (isDatabaseEnabled()) {
      const result = await pool.query('SELECT * FROM users WHERE google_id = $1', [googleId]);
      return withAdminFlag(result.rows[0]);
    }
    const users = await readFileUsers();
    return withAdminFlag(users.find((u) => u.google_id === googleId));
  }

  static async updateProfileImage(id, profileImageUrl) {
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        `UPDATE users SET profile_image_url = $1 WHERE id = $2 RETURNING ${PUBLIC_COLUMNS}`,
        [profileImageUrl, id],
      );
      return withAdminFlag(result.rows[0]);
    }
    return updateFileUser((u) => Number(u.id) === Number(id), {
      profile_image_url: profileImageUrl,
    });
  }

  static async linkGoogleAccount(id, googleId, profileImageUrl) {
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        `UPDATE users SET google_id = $1, profile_image_url = COALESCE(profile_image_url, $2) WHERE id = $3 RETURNING ${PUBLIC_COLUMNS}`,
        [googleId, profileImageUrl, id],
      );
      return withAdminFlag(result.rows[0]);
    }
    return updateFileUser(
      (u) => Number(u.id) === Number(id),
      (u) => ({
        google_id: googleId,
        profile_image_url: u.profile_image_url || profileImageUrl,
      }),
    );
  }

  /**
   * Donne ou retire les droits administrateur d'un compte existant.
   * @returns {Promise<object|null>} null si le compte n'existe pas.
   */
  static async setAdminStatus(username, isAdmin = true) {
    if (!username || typeof username !== 'string') return null;
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        `UPDATE users SET is_admin = $1 WHERE LOWER(username) = LOWER($2) RETURNING ${PUBLIC_COLUMNS}`,
        [Boolean(isAdmin), username.trim()],
      );
      return result.rows[0] || null;
    }
    return updateFileUser((u) => sameUsername(u.username, username), {
      is_admin: Boolean(isAdmin),
    });
  }
}
