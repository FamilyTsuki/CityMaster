import { Report } from '../models/Report.js';

const VALID_STATUSES = ['pending', 'resolved', 'dismissed'];
const MAX_DESCRIPTION_LENGTH = 2000;

function parseReportId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Normalise un champ texte optionnel : chaîne non vide tronquée, sinon null.
 * Les longueurs correspondent aux colonnes de la table `reports`.
 */
function optionalText(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export class ReportController {
  static async createReport(req, res) {
    try {
      const { username, cityKey, targetStreet, clickedStreet, gameMode, difficulty, category, description } =
        req.body || {};

      const cleanCategory = optionalText(category, 100);
      const cleanDescription = optionalText(description, MAX_DESCRIPTION_LENGTH);
      if (!cleanCategory || !cleanDescription) {
        return res.status(400).json({ error: 'Category and description are required' });
      }

      const activeUser = req.user ? req.user.username : optionalText(username, 255) || 'Anonymous';

      const report = await Report.create({
        username: activeUser,
        cityKey: optionalText(cityKey, 255),
        targetStreet: optionalText(targetStreet, 255),
        clickedStreet: optionalText(clickedStreet, 255),
        gameMode: optionalText(gameMode, 50),
        difficulty: optionalText(difficulty, 50),
        category: cleanCategory,
        description: cleanDescription,
      });

      return res.status(201).json({ message: 'Report created successfully', report });
    } catch (err) {
      console.error('ReportController createReport error:', err);
      return res.status(500).json({ error: 'Failed to create report' });
    }
  }

  static async getReports(req, res) {
    try {
      const reports = await Report.getAll(req.query.status);
      return res.json(reports);
    } catch (err) {
      console.error('ReportController getReports error:', err);
      return res.status(500).json({ error: 'Failed to retrieve reports' });
    }
  }

  static async updateReportStatus(req, res) {
    try {
      const id = parseReportId(req.params.id);
      const { status } = req.body || {};

      if (!id) {
        return res.status(400).json({ error: 'Invalid report id' });
      }
      if (!status || !VALID_STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided' });
      }

      const updatedReport = await Report.updateStatus(id, status);
      if (!updatedReport) {
        return res.status(404).json({ error: 'Report not found' });
      }
      return res.json({ message: 'Report status updated', report: updatedReport });
    } catch (err) {
      console.error('ReportController updateReportStatus error:', err);
      return res.status(500).json({ error: 'Failed to update report status' });
    }
  }

  static async deleteReport(req, res) {
    try {
      const id = parseReportId(req.params.id);
      if (!id) {
        return res.status(400).json({ error: 'Invalid report id' });
      }
      const deleted = await Report.delete(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Report not found' });
      }
      return res.json({ message: 'Report deleted successfully' });
    } catch (err) {
      console.error('ReportController deleteReport error:', err);
      return res.status(500).json({ error: 'Failed to delete report' });
    }
  }
}
