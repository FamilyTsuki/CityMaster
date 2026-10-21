import pool, { isDatabaseEnabled } from '../config/database.js';
import { GLOBAL_SETTINGS_FILE } from '../config/paths.js';
import { readJsonFile, updateJsonFile } from '../utils/jsonStore.js';

/**
 * Réglages globaux modifiables depuis l'administration.
 * Source de vérité : table `global_settings` en mode PostgreSQL, sinon le
 * fichier global_settings.json (qui reste aussi tenu à jour comme copie en
 * mode PostgreSQL). Le jeu, la liste des difficultés et l'administration
 * lisent tous ces réglages via ce module.
 */
export const SETTING_VALUES = {
  difficulty_mode: ['length', 'nomenclature', 'center'],
  disable_places: ['true', 'false'],
};

const DEFAULT_SETTINGS = {
  difficulty_mode: 'length',
  disable_places: 'false',
};

export class Settings {
  /**
   * @returns {Promise<Record<string, string>>}
   */
  static async getAll() {
    const settings = { ...DEFAULT_SETTINGS };
    try {
      const fileSettings = await readJsonFile(GLOBAL_SETTINGS_FILE, {});
      for (const [key, value] of Object.entries(fileSettings)) {
        settings[key] = String(value);
      }
    } catch (error) {
      console.error('[settings] Unable to read global_settings.json:', error.message);
    }

    if (isDatabaseEnabled()) {
      const result = await pool.query('SELECT key, value FROM global_settings');
      for (const row of result.rows) {
        settings[row.key] = String(row.value);
      }
    }
    return settings;
  }

  /**
   * Réglages utilisés pour tirer et classer les rues.
   * @returns {Promise<{ diffMode: string, disablePlaces: boolean }>}
   */
  static async getGameSettings() {
    const settings = await this.getAll();
    const diffMode = SETTING_VALUES.difficulty_mode.includes(settings.difficulty_mode)
      ? settings.difficulty_mode
      : DEFAULT_SETTINGS.difficulty_mode;
    return { diffMode, disablePlaces: settings.disable_places === 'true' };
  }

  /**
   * @param {string} key
   * @param {unknown} value
   * @returns {boolean}
   */
  static isValid(key, value) {
    return Object.hasOwn(SETTING_VALUES, key) && SETTING_VALUES[key].includes(String(value));
  }

  /**
   * Enregistre un réglage déjà validé avec isValid().
   * @param {string} key
   * @param {unknown} value
   */
  static async set(key, value) {
    const stored = String(value);
    if (isDatabaseEnabled()) {
      await pool.query(
        'INSERT INTO global_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [key, stored],
      );
    }
    await updateJsonFile(GLOBAL_SETTINGS_FILE, {}, (data) => {
      data[key] = stored;
    });
  }
}
