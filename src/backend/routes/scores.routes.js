import express from 'express';
import pool from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM scores ORDER BY score DESC LIMIT 100');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { player, score, date } = req.body;
    if (!player || score === undefined) {
      return res.status(400).json({ error: 'Player and score are required' });
    }

    const insertDate = date || new Date().toISOString();
    
    const result = await pool.query(
      'INSERT INTO scores (player, score, date) VALUES ($1, $2, $3) RETURNING *',
      [player, score, insertDate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
