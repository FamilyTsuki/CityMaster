import pool, { isDatabaseEnabled } from '../config/database.js';
import { USER_ZONES_FILE } from '../config/paths.js';
import { readJsonFile, updateJsonFile } from '../utils/jsonStore.js';
import { sameUsername } from '../utils/identifiers.js';

/**
 * Communes confiées à un modérateur ou super-modérateur (sa « zone »).
 * - Mode PostgreSQL : table `user_zones`.
 * - Mode local : fichier user_zones.json.
 * Une candidature acceptée ajoute sa commune ; un administrateur peut aussi
 * en ajouter ou en retirer directement.
 */

async function readFileZones() {
  const items = await readJsonFile(USER_ZONES_FILE, []);
  return Array.isArray(items) ? items : [];
}

function byCityName(a, b) {
  return (a.name || a.key).localeCompare(b.name || b.key);
}

export class UserZone {
  /**
   * @returns {Promise<Array<{key: string, name: string}>>}
   */
  static async getCities(username) {
    if (!username) return [];
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        'SELECT city_key, city_name FROM user_zones WHERE LOWER(username) = LOWER($1)',
        [username],
      );
      return result.rows.map((r) => ({ key: r.city_key, name: r.city_name })).sort(byCityName);
    }
    const items = await readFileZones();
    return items
      .filter((z) => sameUsername(z.username, username))
      .map((z) => ({ key: z.city_key, name: z.city_name }))
      .sort(byCityName);
  }

  /**
   * Toutes les zones, regroupées par compte (pseudo en minuscules).
   * @returns {Promise<Map<string, Array<{key: string, name: string}>>>}
   */
  static async getAllByUser() {
    const rows = isDatabaseEnabled()
      ? (await pool.query('SELECT username, city_key, city_name FROM user_zones')).rows
      : await readFileZones();
    const byUser = new Map();
    for (const row of rows) {
      const id = row.username.toLowerCase().trim();
      if (!byUser.has(id)) byUser.set(id, []);
      byUser.get(id).push({ key: row.city_key, name: row.city_name });
    }
    for (const cities of byUser.values()) cities.sort(byCityName);
    return byUser;
  }

  /** Ajoute une commune à la zone (sans effet si elle y est déjà). */
  static async add(username, cityKey, cityName, grantedBy = null) {
    if (isDatabaseEnabled()) {
      await pool.query(
        `INSERT INTO user_zones (username, city_key, city_name, granted_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [username, cityKey, cityName, grantedBy],
      );
      return;
    }
    await updateJsonFile(USER_ZONES_FILE, [], (items) => {
      if (items.some((z) => sameUsername(z.username, username) && z.city_key === cityKey)) return;
      items.push({
        username,
        city_key: cityKey,
        city_name: cityName,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
      });
    });
  }

  /**
   * @returns {Promise<boolean>} false si la commune n'était pas dans la zone.
   */
  static async remove(username, cityKey) {
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        'DELETE FROM user_zones WHERE LOWER(username) = LOWER($1) AND city_key = $2',
        [username, cityKey],
      );
      return result.rowCount > 0;
    }
    return updateJsonFile(USER_ZONES_FILE, [], (items) => {
      const index = items.findIndex((z) => sameUsername(z.username, username) && z.city_key === cityKey);
      if (index < 0) return false;
      items.splice(index, 1);
      return true;
    });
  }

  /** Vide la zone d'un compte (retour au rôle de joueur). */
  static async clear(username) {
    if (isDatabaseEnabled()) {
      await pool.query('DELETE FROM user_zones WHERE LOWER(username) = LOWER($1)', [username]);
      return;
    }
    await updateJsonFile(USER_ZONES_FILE, [], (items) => {
      const kept = items.filter((z) => !sameUsername(z.username, username));
      items.length = 0;
      items.push(...kept);
    });
  }
}
