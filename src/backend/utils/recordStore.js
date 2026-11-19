import pool, { isDatabaseEnabled } from '../config/database.js';
import { readJsonFile, updateJsonFile } from './jsonStore.js';

/**
 * Stockage d'enregistrements numérotés (propositions, historique) :
 * table PostgreSQL en mode base, fichier JSON (tableau) en mode local.
 *
 * Les colonnes listées dans `jsonColumns` sont de type JSONB côté base.
 * Les filtres sont des égalités exactes : { colonne: valeur } ou
 * { colonne: [valeurs] } (l'une des valeurs).
 */
export class RecordStore {
  /**
   * @param {{ table: string, file: string, jsonColumns?: string[] }} options
   */
  constructor({ table, file, jsonColumns = [] }) {
    this.table = table;
    this.file = file;
    this.jsonColumns = new Set(jsonColumns);
  }

  #toDb(column, value) {
    return this.jsonColumns.has(column) && value !== null && value !== undefined
      ? JSON.stringify(value)
      : value;
  }

  #where(filters, params) {
    const clauses = [];
    for (const [column, value] of Object.entries(filters)) {
      if (value === undefined) continue;
      if (value === null) {
        clauses.push(`${column} IS NULL`);
      } else if (Array.isArray(value)) {
        params.push(value);
        clauses.push(`${column} = ANY($${params.length})`);
      } else {
        params.push(value);
        clauses.push(`${column} = $${params.length}`);
      }
    }
    return clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
  }

  static #matches(record, filters) {
    return Object.entries(filters).every(([column, value]) => {
      if (value === undefined) return true;
      if (value === null) return record[column] === null || record[column] === undefined;
      if (Array.isArray(value)) return value.includes(record[column]);
      return record[column] === value;
    });
  }

  async #readFile() {
    const items = await readJsonFile(this.file, []);
    return Array.isArray(items) ? items : [];
  }

  async insert(fields) {
    const columns = Object.keys(fields);
    if (isDatabaseEnabled()) {
      const values = columns.map((c) => this.#toDb(c, fields[c]));
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query(
        `INSERT INTO ${this.table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        values,
      );
      return result.rows[0];
    }
    return updateJsonFile(this.file, [], (items) => {
      const id = items.reduce((max, r) => Math.max(max, Number(r.id) || 0), 0) + 1;
      const record = { id, ...fields, created_at: new Date().toISOString() };
      items.push(record);
      return structuredClone(record);
    });
  }

  async findById(id) {
    const [record] = await this.find({ id: Number(id) });
    return record || null;
  }

  /**
   * @param {object} filters
   * @returns {Promise<object[]>} Du plus récent au plus ancien.
   */
  async find(filters = {}) {
    if (isDatabaseEnabled()) {
      const params = [];
      const where = this.#where(filters, params);
      const result = await pool.query(
        `SELECT * FROM ${this.table}${where} ORDER BY created_at DESC, id DESC`,
        params,
      );
      return result.rows;
    }
    const items = await this.#readFile();
    return items
      .filter((r) => RecordStore.#matches(r, filters))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id);
  }

  /**
   * Met à jour un enregistrement seulement s'il vérifie encore `expected`
   * (ex. { status: 'pending' }) : deux relecteurs ne traitent pas la même proposition.
   * @returns {Promise<object|null>} null si absent ou si `expected` n'est plus vrai.
   */
  async updateIf(id, expected, changes) {
    if (isDatabaseEnabled()) {
      const columns = Object.keys(changes);
      const params = columns.map((c) => this.#toDb(c, changes[c]));
      const set = columns.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const where = this.#where({ id: Number(id), ...expected }, params);
      const result = await pool.query(`UPDATE ${this.table} SET ${set}${where} RETURNING *`, params);
      return result.rows[0] || null;
    }
    return updateJsonFile(this.file, [], (items) => {
      const record = items.find((r) => Number(r.id) === Number(id));
      if (!record || !RecordStore.#matches(record, expected)) return null;
      Object.assign(record, changes);
      return structuredClone(record);
    });
  }
}
