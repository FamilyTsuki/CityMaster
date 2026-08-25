import pool from '../config/database.js';

const memoryReports = [];

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
      description
    } = data;

    try {
      const query = `
        INSERT INTO reports (username, city_key, target_street, clicked_street, game_mode, difficulty, category, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      const values = [username, cityKey, targetStreet, clickedStreet, gameMode, difficulty, category, description];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (err) {
      const newReport = {
        id: memoryReports.length + 1,
        username,
        city_key: cityKey,
        target_street: targetStreet,
        clicked_street: clickedStreet,
        game_mode: gameMode,
        difficulty,
        category,
        description,
        status: 'pending',
        created_at: new Date().toISOString()
      };
      memoryReports.push(newReport);
      return newReport;
    }
  }

  static async getAll(statusFilter = null) {
    try {
      let query = 'SELECT * FROM reports ORDER BY created_at DESC';
      let params = [];

      if (statusFilter && statusFilter !== 'all') {
        query = 'SELECT * FROM reports WHERE status = $1 ORDER BY created_at DESC';
        params = [statusFilter];
      }

      const result = await pool.query(query, params);
      return result.rows;
    } catch (err) {
      return [...memoryReports]
        .filter(r => (statusFilter && statusFilter !== 'all' ? r.status === statusFilter : true))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  }

  static async updateStatus(id, status) {
    try {
      const result = await pool.query(
        'UPDATE reports SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
      return result.rows[0];
    } catch (err) {
      const item = memoryReports.find(r => r.id === Number(id));
      if (item) {
        item.status = status;
      }
      return item;
    }
  }

  static async delete(id) {
    try {
      await pool.query('DELETE FROM reports WHERE id = $1', [id]);
      return true;
    } catch (err) {
      const index = memoryReports.findIndex(r => r.id === Number(id));
      if (index >= 0) {
        memoryReports.splice(index, 1);
      }
      return true;
    }
  }
}
