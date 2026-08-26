import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Server security configuration error' });
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

export const requireAdmin = (req, res, next) => {
  authenticateToken(req, res, async () => {
    if (!req.user) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    if (req.user.is_admin) {
      return next();
    }
    if (req.user.id || req.user.username) {
      try {
        let userRes;
        if (req.user.id) {
          userRes = await pool.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
        } else {
          userRes = await pool.query('SELECT is_admin FROM users WHERE username = $1', [req.user.username]);
        }
        if (userRes && userRes.rows.length > 0 && userRes.rows[0].is_admin) {
          req.user.is_admin = true;
          return next();
        }
      } catch (err) {
        console.error('Error checking admin status in DB:', err);
      }
    }
    return res.status(403).json({ error: 'Admin access required' });
  });
};
