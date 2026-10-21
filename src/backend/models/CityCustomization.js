import pool, { isDatabaseEnabled } from '../config/database.js';
import {
  CUSTOM_DISTRICTS_FILE,
  CUSTOM_ROUTES_FILE,
  DIFFICULTY_OVERRIDES_FILE,
} from '../config/paths.js';
import { readJsonFile, updateJsonFile } from '../utils/jsonStore.js';

/**
 * Modifications de carte faites dans l'administration, par ville :
 * - quartiers / lotissements ajoutés (custom_districts.json)
 * - rues ajoutées, renommées ou supprimées (custom_routes.json)
 * - difficultés forcées à la main (table `route_difficulties` en mode
 *   PostgreSQL + copie dans difficulty_overrides.json, fichier seul en mode local)
 *
 * Les fichiers custom_*.json sont aussi lus directement par le navigateur
 * (/assets/data/...) : c'est pourquoi ils restent la source de vérité des
 * quartiers et des rues, quel que soit le mode de stockage.
 */
export const MANUAL_DIFFICULTIES = ['easy', 'medium', 'hard'];

const normalizeStreetName = (name) => String(name).toLowerCase().trim();

async function readCityCollection(filePath, cityKey) {
  const all = await readJsonFile(filePath, {});
  return Array.isArray(all[cityKey]) ? all[cityKey] : [];
}

/**
 * Ajoute ou remplace un élément. Un élément est remplacé s'il a le même id,
 * ou si l'élément enregistré porte le nom d'origine de celui qu'on modifie.
 */
function upsertFeature(filePath, cityKey, feature, originalName) {
  return updateJsonFile(filePath, {}, (all) => {
    if (!Array.isArray(all[cityKey])) all[cityKey] = [];
    const items = all[cityKey];
    const id = feature.properties.id;
    const index = items.findIndex(
      (item) =>
        item.properties &&
        (item.properties.id === id ||
          (originalName &&
            (item.properties.name === originalName ||
              item.properties.originalName === originalName))),
    );
    if (index >= 0) {
      items[index] = feature;
    } else {
      items.push(feature);
    }
    return feature;
  });
}

/**
 * Remplace l'élément par une « pierre tombale » (isDeleted) : l'élément
 * d'origine du fichier de la ville est alors masqué dans le jeu.
 */
function markFeatureDeleted(filePath, cityKey, id) {
  return updateJsonFile(filePath, {}, (all) => {
    if (!Array.isArray(all[cityKey])) all[cityKey] = [];
    const items = all[cityKey];
    const index = items.findIndex(
      (item) =>
        item.properties &&
        ((item.properties.id !== undefined && String(item.properties.id) === id) ||
          item.properties.name === id),
    );
    if (index >= 0) {
      const previous = items[index].properties || {};
      items[index] = {
        type: 'Feature',
        properties: { ...previous, id, name: previous.name || id, isDeleted: true },
      };
    } else {
      items.push({ type: 'Feature', properties: { id, name: id, isDeleted: true } });
    }
  });
}

export class CityCustomization {
  static getDistricts(cityKey) {
    return readCityCollection(CUSTOM_DISTRICTS_FILE, cityKey);
  }

  static getRoutes(cityKey) {
    return readCityCollection(CUSTOM_ROUTES_FILE, cityKey);
  }

  static saveDistrict(cityKey, feature, originalName = null) {
    return upsertFeature(CUSTOM_DISTRICTS_FILE, cityKey, feature, originalName);
  }

  static saveRoute(cityKey, feature, originalName = null) {
    return upsertFeature(CUSTOM_ROUTES_FILE, cityKey, feature, originalName);
  }

  static deleteDistrict(cityKey, id) {
    return markFeatureDeleted(CUSTOM_DISTRICTS_FILE, cityKey, String(id));
  }

  static deleteRoute(cityKey, id) {
    return markFeatureDeleted(CUSTOM_ROUTES_FILE, cityKey, String(id));
  }

  /**
   * Difficultés forcées d'une ville, indexées par nom de rue en minuscules.
   * En mode PostgreSQL, les lignes de la base priment sur le fichier.
   * @param {string} cityKey
   * @returns {Promise<Record<string, string>>}
   */
  static async getDifficultyOverrides(cityKey) {
    const all = await readJsonFile(DIFFICULTY_OVERRIDES_FILE, {});
    const overrides = { ...(all[cityKey] || {}) };
    if (isDatabaseEnabled()) {
      const result = await pool.query(
        'SELECT street_name, difficulty FROM route_difficulties WHERE city_key = $1',
        [cityKey],
      );
      for (const row of result.rows) {
        overrides[normalizeStreetName(row.street_name)] = row.difficulty;
      }
    }
    return overrides;
  }

  /**
   * Force la difficulté d'une rue, ou la remet en automatique si `difficulty`
   * n'est pas une difficulté manuelle (null, 'auto'...).
   * @returns {Promise<string|null>} La difficulté enregistrée.
   */
  static async setDifficultyOverride(cityKey, streetName, difficulty) {
    const nameKey = normalizeStreetName(streetName);
    const value = MANUAL_DIFFICULTIES.includes(difficulty) ? difficulty : null;

    if (isDatabaseEnabled()) {
      if (value) {
        await pool.query(
          `INSERT INTO route_difficulties (city_key, street_name, difficulty, updated_at)
           VALUES ($1, $2, $3, NOW())
           ON CONFLICT (city_key, street_name) DO UPDATE SET difficulty = $3, updated_at = NOW()`,
          [cityKey, nameKey, value],
        );
      } else {
        await pool.query(
          'DELETE FROM route_difficulties WHERE city_key = $1 AND street_name = $2',
          [cityKey, nameKey],
        );
      }
    }

    await updateJsonFile(DIFFICULTY_OVERRIDES_FILE, {}, (all) => {
      if (!all[cityKey] || typeof all[cityKey] !== 'object') all[cityKey] = {};
      if (value) {
        all[cityKey][nameKey] = value;
      } else {
        delete all[cityKey][nameKey];
      }
    });
    return value;
  }
}
