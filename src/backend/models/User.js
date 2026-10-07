import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const usersFilePath = path.join(process.cwd(), "config", "users.json");

const memoryUsers = new Map();

async function readUsersFile() {
  try {
    const content = await fs.readFile(usersFilePath, "utf8");
    if (!content || !content.trim()) return [];
    return JSON.parse(content);
  } catch (e) {
    return [];
  }
}

async function writeUsersFile(users) {
  try {
    await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to write users.json:", e);
  }
}

export function getEnvAdmins() {
  const envAdmins = process.env.ADMIN_USERS || process.env.ADMINS || "";
  return envAdmins
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isUserAdmin(user) {
  if (!user) return false;
  if (user.is_admin === true || user.is_admin === "true") return true;
  const username = (user.username || "").toLowerCase().trim();
  const envAdmins = getEnvAdmins();
  return envAdmins.includes(username);
}

export class User {
  static async create(username, hashedPassword) {
    const isAdmin = isUserAdmin({ username });
    try {
      const result = await pool.query(
        "INSERT INTO users (username, password, is_admin) VALUES ($1, $2, $3) RETURNING id, username, profile_image_url, is_admin",
        [username, hashedPassword, isAdmin],
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === "23505") throw err;
      const fileUsers = await readUsersFile();
      const existing = fileUsers.find(
        (u) => u.username.toLowerCase() === username.toLowerCase(),
      );
      if (existing) {
        const error = new Error("Username already exists");
        error.code = "23505";
        throw error;
      }
      const maxId = fileUsers.reduce((m, u) => Math.max(m, u.id || 0), 0);
      const newUser = {
        id: maxId + 1,
        username,
        password: hashedPassword,
        profile_image_url: null,
        is_admin: isAdmin,
      };
      fileUsers.push(newUser);
      await writeUsersFile(fileUsers);
      memoryUsers.set(newUser.id, newUser);
      return newUser;
    }
  }

  static async findByUsername(username) {
    if (!username) return null;
    const lower = username.toLowerCase().trim();
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
        [username],
      );
      if (result.rows.length > 0) {
        const u = result.rows[0];
        if (!u.is_admin && isUserAdmin(u)) {
          u.is_admin = true;
        }
        return u;
      }
    } catch (err) {}

    const fileUsers = await readUsersFile();
    const fileUser = fileUsers.find(
      (u) => (u.username || "").toLowerCase().trim() === lower,
    );
    if (fileUser) {
      if (!fileUser.is_admin && isUserAdmin(fileUser)) {
        fileUser.is_admin = true;
      }
      return fileUser;
    }

    const memUser = [...memoryUsers.values()].find(
      (u) => (u.username || "").toLowerCase().trim() === lower,
    );
    if (memUser) {
      if (!memUser.is_admin && isUserAdmin(memUser)) {
        memUser.is_admin = true;
      }
      return memUser;
    }

    return null;
  }

  static async findById(id) {
    if (!id) return null;
    try {
      const result = await pool.query(
        "SELECT id, username, profile_image_url, is_admin FROM users WHERE id = $1",
        [id],
      );
      if (result.rows.length > 0) {
        const u = result.rows[0];
        if (!u.is_admin && isUserAdmin(u)) {
          u.is_admin = true;
        }
        return u;
      }
    } catch (err) {}

    const fileUsers = await readUsersFile();
    const fileUser = fileUsers.find((u) => u.id === Number(id));
    if (fileUser) {
      if (!fileUser.is_admin && isUserAdmin(fileUser)) {
        fileUser.is_admin = true;
      }
      return fileUser;
    }

    const memUser = memoryUsers.get(Number(id));
    if (memUser) {
      if (!memUser.is_admin && isUserAdmin(memUser)) {
        memUser.is_admin = true;
      }
      return memUser;
    }

    return null;
  }

  static async updateProfileImage(id, profileImageUrl) {
    try {
      const result = await pool.query(
        "UPDATE users SET profile_image_url = $1 WHERE id = $2 RETURNING id, username, profile_image_url, is_admin",
        [profileImageUrl, id],
      );
      if (result.rows.length > 0) {
        const u = result.rows[0];
        if (!u.is_admin && isUserAdmin(u)) u.is_admin = true;
        return u;
      }
    } catch (err) {}

    const fileUsers = await readUsersFile();
    const user = fileUsers.find((u) => u.id === Number(id));
    if (user) {
      user.profile_image_url = profileImageUrl;
      await writeUsersFile(fileUsers);
    }

    const memUser = memoryUsers.get(Number(id));
    if (memUser) {
      memUser.profile_image_url = profileImageUrl;
    }

    return user || memUser || null;
  }

  static async findByGoogleId(googleId) {
    if (!googleId) return null;
    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE google_id = $1",
        [googleId],
      );
      if (result.rows.length > 0) {
        const u = result.rows[0];
        if (!u.is_admin && isUserAdmin(u)) u.is_admin = true;
        return u;
      }
    } catch (err) {}

    const fileUsers = await readUsersFile();
    const fileUser = fileUsers.find((u) => u.google_id === googleId);
    if (fileUser) {
      if (!fileUser.is_admin && isUserAdmin(fileUser)) fileUser.is_admin = true;
      return fileUser;
    }

    const memUser = [...memoryUsers.values()].find(
      (u) => u.google_id === googleId,
    );
    if (memUser) {
      if (!memUser.is_admin && isUserAdmin(memUser)) memUser.is_admin = true;
      return memUser;
    }

    return null;
  }

  static async linkGoogleAccount(id, googleId, profileImageUrl) {
    try {
      const result = await pool.query(
        "UPDATE users SET google_id = $1, profile_image_url = COALESCE(profile_image_url, $2) WHERE id = $3 RETURNING id, username, profile_image_url, is_admin",
        [googleId, profileImageUrl, id],
      );
      if (result.rows.length > 0) {
        const u = result.rows[0];
        if (!u.is_admin && isUserAdmin(u)) u.is_admin = true;
        return u;
      }
    } catch (err) {}

    const fileUsers = await readUsersFile();
    const user = fileUsers.find((u) => u.id === Number(id));
    if (user) {
      user.google_id = googleId;
      if (!user.profile_image_url) user.profile_image_url = profileImageUrl;
      await writeUsersFile(fileUsers);
    }
    return user || null;
  }

  static async createGoogleUser(username, googleId, profileImageUrl) {
    const isAdmin = isUserAdmin({ username });
    try {
      const result = await pool.query(
        "INSERT INTO users (username, google_id, profile_image_url, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, username, profile_image_url, is_admin",
        [username, googleId, profileImageUrl, isAdmin],
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === "23505") throw err;
      const fileUsers = await readUsersFile();
      const existing = fileUsers.find(
        (u) => u.username.toLowerCase() === username.toLowerCase(),
      );
      if (existing) {
        const error = new Error("Username already exists");
        error.code = "23505";
        throw error;
      }
      const maxId = fileUsers.reduce((m, u) => Math.max(m, u.id || 0), 0);
      const newUser = {
        id: maxId + 1,
        username,
        password: null,
        google_id: googleId,
        profile_image_url: profileImageUrl,
        is_admin: isAdmin,
      };
      fileUsers.push(newUser);
      await writeUsersFile(fileUsers);
      memoryUsers.set(newUser.id, newUser);
      return newUser;
    }
  }

  static async setAdminStatus(username, isAdmin = true) {
    if (!username) return null;
    const lower = username.toLowerCase().trim();
    let updatedUser = null;

    try {
      const result = await pool.query(
        "UPDATE users SET is_admin = $1 WHERE LOWER(username) = LOWER($2) RETURNING id, username, profile_image_url, is_admin",
        [isAdmin, lower],
      );
      if (result.rows.length > 0) {
        updatedUser = result.rows[0];
      }
    } catch (err) {}

    const fileUsers = await readUsersFile();
    let fileUser = fileUsers.find(
      (u) => (u.username || "").toLowerCase().trim() === lower,
    );
    if (fileUser) {
      fileUser.is_admin = isAdmin;
      if (!updatedUser) updatedUser = fileUser;
    } else if (!updatedUser) {
      const maxId = fileUsers.reduce((m, u) => Math.max(m, u.id || 0), 0);
      fileUser = {
        id: maxId + 1,
        username: username.trim(),
        password: null,
        profile_image_url: null,
        is_admin: isAdmin,
      };
      fileUsers.push(fileUser);
      updatedUser = fileUser;
    }
    await writeUsersFile(fileUsers);

    const memUser = [...memoryUsers.values()].find(
      (u) => (u.username || "").toLowerCase().trim() === lower,
    );
    if (memUser) {
      memUser.is_admin = isAdmin;
    } else if (updatedUser) {
      memoryUsers.set(updatedUser.id, updatedUser);
    }

    return updatedUser;
  }
}
