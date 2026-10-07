import jwt from "jsonwebtoken";
import { User, isUserAdmin } from "../models/User.js";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res
      .status(500)
      .json({ error: "Server security configuration error" });
  }

  jwt.verify(token, secret, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

export const requireAdmin = (req, res, next) => {
  authenticateToken(req, res, async () => {
    if (!req.user) {
      return res.status(403).json({ error: "Admin access required" });
    }
    if (isUserAdmin(req.user)) {
      req.user.is_admin = true;
      return next();
    }
    if (req.user.id || req.user.username) {
      try {
        let dbUser = null;
        if (req.user.id) {
          dbUser = await User.findById(req.user.id);
        }
        if (!dbUser && req.user.username) {
          dbUser = await User.findByUsername(req.user.username);
        }
        if (dbUser && isUserAdmin(dbUser)) {
          req.user.is_admin = true;
          return next();
        }
      } catch (err) {
        console.error("Error checking admin status in User model:", err);
      }
    }
    return res.status(403).json({ error: "Admin access required" });
  });
};
