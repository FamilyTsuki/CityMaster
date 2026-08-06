import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User.js';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
        { id: user.id, username: user.username, is_admin: user.is_admin },
        secret,
        { expiresIn: '30d' }
      );

      return res.json({ token, username: user.username, isAdmin: user.is_admin });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  }

  static async googleLogin(req, res) {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: 'Google credential missing' });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return res.status(500).json({ error: 'Google Client ID not configured on server' });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      const googleId = payload['sub'];
      const email = payload['email'];
      const name = payload['name'];
      const picture = payload['picture'];

      let user = await User.findByGoogleId(googleId);
      
      if (!user) {
        let baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '');
        if (baseUsername.length < 3) baseUsername += 'user';
        
        let username = baseUsername;
        let suffix = 1;
        while (await User.findByUsername(username)) {
          username = `${baseUsername}${suffix}`;
          suffix++;
        }

        user = await User.createGoogleUser(username, googleId, picture);
      }

      const secret = process.env.JWT_SECRET;
      const token = jwt.sign(
        { id: user.id, username: user.username, is_admin: user.is_admin },
        secret,
        { expiresIn: '30d' }
      );

      return res.json({ token, username: user.username, profile_image_url: user.profile_image_url || picture, isAdmin: user.is_admin });
    } catch (error) {
      console.error('Google Auth Error:', error);
      return res.status(401).json({ error: 'Invalid Google token' });
    }
  }

  static async guestLogin(req, res) {
    try {
      const { username } = req.body;
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username is required' });
      }
      const trimmedUsername = username.trim();
      if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
        return res.status(400).json({ error: 'Username must be between 3 and 20 characters' });
      }
      const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
      if (!validUsernameRegex.test(trimmedUsername)) {
        return res.status(400).json({ error: 'Username can only contain alphanumeric characters, underscores, and hyphens' });
      }

      const existingUser = await User.findByUsername(trimmedUsername);
      if (existingUser) {
        return res.status(409).json({ error: 'This username is already taken by a registered player' });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ error: 'Server security configuration error' });
      }

      const token = jwt.sign(
        { id: null, username: trimmedUsername, is_admin: false, is_guest: true },
        secret,
        { expiresIn: '3h' }
      );

      return res.json({ token, username: trimmedUsername, isGuest: true });
    } catch (error) {
      console.error('Guest Auth Error:', error);
      return res.status(500).json({ error: 'Internal server error during guest login' });
    }
  }
}
