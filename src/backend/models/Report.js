import pool, { isDatabaseEnabled } from '../config/database.js';

/**
 * Signalements d'erreurs envoyés depuis l'écran de jeu.
 * - Mode PostgreSQL : table `reports`.
 * - Mode local : tableau en mémoire (perdu au redémarrage).
 */
const memoryReports = [];
let nextMemoryId = 1;

export class Report {
  static async create(data) {
    const {
      username = 'Anonymous',
      cityKey = null,
      targetStreet = null,
      clickedStreet = null,
      gameMode = null,
      difficulty = null,
      category,
      description,
    } = data;

    if (isDatabaseEnabled()) {
      const result = await pool.query(
        `INSERT INTO reports (username, city_key, target_street, clicked_street, game_mode, difficulty, category, description)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [username, cityKey, targetStreet, clickedStreet, gameMode, difficulty, category, description],
      );
      return result.rows[0];
    }

    const newReport = {
      id: nextMemoryId++,
      username,
      city_key: cityKey,
      target_street: targetStreet,
      clicked_street: clickedStreet,
      game_mode: gameMode,
      difficulty,
      category,
      description,
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    memoryReports.push(newReport);
    return newReport;
  }

  static async getAll(statusFilter = null) {
    const filterByStatus = statusFilter && statusFilter !== 'all';
    if (isDatabaseEnabled()) {
      const result = filterByStatus
        ? await pool.query('SELECT * FROM reports WHERE status = $1 ORDER BY created_at DESC', [statusFilter])
        : await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
      return result.rows;
    }
    return memoryReports
      .filter((r) => (filterByStatus ? r.status === statusFilter : true))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  /**
   * @returns {Promise<object|null>} null si le signalement n'existe pas.
   */
  static async updateStatus(id, status) {
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        'UPDATE reports SET status = $1 WHERE id = $2 RETURNING *',
        [status, id],
      );
      return result.rows[0] || null;
    }
    const item = memoryReports.find((r) => r.id === Number(id));
    if (item) item.status = status;
    return item || null;
  }

  /**
   * @returns {Promise<boolean>} false si le signalement n'existe pas.
   */
  static async delete(id) {
    if (isDatabaseEnabled()) {
      const result = await pool.query('DELETE FROM reports WHERE id = $1', [id]);
      return result.rowCount > 0;
    }
    const index = memoryReports.findIndex((r) => r.id === Number(id));
    if (index < 0) return false;
    memoryReports.splice(index, 1);
    return true;
  }
}
