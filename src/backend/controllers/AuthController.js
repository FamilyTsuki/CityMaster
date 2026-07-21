import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export class AuthController {
  static async register(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Username and password are required' });
      }

      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3 || trimmedUsername.length > 30) {
        return res.status(400).json({ error: 'Username must be between 3 and 30 characters long' });
      }

      const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!validUsernameRegex.test(trimmedUsername)) {
        return res.status(400).json({ error: 'Username can only contain alphanumeric characters, underscores, and hyphens' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create(trimmedUsername, hashedPassword);

      return res.status(201).json({ message: 'User registered successfully', id: user.id });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Username already exists' });
      }
      return res.status(500).json({ error: 'Internal server error during registration' });
    }
  }

  static async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
        return res.status(400).json({ error: 'Invalid credentials format' });
      }

      const trimmedUsername = username.trim();
      const user = await User.findByUsername(trimmedUsername);
      if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Invalid username or password' });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ error: 'Server security configuration error' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        secret,
        { expiresIn: '24h' }
      );

      return res.json({ token, username: user.username });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  }
}
