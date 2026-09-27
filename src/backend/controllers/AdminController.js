import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../config/database.js";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const districtsFilePath = path.join(
  dirname,
  "..",
  "..",
  "..",
  "public",
  "assets",
  "data",
  "custom_districts.json",
);

const routesFilePath = path.join(
  dirname,
  "..",
  "..",
  "..",
  "public",
  "assets",
  "data",
  "custom_routes.json",
);

const diffFilePath = path.join(
  dirname,
  "..",
  "..",
  "..",
  "public",
  "assets",
  "data",
  "difficulty_overrides.json",
);

export async function readDifficultyOverridesFile(cityKey = null) {
  let fileData = {};
  try {
    const content = await fs.readFile(diffFilePath, "utf8");
    if (content && content.trim()) {
      fileData = JSON.parse(content);
    }
  } catch (e) {
    fileData = {};
  }

  try {
    let query =
      "SELECT city_key, street_name, difficulty FROM route_difficulties";
    const params = [];
    if (cityKey) {
      query += " WHERE city_key = $1";
      params.push(cityKey);
    }
    const res = await pool.query(query, params);
    if (res && res.rows && res.rows.length > 0) {
      res.rows.forEach((row) => {
        if (!fileData[row.city_key]) fileData[row.city_key] = {};
        fileData[row.city_key][row.street_name.toLowerCase().trim()] =
          row.difficulty;
      });
    }
  } catch (e) {}

  return fileData;
}

export async function writeDifficultyOverridesFile(data) {
  await fs.writeFile(diffFilePath, JSON.stringify(data, null, 2), "utf8");
}

async function readDistrictsFile() {
  try {
    const content = await fs.readFile(districtsFilePath, "utf8");
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

async function writeDistrictsFile(data) {
  await fs.writeFile(districtsFilePath, JSON.stringify(data, null, 2), "utf8");
}

async function readRoutesFile() {
  try {
    const content = await fs.readFile(routesFilePath, "utf8");
    return JSON.parse(content);
  } catch (e) {
    return {};
  }
}

async function writeRoutesFile(data) {
  await fs.writeFile(routesFilePath, JSON.stringify(data, null, 2), "utf8");
}

export class AdminController {
  static async getDistricts(req, res) {
    try {
      const { cityKey } = req.query;
      if (!cityKey) {
        return res.status(400).json({ error: "cityKey is required" });
      }

      const allData = await readDistrictsFile();
      const cityDistricts = allData[cityKey] || [];
      return res.json(cityDistricts);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Internal server error getting districts" });
    }
  }

  static async saveDistrict(req, res) {
    try {
      const { cityKey, district } = req.body;
      if (
        !cityKey ||
        !district ||
        !district.name ||
        !district.coordinates ||
        !Array.isArray(district.coordinates)
      ) {
        return res
          .status(400)
          .json({ error: "cityKey and valid district payload are required" });
      }

      const allData = await readDistrictsFile();
      if (!allData[cityKey]) {
        allData[cityKey] = [];
      }

      const districtId =
        district.id ||
        `district_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const feature = {
        type: "Feature",
        properties: {
          id: districtId,
          name: district.name.trim(),
          originalName: district.originalName || undefined,
          isLotissement: true,
          isCustom: true,
          itemType: "lotissement",
          color: district.color || "#f59e0b",
        },
        geometry: {
          type: "Polygon",
          coordinates: [district.coordinates],
        },
      };

      const existingIndex = allData[cityKey].findIndex(
        (d) =>
          d.properties &&
          (d.properties.id === districtId ||
            (district.originalName &&
              (d.properties.name === district.originalName ||
                d.properties.originalName === district.originalName))),
      );
      if (existingIndex >= 0) {
        allData[cityKey][existingIndex] = feature;
      } else {
        allData[cityKey].push(feature);
      }

      await writeDistrictsFile(allData);
      return res.json({ message: "District saved successfully", feature });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Internal server error saving district" });
    }
  }

  static async deleteDistrict(req, res) {
    try {
      const { cityKey, id } = req.params;
      if (!cityKey || !id) {
        return res.status(400).json({ error: "cityKey and id are required" });
      }

      const allData = await readDistrictsFile();
      if (!allData[cityKey]) {
        allData[cityKey] = [];
      }

      const existingIdx = allData[cityKey].findIndex(
        (d) =>
          d.properties && (d.properties.id === id || d.properties.name === id),
      );

      if (existingIdx >= 0) {
        const prevProps = allData[cityKey][existingIdx].properties || {};
        allData[cityKey][existingIdx] = {
          type: "Feature",
          properties: {
            ...prevProps,
            id,
            name: prevProps.name || id,
            isDeleted: true,
          },
        };
      } else {
        allData[cityKey].push({
          type: "Feature",
          properties: {
            id,
            name: id,
            isDeleted: true,
          },
        });
      }

      await writeDistrictsFile(allData);
      return res.json({ message: "District deleted successfully" });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Internal server error deleting district" });
    }
  }

  static async getRoutes(req, res) {
    try {
      const { cityKey } = req.query;
      if (!cityKey) {
        return res.status(400).json({ error: "cityKey is required" });
      }

      const allData = await readRoutesFile();
      const cityRoutes = allData[cityKey] || [];
      return res.json(cityRoutes);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Internal server error getting routes" });
    }
  }

  static async getRouteDifficulties(req, res) {
    try {
      const { cityKey } = req.query;
      if (!cityKey) {
        return res.status(400).json({ error: "cityKey is required" });
      }

      const allData = await readDifficultyOverridesFile(cityKey);
      const cityDifficulties = allData[cityKey] || {};
      return res.json(cityDifficulties);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Internal server error getting difficulties" });
    }
  }

  static async setRouteDifficulty(req, res) {
    try {
      const { cityKey, streetName, difficulty } = req.body;
      if (!cityKey || !streetName) {
        return res
          .status(400)
          .json({ error: "cityKey and streetName are required" });
      }

      const nameKey = streetName.toLowerCase().trim();
      const validDifficulties = ["easy", "medium", "hard"];
      const allData = await readDifficultyOverridesFile();

      if (!allData[cityKey]) {
        allData[cityKey] = {};
      }

      if (difficulty && validDifficulties.includes(difficulty)) {
        allData[cityKey][nameKey] = difficulty;
        try {
          await pool.query(
            `INSERT INTO route_difficulties (city_key, street_name, difficulty, updated_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (city_key, street_name) DO UPDATE SET difficulty = $3, updated_at = NOW()`,
            [cityKey, nameKey, difficulty],
          );
        } catch (e) {}
      } else {
        delete allData[cityKey][nameKey];
        try {
          await pool.query(
            "DELETE FROM route_difficulties WHERE city_key = $1 AND street_name = $2",
            [cityKey, nameKey],
          );
        } catch (e) {}
      }

      await writeDifficultyOverridesFile(allData);
      return res.json({
        success: true,
        cityKey,
        streetName,
        difficulty: allData[cityKey][nameKey] || null,
      });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Internal server error setting difficulty" });
    }
  }

  static async saveRoute(req, res) {
    try {
      const { cityKey, route } = req.body;
      if (
        !cityKey ||
        !route ||
        !route.name ||
        !route.coordinates ||
        !Array.isArray(route.coordinates)
      ) {
        return res
          .status(400)
          .json({ error: "cityKey and valid route payload are required" });
      }

      const allData = await readRoutesFile();
      if (!allData[cityKey]) {
        allData[cityKey] = [];
      }

      const routeId =
        route.id ||
        `route_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const feature = {
        type: "Feature",
        properties: {
          id: routeId,
          name: route.name.trim(),
          originalName: route.originalName || undefined,
          isCustom: true,
          itemType: "route",
        },
        geometry: {
          type: "LineString",
          coordinates: route.coordinates,
        },
      };

      if (route.difficulty !== undefined) {
        const diffData = await readDifficultyOverridesFile();
        if (!diffData[cityKey]) diffData[cityKey] = {};
        const nameKey = route.name.trim().toLowerCase();

        if (["easy", "medium", "hard"].includes(route.difficulty)) {
          feature.properties.difficulty = route.difficulty;
          diffData[cityKey][nameKey] = route.difficulty;
          try {
            await pool.query(
              `INSERT INTO route_difficulties (city_key, street_name, difficulty, updated_at)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (city_key, street_name) DO UPDATE SET difficulty = $3, updated_at = NOW()`,
              [cityKey, nameKey, route.difficulty],
            );
          } catch (e) {}
        } else if (route.difficulty === "auto" || route.difficulty === null) {
          delete diffData[cityKey][nameKey];
          try {
            await pool.query(
              "DELETE FROM route_difficulties WHERE city_key = $1 AND street_name = $2",
              [cityKey, nameKey],
            );
          } catch (e) {}
        }
        await writeDifficultyOverridesFile(diffData);
      }

      const existingIndex = allData[cityKey].findIndex(
        (d) =>
          d.properties &&
          (d.properties.id === routeId ||
            (route.originalName &&
              (d.properties.name === route.originalName ||
                d.properties.originalName === route.originalName))),
      );
      if (existingIndex >= 0) {
        allData[cityKey][existingIndex] = feature;
      } else {
        allData[cityKey].push(feature);
      }

      await writeRoutesFile(allData);
      return res.json({ message: "Route saved successfully", feature });
    } catch (err) {
      console.error("Error in saveRoute:", err);
      return res
        .status(500)
        .json({ error: err.message || "Internal server error saving route" });
    }
  }

  static async deleteRoute(req, res) {
    try {
      const { cityKey, id } = req.params;
      if (!cityKey || !id) {
        return res.status(400).json({ error: "cityKey and id are required" });
      }

      const allData = await readRoutesFile();
      if (!allData[cityKey]) {
        allData[cityKey] = [];
      }

      const existingIdx = allData[cityKey].findIndex(
        (d) =>
          d.properties && (d.properties.id === id || d.properties.name === id),
      );

      if (existingIdx >= 0) {
        const prevProps = allData[cityKey][existingIdx].properties || {};
        allData[cityKey][existingIdx] = {
          type: "Feature",
          properties: {
            ...prevProps,
            id,
            name: prevProps.name || id,
            isDeleted: true,
          },
        };
      } else {
        allData[cityKey].push({
          type: "Feature",
          properties: {
            id,
            name: id,
            isDeleted: true,
          },
        });
      }

      await writeRoutesFile(allData);
      return res.json({ message: "Route deleted successfully" });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Internal server error deleting route" });
    }
  }

  static async getSettings(req, res) {
    try {
      const result = await pool.query("SELECT key, value FROM global_settings");
      const settings = {};
      for (const row of result.rows) {
        settings[row.key] = row.value;
      }
      return res.json(settings);
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Internal server error getting settings" });
    }
  }

  static async saveSettings(req, res) {
    try {
      const { key, value } = req.body;
      if (!key || value === undefined) {
        return res.status(400).json({ error: "key and value are required" });
      }
      await pool.query(
        "INSERT INTO global_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2",
        [key, value],
      );
      return res.json({ success: true });
    } catch (err) {
      return res
        .status(500)
        .json({ error: "Internal server error saving settings" });
    }
  }
}
