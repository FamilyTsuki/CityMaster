import {
  ApplicationError,
  MAX_PENDING_PER_USER,
  ModeratorApplication,
} from '../models/ModeratorApplication.js';
import { City } from '../models/City.js';
import { User, ROLES } from '../models/User.js';
import { StaffService } from '../services/StaffService.js';
import { isValidCityKey } from '../config/paths.js';

const MAX_MOTIVATION_LENGTH = 1000;
const REVIEW_STATUSES = ['approved', 'rejected', 'revoked'];

function sameUsername(a, b) {
  return (a || '').toLowerCase().trim() === (b || '').toLowerCase().trim();
}

async function staffEntry(user) {
  const access = await StaffService.getAccess(user);
  return { id: user.id, username: user.username, role: access.role, cities: access.cities };
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export class ModerationController {
  /**
   * Dépose une candidature pour modérer une commune. Un joueur ne peut avoir
   * qu'une candidature en attente ou acceptée par commune.
   */
  static async apply(req, res) {
    try {
      const user = await User.findForSession(req.user);
      if (!user) {
        return res.status(403).json({ error: 'Un compte joueur est nécessaire pour candidater' });
      }

      const { cityKey, motivation } = req.body || {};
      if (!isValidCityKey(cityKey)) {
        return res.status(400).json({ error: 'cityKey is required' });
      }
      const city = await City.getByKey(cityKey);
      if (!city) {
        return res.status(404).json({ error: 'City not found' });
      }

      const cleanMotivation =
        typeof motivation === 'string' && motivation.trim()
          ? motivation.trim().slice(0, MAX_MOTIVATION_LENGTH)
          : null;

      const application = await ModeratorApplication.create({
        username: user.username,
        cityKey,
        cityName: city.name || cityKey,
        motivation: cleanMotivation,
      });
      return res.status(201).json({ application });
    } catch (err) {
      if (err instanceof ApplicationError && err.code === 'DUPLICATE') {
        return res.status(409).json({ error: 'Application already exists' });
      }
      if (err instanceof ApplicationError && err.code === 'TOO_MANY_PENDING') {
        return res
          .status(429)
          .json({ error: `At most ${MAX_PENDING_PER_USER} pending applications per player` });
      }
      console.error('ModerationController apply error:', err);
      return res.status(500).json({ error: 'Failed to create application' });
    }
  }

  static async getMine(req, res) {
    try {
      const user = await User.findForSession(req.user);
      if (!user) return res.json({ applications: [], cities: [], role: 'player' });
      const [applications, access] = await Promise.all([
        ModeratorApplication.findByUsername(user.username),
        StaffService.getAccess(user),
      ]);
      return res.json({ applications, cities: access.cities, role: access.role });
    } catch (err) {
      console.error('ModerationController getMine error:', err);
      return res.status(500).json({ error: 'Failed to retrieve applications' });
    }
  }

  static async getAll(req, res) {
    try {
      return res.json(await ModeratorApplication.getAll(req.query.status));
    } catch (err) {
      console.error('ModerationController getAll error:', err);
      return res.status(500).json({ error: 'Failed to retrieve applications' });
    }
  }

  static async review(req, res) {
    try {
      const id = parseId(req.params.id);
      const { status } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'Invalid application id' });
      }
      if (!REVIEW_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided' });
      }
      const application = await ModeratorApplication.updateStatus(id, status, req.user.username);
      const city = { key: application.city_key, name: application.city_name };
      if (status === 'approved') {
        await StaffService.grantCity(application.username, city, req.user.username);
      } else if (status === 'revoked') {
        await StaffService.revokeCity(application.username, city.key, req.user.username);
      }
      return res.json({ application });
    } catch (err) {
      if (err instanceof ApplicationError && err.code === 'NOT_FOUND') {
        return res.status(404).json({ error: 'Application not found' });
      }
      if (err instanceof ApplicationError && err.code === 'INVALID_TRANSITION') {
        return res.status(409).json({ error: 'Status change not allowed' });
      }
      console.error('ModerationController review error:', err);
      return res.status(500).json({ error: 'Failed to update application' });
    }
  }

  /** Comptes de l'équipe (rôle autre que joueur) et leurs communes. */
  static async getStaff(req, res) {
    try {
      return res.json(await StaffService.listStaff());
    } catch (err) {
      console.error('ModerationController getStaff error:', err);
      return res.status(500).json({ error: 'Failed to retrieve staff' });
    }
  }

  static async setRole(req, res) {
    try {
      const { role } = req.body || {};
      if (!ROLES.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }
      if (sameUsername(req.params.username, req.user.username) && role !== 'admin') {
        return res.status(400).json({ error: 'An administrator cannot remove their own role' });
      }
      const user = await StaffService.setRole(req.params.username, role, req.user.username);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: await staffEntry(user) });
    } catch (err) {
      console.error('ModerationController setRole error:', err);
      return res.status(500).json({ error: 'Failed to update role' });
    }
  }

  static async grantCity(req, res) {
    try {
      const { cityKey } = req.body || {};
      if (!isValidCityKey(cityKey)) {
        return res.status(400).json({ error: 'cityKey is required' });
      }
      const city = await City.getByKey(cityKey);
      if (!city) return res.status(404).json({ error: 'City not found' });
      const user = await StaffService.grantCity(
        req.params.username,
        { key: cityKey, name: city.name || cityKey },
        req.user.username,
      );
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: await staffEntry(user) });
    } catch (err) {
      console.error('ModerationController grantCity error:', err);
      return res.status(500).json({ error: 'Failed to grant city' });
    }
  }

  static async revokeCity(req, res) {
    try {
      if (!isValidCityKey(req.params.cityKey)) {
        return res.status(400).json({ error: 'Invalid cityKey' });
      }
      const user = await StaffService.revokeCity(req.params.username, req.params.cityKey, req.user.username);
      if (!user) return res.status(404).json({ error: 'User not found' });
      return res.json({ user: await staffEntry(user) });
    } catch (err) {
      console.error('ModerationController revokeCity error:', err);
      return res.status(500).json({ error: 'Failed to revoke city' });
    }
  }
}
