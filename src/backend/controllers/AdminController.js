import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const districtsFilePath = path.join(dirname, '..', '..', '..', 'public', 'assets', 'data', 'custom_districts.json');

async function readDistrictsFile() {
  try {
    const content = await fs.readFile(districtsFilePath, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

async function writeDistrictsFile(data) {
  await fs.writeFile(districtsFilePath, JSON.stringify(data, null, 2), 'utf8');
}

export class AdminController {
  static async getDistricts(req, res) {
    try {
      const { cityKey } = req.query;
      if (!cityKey) {
        return res.status(400).json({ error: 'cityKey is required' });
      }

      const allData = await readDistrictsFile();
      const cityDistricts = allData[cityKey] || [];
      return res.json(cityDistricts);
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error getting districts' });
    }
  }

  static async saveDistrict(req, res) {
    try {
      const { cityKey, district } = req.body;
      if (!cityKey || !district || !district.name || !district.coordinates || !Array.isArray(district.coordinates)) {
        return res.status(400).json({ error: 'cityKey and valid district payload are required' });
      }

      const allData = await readDistrictsFile();
      if (!allData[cityKey]) {
        allData[cityKey] = [];
      }

      const districtId = district.id || `district_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const feature = {
        type: 'Feature',
        properties: {
          id: districtId,
          name: district.name.trim(),
          isLotissement: true,
          isCustom: true,
          itemType: 'lotissement',
          color: district.color || '#f59e0b'
        },
        geometry: {
          type: 'Polygon',
          coordinates: [district.coordinates]
        }
      };

      const existingIndex = allData[cityKey].findIndex(d => d.properties && d.properties.id === districtId);
      if (existingIndex >= 0) {
        allData[cityKey][existingIndex] = feature;
      } else {
        allData[cityKey].push(feature);
      }

      await writeDistrictsFile(allData);
      return res.json({ message: 'District saved successfully', feature });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error saving district' });
    }
  }

  static async deleteDistrict(req, res) {
    try {
      const { cityKey, id } = req.params;
      if (!cityKey || !id) {
        return res.status(400).json({ error: 'cityKey and id are required' });
      }

      const allData = await readDistrictsFile();
      if (allData[cityKey]) {
        allData[cityKey] = allData[cityKey].filter(d => d.properties && d.properties.id !== id);
        await writeDistrictsFile(allData);
      }

      return res.json({ message: 'District deleted successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error deleting district' });
    }
  }

  static async getSettings(req, res) {
    try {
      const result = await pool.query('SELECT key, value FROM global_settings');
      const settings = {};
      for (const row of result.rows) {
        settings[row.key] = row.value;
      }
      return res.json(settings);
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error getting settings' });
    }
  }

  static async saveSettings(req, res) {
    try {
      const { key, value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ error: 'key and value are required' });
      }
      await pool.query(
        'INSERT INTO global_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [key, value]
      );
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Internal server error saving settings' });
    }
  }
}
