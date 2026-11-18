import { ModeratorApplication } from '../models/ModeratorApplication.js';
import { City } from '../models/City.js';
import { User } from '../models/User.js';
import { isValidCityKey } from '../config/paths.js';

const MAX_MOTIVATION_LENGTH = 1000;
const REVIEW_STATUSES = ['approved', 'rejected', 'revoked'];

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

      const existing = await ModeratorApplication.findActive(user.username, cityKey);
      if (existing) {
        return res.status(409).json({ error: 'Application already exists', application: existing });
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
      console.error('ModerationController apply error:', err);
      return res.status(500).json({ error: 'Failed to create application' });
    }
  }

  static async getMine(req, res) {
    try {
      const user = await User.findForSession(req.user);
      if (!user) return res.json({ applications: [], cities: [] });
      const [applications, cities] = await Promise.all([
        ModeratorApplication.findByUsername(user.username),
        ModeratorApplication.getModeratedCities(user.username),
      ]);
      return res.json({ applications, cities });
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
      if (!application) {
        return res.status(404).json({ error: 'Application not found' });
      }
      return res.json({ application });
    } catch (err) {
      console.error('ModerationController review error:', err);
      return res.status(500).json({ error: 'Failed to update application' });
    }
  }
}
