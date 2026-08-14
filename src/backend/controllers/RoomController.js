import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/database.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

export class RoomController {
  static async createRoom(req, res) {
    try {
      const { cityKey, difficulty, seriesCount, mode, validityHours } = req.body;
      const username = req.user.username;

      if (!cityKey || !difficulty) {
        return res.status(400).json({ error: 'cityKey and difficulty are required' });
      }

      const parsed = parseInt(seriesCount, 10);
      const cleanSeriesCount = (!isNaN(parsed) && parsed >= 1 && parsed <= 50) ? parsed : 10;
      const cleanMode = (mode === 'identify' || mode === 'target') ? mode : 'target';

      const parsedValidity = parseInt(validityHours, 10);
      const cleanValidityHours = (!isNaN(parsedValidity) && [1, 24, 168].includes(parsedValidity)) ? parsedValidity : 24;
      const expiresAt = new Date(Date.now() + cleanValidityHours * 3600 * 1000);

      let code;
      let codeUnique = false;
      let attempts = 0;

      while (!codeUnique && attempts < 10) {
        code = crypto.randomBytes(3).toString('hex').toUpperCase();
        const check = await pool.query('SELECT 1 FROM rooms WHERE code = $1', [code]);
        if (check.rows.length === 0) {
          codeUnique = true;
        }
        attempts++;
      }

      if (!codeUnique) {
        return res.status(500).json({ error: 'Failed to generate a unique room code' });
      }

      const testId = Math.floor(Math.random() * 1000000) + 1;

      const roomRes = await pool.query(
        `INSERT INTO rooms (code, city_key, difficulty, test_id, created_by, status, series_count, mode, expires_at)
         VALUES ($1, $2, $3, $4, $5, 'waiting', $6, $7, $8)
         RETURNING *`,
        [code, cityKey, difficulty, testId, username, cleanSeriesCount, cleanMode, expiresAt]
      );

      const room = roomRes.rows[0];

      await pool.query(
        `INSERT INTO room_participants (room_code, username)
         VALUES ($1, $2)
         ON CONFLICT (room_code, username) DO NOTHING`,
        [code, username]
      );

      return res.status(201).json({
        roomCode: room.code,
        cityKey: room.city_key,
        difficulty: room.difficulty,
        mode: room.mode,
        testId: room.test_id,
        createdBy: room.created_by,
        status: room.status,
        seriesCount: room.series_count,
        expiresAt: room.expires_at
      });
    } catch (error) {
      console.error('Create Room Error:', error);
      return res.status(500).json({ error: 'Internal server error during room creation' });
    }
  }

  static async joinRoom(req, res) {
    try {
      const { code } = req.params;
      const username = req.user.username;

      if (!code) {
        return res.status(400).json({ error: 'Room code is required' });
      }

      const upperCode = code.trim().toUpperCase();

      const roomRes = await pool.query('SELECT * FROM rooms WHERE code = $1', [upperCode]);
      if (roomRes.rows.length === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const room = roomRes.rows[0];

      if (room.expires_at && new Date() > new Date(room.expires_at)) {
        return res.status(410).json({ error: 'Ce salon a expiré (durée de validité dépassée).' });
      }

      await pool.query(
        `INSERT INTO room_participants (room_code, username)
         VALUES ($1, $2)
         ON CONFLICT (room_code, username) DO NOTHING`,
        [upperCode, username]
      );

      return res.json({
        roomCode: room.code,
        cityKey: room.city_key,
        difficulty: room.difficulty,
        mode: room.mode,
        testId: room.test_id,
        createdBy: room.created_by,
        status: room.status,
        seriesCount: room.series_count,
        expiresAt: room.expires_at
      });
    } catch (error) {
      console.error('Join Room Error:', error);
      return res.status(500).json({ error: 'Internal server error during room join' });
    }
  }

  static async getRoom(req, res) {
    try {
      const { code } = req.params;
      if (!code) {
        return res.status(400).json({ error: 'Room code is required' });
      }

      const upperCode = code.trim().toUpperCase();

      const roomRes = await pool.query('SELECT * FROM rooms WHERE code = $1', [upperCode]);
      if (roomRes.rows.length === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const room = roomRes.rows[0];

      if (room.expires_at && new Date() > new Date(room.expires_at)) {
        return res.status(410).json({ error: 'Ce salon a expiré (durée de validité dépassée).' });
      }

      let cityData = null;
      try {
        const cityPath = path.join(dirname, '..', '..', '..', 'public', 'assets', 'data', `${room.city_key}.json`);
        const fileContent = await fs.readFile(cityPath, 'utf8');
        const cityJson = JSON.parse(fileContent);
        cityData = {
          key: room.city_key,
          name: cityJson.name || room.city_key,
          bbox: cityJson.bbox,
          center: cityJson.center,
          osmId: cityJson.osmId
        };
      } catch (err) {
        try {
          const configCitiesPath = path.join(dirname, '..', '..', '..', 'config', 'cities.json');
          const configContent = await fs.readFile(configCitiesPath, 'utf8');
          const configCities = JSON.parse(configContent);
          const found = configCities.find(c => c.key === room.city_key);
          if (found) {
            cityData = found;
          }
        } catch (e) {}
      }

      if (!cityData) {
        cityData = {
          key: room.city_key,
          name: room.city_key,
          bbox: null,
          center: null,
          osmId: null
        };
      }

      const participantsRes = await pool.query(
        `SELECT username, score, finished, joined_at 
         FROM room_participants 
         WHERE room_code = $1 
         ORDER BY joined_at ASC`,
        [upperCode]
      );

      return res.json({
        roomCode: room.code,
        cityKey: room.city_key,
        difficulty: room.difficulty,
        mode: room.mode,
        testId: room.test_id,
        createdBy: room.created_by,
        status: room.status,
        participants: participantsRes.rows,
        cityData,
        seriesCount: room.series_count,
        expiresAt: room.expires_at
      });
    } catch (error) {
      console.error('Get Room Error:', error);
      return res.status(500).json({ error: 'Internal server error fetching room details' });
    }
  }

  static async startRoomGame(req, res) {
    try {
      const { code } = req.params;
      const username = req.user.username;

      if (!code) {
        return res.status(400).json({ error: 'Room code is required' });
      }

      const upperCode = code.trim().toUpperCase();

      const roomRes = await pool.query('SELECT * FROM rooms WHERE code = $1', [upperCode]);
      if (roomRes.rows.length === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const room = roomRes.rows[0];

      if (room.created_by !== username) {
        return res.status(403).json({ error: 'Only the room creator can start the game' });
      }

      await pool.query(
        "UPDATE rooms SET status = 'playing' WHERE code = $1",
        [upperCode]
      );

      return res.json({ message: 'Game started successfully' });
    } catch (error) {
      console.error('Start Room Game Error:', error);
      return res.status(500).json({ error: 'Internal server error starting room game' });
    }
  }

  static async submitRoomScore(req, res) {
    try {
      const { code } = req.params;
      const { score } = req.body;
      const username = req.user.username;

      if (!code || score === undefined) {
        return res.status(400).json({ error: 'Room code and score are required' });
      }

      const upperCode = code.trim().toUpperCase();

      const result = await pool.query(
        `UPDATE room_participants 
         SET score = $1, finished = true 
         WHERE room_code = $2 AND username = $3
         RETURNING *`,
        [parseInt(score, 10), upperCode, username]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Participant not found in this room' });
      }

      const allParts = await pool.query(
        'SELECT finished FROM room_participants WHERE room_code = $1',
        [upperCode]
      );

      const allFinished = allParts.rows.every(p => p.finished);
      if (allFinished) {
        await pool.query(
          "UPDATE rooms SET status = 'finished' WHERE code = $1",
          [upperCode]
        );
      }

      return res.json({ message: 'Score submitted successfully', participant: result.rows[0] });
    } catch (error) {
      console.error('Submit Room Score Error:', error);
      return res.status(500).json({ error: 'Internal server error submitting room score' });
    }
  }

  static async resetRoom(req, res) {
    try {
      const { code } = req.params;
      const username = req.user.username;
      const isAdmin = req.user.is_admin === true;

      if (!code) {
        return res.status(400).json({ error: 'Room code is required' });
      }

      const upperCode = code.trim().toUpperCase();

      const roomRes = await pool.query('SELECT * FROM rooms WHERE code = $1', [upperCode]);
      if (roomRes.rows.length === 0) {
        return res.status(404).json({ error: 'Room not found' });
      }

      const room = roomRes.rows[0];

      if (room.created_by !== username && !isAdmin) {
        return res.status(403).json({ error: 'Only the room creator or an admin can reset the room' });
      }

      await pool.query(
        "UPDATE rooms SET status = 'waiting' WHERE code = $1",
        [upperCode]
      );

      await pool.query(
        'UPDATE room_participants SET finished = false, score = 0 WHERE room_code = $1',
        [upperCode]
      );

      return res.json({ message: 'Room reset successfully with same test streets' });
    } catch (error) {
      console.error('Reset Room Error:', error);
      return res.status(500).json({ error: 'Internal server error resetting room' });
    }
  }
}
