import { CityCustomization, MANUAL_DIFFICULTIES } from '../models/CityCustomization.js';
import { Settings } from '../models/Settings.js';
import { Report } from '../models/Report.js';
import { EditService } from '../services/EditService.js';
import { isValidCityKey } from '../config/paths.js';

const LINE_GEOMETRIES = ['LineString', 'MultiLineString'];

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

function badCityKey(res) {
  return res.status(400).json({ error: 'cityKey is required' });
}

/**
 * Signalement corrigé par cette modification : gardé seulement s'il existe
 * et porte sur la même commune.
 */
async function linkedReportId(value, cityKey) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  const report = await Report.findById(id);
  return report && report.city_key === cityKey ? id : null;
}

/**
 * Applique la modification ou, pour un modérateur, crée une proposition
 * (202). `onApplied` construit la réponse habituelle de la route.
 */
async function submitEdit(req, res, edit, onApplied) {
  const reportId = await linkedReportId(req.body?.reportId ?? req.query?.reportId, edit.cityKey);
  const result = await EditService.submit(edit, {
    username: req.user.username,
    access: req.access,
    reportId,
  });
  if (result.proposal) {
    return res.status(202).json({ message: 'Proposal submitted', proposal: result.proposal });
  }
  return res.json({ ...onApplied(), historyId: result.history.id });
}

export class AdminController {
  static async getDistricts(req, res) {
    try {
      const { cityKey } = req.query;
      if (!isValidCityKey(cityKey)) return badCityKey(res);
      return res.json(await CityCustomization.getDistricts(cityKey));
    } catch (err) {
      console.error('AdminController getDistricts error:', err);
      return res.status(500).json({ error: 'Internal server error getting districts' });
    }
  }

  static async saveDistrict(req, res) {
    try {
      const { cityKey, district } = req.body || {};
      if (
        !isValidCityKey(cityKey) ||
        !district ||
        typeof district.name !== 'string' ||
        !district.name.trim() ||
        !Array.isArray(district.coordinates)
      ) {
        return res
          .status(400)
          .json({ error: 'cityKey and valid district payload are required' });
      }

      const feature = {
        type: 'Feature',
        properties: {
          id: district.id || generateId('district'),
          name: district.name.trim(),
          originalName: district.originalName || undefined,
          isLotissement: true,
          isCustom: true,
          itemType: 'lotissement',
          color: district.color || '#f59e0b',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [district.coordinates],
        },
      };

      const edit = {
        cityKey,
        itemType: 'district',
        action: 'save',
        payload: { feature, originalName: district.originalName || null },
      };
      return await submitEdit(req, res, edit, () => ({ message: 'District saved successfully', feature }));
    } catch (err) {
      console.error('AdminController saveDistrict error:', err);
      return res.status(500).json({ error: 'Internal server error saving district' });
    }
  }

  static async deleteDistrict(req, res) {
    try {
      const { cityKey, id } = req.params;
      if (!isValidCityKey(cityKey) || !id) {
        return res.status(400).json({ error: 'cityKey and id are required' });
      }
      const edit = { cityKey, itemType: 'district', action: 'delete', payload: { id: String(id) } };
      return await submitEdit(req, res, edit, () => ({ message: 'District deleted successfully' }));
    } catch (err) {
      console.error('AdminController deleteDistrict error:', err);
      return res.status(500).json({ error: 'Internal server error deleting district' });
    }
  }

  static async getRoutes(req, res) {
    try {
      const { cityKey } = req.query;
      if (!isValidCityKey(cityKey)) return badCityKey(res);
      return res.json(await CityCustomization.getRoutes(cityKey));
    } catch (err) {
      console.error('AdminController getRoutes error:', err);
      return res.status(500).json({ error: 'Internal server error getting routes' });
    }
  }

  static async getRouteDifficulties(req, res) {
    try {
      const { cityKey } = req.query;
      if (!isValidCityKey(cityKey)) return badCityKey(res);
      return res.json(await CityCustomization.getDifficultyOverrides(cityKey));
    } catch (err) {
      console.error('AdminController getRouteDifficulties error:', err);
      return res.status(500).json({ error: 'Internal server error getting difficulties' });
    }
  }

  static async setRouteDifficulty(req, res) {
    try {
      const { cityKey, streetName, difficulty } = req.body || {};
      if (!isValidCityKey(cityKey) || typeof streetName !== 'string' || !streetName.trim()) {
        return res.status(400).json({ error: 'cityKey and streetName are required' });
      }

      const saved = MANUAL_DIFFICULTIES.includes(difficulty) ? difficulty : null;
      const edit = {
        cityKey,
        itemType: 'difficulty',
        action: 'save',
        payload: { streetName: streetName.trim(), difficulty: saved },
      };
      return await submitEdit(req, res, edit, () => ({ success: true, cityKey, streetName, difficulty: saved }));
    } catch (err) {
      console.error('AdminController setRouteDifficulty error:', err);
      return res.status(500).json({ error: 'Internal server error setting difficulty' });
    }
  }

  static async saveRoute(req, res) {
    try {
      const { cityKey, route } = req.body || {};
      const hasGeometry =
        route?.geometry &&
        LINE_GEOMETRIES.includes(route.geometry.type) &&
        Array.isArray(route.geometry.coordinates);
      const hasCoordinates = Array.isArray(route?.coordinates);

      if (
        !isValidCityKey(cityKey) ||
        !route ||
        typeof route.name !== 'string' ||
        !route.name.trim() ||
        (!hasGeometry && !hasCoordinates)
      ) {
        return res
          .status(400)
          .json({ error: 'cityKey and valid route payload are required' });
      }

      const feature = {
        type: 'Feature',
        properties: {
          id: route.id || generateId('route'),
          name: route.name.trim(),
          originalName: route.originalName || undefined,
          isCustom: true,
          itemType: 'route',
        },
        geometry: hasGeometry
          ? route.geometry
          : { type: 'LineString', coordinates: route.coordinates },
      };

      const payload = { feature, originalName: route.originalName || null };
      if (route.difficulty !== undefined) {
        payload.difficulty = MANUAL_DIFFICULTIES.includes(route.difficulty) ? route.difficulty : null;
        if (payload.difficulty) feature.properties.difficulty = payload.difficulty;
      }

      const edit = { cityKey, itemType: 'route', action: 'save', payload };
      return await submitEdit(req, res, edit, () => ({ message: 'Route saved successfully', feature }));
    } catch (err) {
      console.error('AdminController saveRoute error:', err);
      return res.status(500).json({ error: 'Internal server error saving route' });
    }
  }

  static async deleteRoute(req, res) {
    try {
      const { cityKey, id } = req.params;
      if (!isValidCityKey(cityKey) || !id) {
        return res.status(400).json({ error: 'cityKey and id are required' });
      }
      const edit = { cityKey, itemType: 'route', action: 'delete', payload: { id: String(id) } };
      return await submitEdit(req, res, edit, () => ({ message: 'Route deleted successfully' }));
    } catch (err) {
      console.error('AdminController deleteRoute error:', err);
      return res.status(500).json({ error: 'Internal server error deleting route' });
    }
  }

  static async getSettings(req, res) {
    try {
      return res.json(await Settings.getAll());
    } catch (err) {
      console.error('AdminController getSettings error:', err);
      return res.status(500).json({ error: 'Internal server error getting settings' });
    }
  }

  static async saveSettings(req, res) {
    try {
      const { key, value } = req.body || {};
      if (!Settings.isValid(key, value)) {
        return res.status(400).json({ error: 'Unknown setting or invalid value' });
      }
      await Settings.set(key, value);
      return res.json({ success: true });
    } catch (err) {
      console.error('AdminController saveSettings error:', err);
      return res.status(500).json({ error: 'Internal server error saving settings' });
    }
  }
}
