import pool, { isDatabaseEnabled } from '../config/database.js';
import { MODERATOR_APPLICATIONS_FILE } from '../config/paths.js';
import { readJsonFile, updateJsonFile } from '../utils/jsonStore.js';

/**
 * Candidatures de modération. Une candidature acceptée donne à son auteur le
 * droit de corriger les rues et quartiers d'une seule commune : il n'existe
 * pas d'autre trace du rôle de modérateur.
 * - Mode PostgreSQL : table `moderator_applications`.
 * - Mode local : fichier moderator_applications.json.
 *
 * Statuts : pending (en attente), approved (modérateur actif), rejected
 * (refusée), revoked (droits retirés après acceptation).
 */
export const APPLICATION_STATUSES = ['pending', 'approved', 'rejected', 'revoked'];
const ACTIVE_STATUSES = ['pending', 'approved'];

function sameUsername(a, b) {
  return (a || '').toLowerCase().trim() === (b || '').toLowerCase().trim();
}

async function readFileApplications() {
  const items = await readJsonFile(MODERATOR_APPLICATIONS_FILE, []);
  return Array.isArray(items) ? items : [];
}

function newestFirst(a, b) {
  return new Date(b.created_at) - new Date(a.created_at);
}

export class ModeratorApplication {
  /**
   * Candidature en attente ou acceptée de ce joueur pour cette commune.
   * @returns {Promise<object|null>}
   */
  static async findActive(username, cityKey) {
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        `SELECT * FROM moderator_applications
         WHERE LOWER(username) = LOWER($1) AND city_key = $2 AND status = ANY($3)
         LIMIT 1`,
        [username, cityKey, ACTIVE_STATUSES],
      );
      return result.rows[0] || null;
    }
    const items = await readFileApplications();
    return (
      items.find(
        (a) => sameUsername(a.username, username) && a.city_key === cityKey && ACTIVE_STATUSES.includes(a.status),
      ) || null
    );
  }

  static async create({ username, cityKey, cityName, motivation = null }) {
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        `INSERT INTO moderator_applications (username, city_key, city_name, motivation)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [username, cityKey, cityName, motivation],
      );
      return result.rows[0];
    }
    return updateJsonFile(MODERATOR_APPLICATIONS_FILE, [], (items) => {
      const nextId = items.reduce((max, a) => Math.max(max, Number(a.id) || 0), 0) + 1;
      const application = {
        id: nextId,
        username,
        city_key: cityKey,
        city_name: cityName,
        motivation,
        status: 'pending',
        reviewed_by: null,
        reviewed_at: null,
        created_at: new Date().toISOString(),
      };
      items.push(application);
      return application;
    });
  }

  static async findByUsername(username) {
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        'SELECT * FROM moderator_applications WHERE LOWER(username) = LOWER($1) ORDER BY created_at DESC',
        [username],
      );
      return result.rows;
    }
    const items = await readFileApplications();
    return items.filter((a) => sameUsername(a.username, username)).sort(newestFirst);
  }

  static async getAll(statusFilter = null) {
    const filter = APPLICATION_STATUSES.includes(statusFilter) ? statusFilter : null;
    if (isDatabaseEnabled()) {
      const result = filter
        ? await pool.query('SELECT * FROM moderator_applications WHERE status = $1 ORDER BY created_at DESC', [filter])
        : await pool.query('SELECT * FROM moderator_applications ORDER BY created_at DESC');
      return result.rows;
    }
    const items = await readFileApplications();
    return items.filter((a) => (filter ? a.status === filter : true)).sort(newestFirst);
  }

  /**
   * @returns {Promise<object|null>} null si la candidature n'existe pas.
   */
  static async updateStatus(id, status, reviewer) {
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        `UPDATE moderator_applications
         SET status = $1, reviewed_by = $2, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING *`,
        [status, reviewer, id],
      );
      return result.rows[0] || null;
    }
    return updateJsonFile(MODERATOR_APPLICATIONS_FILE, [], (items) => {
      const item = items.find((a) => Number(a.id) === Number(id));
      if (!item) return null;
      item.status = status;
      item.reviewed_by = reviewer;
      item.reviewed_at = new Date().toISOString();
      return { ...item };
    });
  }

  /**
   * Communes que ce joueur peut modérer.
   * @returns {Promise<Array<{key: string, name: string}>>}
   */
  static async getModeratedCities(username) {
    if (!username) return [];
    const items = await ModeratorApplication.findByUsername(username);
    const seen = new Set();
    return items
      .filter((a) => a.status === 'approved' && !seen.has(a.city_key) && seen.add(a.city_key))
      .map((a) => ({ key: a.city_key, name: a.city_name }));
  }

  static async canModerate(username, cityKey) {
    if (!username || !cityKey) return false;
    const cities = await ModeratorApplication.getModeratedCities(username);
    return cities.some((c) => c.key === cityKey);
  }
}
