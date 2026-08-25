import { Report } from '../models/Report.js';

export class ReportController {
  static async createReport(req, res) {
    try {
      const {
        username,
        cityKey,
        targetStreet,
        clickedStreet,
        gameMode,
        difficulty,
        category,
        description
      } = req.body;

      if (!category || !description || !description.trim()) {
        return res.status(400).json({ error: 'Category and description are required' });
      }

      const activeUser = req.user ? req.user.username : (username || 'Anonymous');

      const report = await Report.create({
        username: activeUser,
        cityKey,
        targetStreet,
        clickedStreet,
        gameMode,
        difficulty,
        category: category.trim(),
        description: description.trim()
      });

      return res.status(201).json({ message: 'Report created successfully', report });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create report' });
    }
  }

  static async getReports(req, res) {
    try {
      const { status } = req.query;
      const reports = await Report.getAll(status);
      return res.json(reports);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to retrieve reports' });
    }
  }

  static async updateReportStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending', 'resolved', 'dismissed'];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status provided' });
      }

      const updatedReport = await Report.updateStatus(id, status);
      return res.json({ message: 'Report status updated', report: updatedReport });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update report status' });
    }
  }

  static async deleteReport(req, res) {
    try {
      const { id } = req.params;
      await Report.delete(id);
      return res.json({ message: 'Report deleted successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete report' });
    }
  }
}
