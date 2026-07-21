import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export class AuthController {
  static async register(req, res) {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await User.create(username, hashedPassword);

      res.status(201).json({ message: 'User registered successfully', id: user.id });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Username already exists' });
      }
      res.status(500).json({ error: error.message });
    }
  }

  static async login(req, res) {
    try {
      const { username, password } = req.body;

      const user = await User.findByUsername(username);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const secret = process.env.JWT_SECRET || 'fallback_secret';
      const token = jwt.sign({ id: user.id, username: user.username }, secret, { expiresIn: '24h' });
      res.json({ token, username: user.username });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}
