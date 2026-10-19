import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { encrypt, decrypt, getDistanceToStreet, isPlaceStreet } from "../utils/game.js";
import { Score } from "../models/Score.js";
import pool from "../config/database.js";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

import * as turf from "@turf/turf";
import { readDifficultyOverridesFile } from "./AdminController.js";

export class GameController {
  static async startGame(req, res) {
    try {
      let { cityKey, mode, difficulty, testNumber, seriesCount } = req.body;
      if (!mode) mode = "target";
      if (!difficulty) difficulty = "hard";

      const parsedCount = parseInt(seriesCount, 10);
      const targetSeries =
        !isNaN(parsedCount) && parsedCount >= 1 && parsedCount <= 50
          ? parsedCount
          : 5;

      if (!cityKey) {
        return res.status(400).json({ error: "cityKey is required" });
      }

      if (!/^[a-z0-9_]+$/.test(cityKey)) {
        return res.status(400).json({ error: "Invalid cityKey" });
      }

      const filePath = path.join(
        dirname,
        "..",
        "..",
        "..",
        "public",
        "assets",
        "data",
        `${cityKey}.json`,
      );
      let geojson;
      try {
        const fileContent = await fs.readFile(filePath, "utf8");
        geojson = JSON.parse(fileContent);
      } catch (err) {
        return res.status(404).json({ error: "City data not found." });
      }

      let customDistricts = [];
      try {
        const districtsFilePath = path.join(
          process.cwd(),
          "public",
          "assets",
          "data",
          "custom_districts.json",
        );
        const content = await fs.readFile(districtsFilePath, "utf8");
        const customDistrictsObj = JSON.parse(content);
        customDistricts = customDistrictsObj[cityKey] || [];
      } catch (err) {}

      let customRoutes = [];
      try {
        const routesFilePath = path.join(
          process.cwd(),
          "public",
          "assets",
          "data",
          "custom_routes.json",
        );
        const routesContent = await fs.readFile(routesFilePath, "utf8");
        const customRoutesObj = JSON.parse(routesContent);
        customRoutes = customRoutesObj[cityKey] || [];
      } catch (err) {}

      const overridden = new Set();
      const deleted = new Set();
      [...customDistricts, ...customRoutes].forEach((f) => {
        if (!f || !f.properties) return;
        if (f.properties.isDeleted) {
          if (f.properties.id) deleted.add(f.properties.id);
          if (f.properties.name) deleted.add(f.properties.name);
          if (f.properties.originalName) deleted.add(f.properties.originalName);
        } else {
          if (f.properties.id) overridden.add(f.properties.id);
          if (f.properties.name) overridden.add(f.properties.name);
          if (f.properties.originalName)
            overridden.add(f.properties.originalName);
        }
      });

      const activeCustom = [...customDistricts, ...customRoutes].filter(
        (f) =>
          f &&
          f.properties &&
          !f.properties.isDeleted &&
          typeof f.properties.name === "string" &&
          f.properties.name.trim().length > 0,
      );

      const filteredDefaults = geojson.features.filter((f) => {
        if (
          !f ||
          !f.properties ||
          typeof f.properties.name !== "string" ||
          f.properties.name.trim().length === 0
        ) {
          return false;
        }
        if (f.geometry?.type !== "Point") {
          try {
            const len = turf.length(f, { units: "meters" });
            if (len > 0 && len < 15) return false;
          } catch (e) {}
        }
        const id = f.properties.id;
        const name = f.properties.name;
        if (id && (deleted.has(id) || overridden.has(id))) return false;
        if (name && (deleted.has(name) || overridden.has(name))) return false;
        return true;
      });

      const allCityStreets = [...filteredDefaults, ...activeCustom];

      if (allCityStreets.length === 0) {
        return res
          .status(400)
          .json({ error: "No streets found for this city." });
      }

      let diffMode = "length";
      let disablePlaces = false;
      try {
        const modeRes = await pool.query(
          "SELECT key, value FROM global_settings WHERE key IN ('difficulty_mode', 'disable_places')",
        );
        for (const row of modeRes.rows) {
          if (row.key === "difficulty_mode") diffMode = row.value;
          if (row.key === "disable_places") disablePlaces = row.value === "true";
        }
      } catch (e) {}

      let centroids = [];
      if (diffMode === "center") {
        centroids = allCityStreets.map((f) => {
          if (f.geometry.type === "Point") return f;
          try {
            return turf.centroid(f);
          } catch (e) {
            return null;
          }
        });
      }

      let difficultyOverrides = {};
      try {
        const allDiffData = await readDifficultyOverridesFile(cityKey);
        difficultyOverrides = allDiffData[cityKey] || {};
      } catch (e) {}

      const getStreetDifficulty = (f, diffMode, index) => {
        if (
          (f.properties?.isCustom && f.properties?.isLotissement) ||
          f.properties?.difficulty === "lotissement" ||
          f.properties?.itemType === "lotissement"
        ) {
          return "lotissement";
        }
        if (f.geometry?.type === "Point") return "hard";

        const name = f.properties?.name || "";
        const nameLower = name.toLowerCase().trim();
        const origNameLower = (f.properties?.originalName || "")
          .toLowerCase()
          .trim();

        const manualDiff =
          difficultyOverrides[nameLower] ||
          (origNameLower ? difficultyOverrides[origNameLower] : null) ||
          f.properties?.difficulty;

        if (manualDiff && ["easy", "medium", "hard"].includes(manualDiff)) {
          return manualDiff;
        }

        const MINOR_KEYWORDS = [
          "chemin",
          "chemins",
          "sentier",
          "sentiers",
          "ruelle",
          "ruelles",
          "passage",
          "passages",
          "allée",
          "allées",
          "impasse",
          "impasses",
          "traverse",
          "traverses",
          "chemain",
          "cour",
          "cours",
          "villa",
          "villas",
          "cité",
          "cités",
          "square",
          "squares",
        ];
        const isCourMajor = /^cours\b/i.test(nameLower);
        const isMinorWay =
          !isCourMajor && MINOR_KEYWORDS.some((k) => nameLower.includes(k));

        const MAJOR_TOPONYMS_LIST = [
          "boulevard",
          "boulevards",
          "bd",
          "avenue",
          "avenues",
          "av",
          "mail",
          "mails",
          "quai",
          "quais",
          "pont",
          "ponts",
          "cours",
          "faubourg",
          "faubourgs",
          "fg",
          "promenade",
          "promenades",
          "rocade",
          "rocades",
          "chaussée",
          "chaussées",
          "route",
          "routes",
          "esplanade",
          "parvis",
        ];
        const firstWord = nameLower.split(/[\s'-]+/)[0];
        const isMajorToponym = MAJOR_TOPONYMS_LIST.includes(firstWord) || isCourMajor;
        const highway = (f.properties?.highway || "").toLowerCase();
        const isMajorHighway = ["motorway", "trunk", "primary", "secondary"].includes(highway);

        let streetLength = 0;
        try {
          streetLength = turf.length(f, { units: "meters" });
        } catch (e) {
          return "hard";
        }

        if (diffMode === "nomenclature") {
          if (isMinorWay || highway === "living_street") return "hard";
          if (isMajorToponym || isMajorHighway || streetLength >= 550) return "easy";
          if (streetLength >= 250) return "medium";
          return "hard";
        } else if (diffMode === "center") {
          let nearCount = 0;
          if (centroids[index]) {
            for (let j = 0; j < centroids.length; j++) {
              if (index === j || !centroids[j]) continue;
              try {
                const dist = turf.distance(centroids[index], centroids[j], {
                  units: "meters",
                });
                if (dist <= 200) nearCount++;
              } catch (e) {}
            }
          }

          const inCenter = nearCount >= 4;
          if (isMinorWay || highway === "living_street") return "hard";
          if ((isMajorToponym || isMajorHighway) && streetLength >= 80) return "easy";
          if (streetLength >= 550) return "easy";
          if (inCenter && streetLength >= 350) return "easy";
          if (streetLength >= 250) return "medium";
          return "hard";
        } else {
          if (isMinorWay || highway === "living_street") return "hard";
          if ((isMajorToponym || isMajorHighway) && streetLength >= 80) return "easy";
          if (streetLength >= 550) return "easy";
          if (highway === "tertiary" && streetLength >= 250) return "easy";
          if (streetLength >= 250) return "medium";
          return "hard";
        }
      };

      const uniqueStreetsMap = new Map();
      allCityStreets.forEach((street, index) => {
        const nameKey = street.properties.name.toLowerCase().trim();
        if (!uniqueStreetsMap.has(nameKey)) {
          street.computedDifficulty = getStreetDifficulty(
            street,
            diffMode,
            index,
          );
          uniqueStreetsMap.set(nameKey, street);
        } else {
          const existing = uniqueStreetsMap.get(nameKey);
          const origNameLower = (street.properties?.originalName || "")
            .toLowerCase()
            .trim();
          const hasOverride =
            difficultyOverrides[nameKey] ||
            (origNameLower ? difficultyOverrides[origNameLower] : null);
          if (
            !hasOverride &&
            street.properties?.difficulty &&
            ["easy", "medium", "hard"].includes(street.properties.difficulty) &&
            existing.computedDifficulty !== street.properties.difficulty
          ) {
            existing.computedDifficulty = street.properties.difficulty;
          }
        }
      });
      let uniqueStreetsList = Array.from(uniqueStreetsMap.values());
      if (disablePlaces) {
        const filtered = uniqueStreetsList.filter((s) => !isPlaceStreet(s));
        if (filtered.length >= 5) {
          uniqueStreetsList = filtered;
        }
      }

      let selectedStreets = [];

      if (testNumber && typeof testNumber === "number") {
        let roomSeriesCount = targetSeries;
        let roomDiff = difficulty;
        try {
          const roomRes = await pool.query(
            "SELECT series_count, difficulty FROM rooms WHERE test_id = $1",
            [testNumber],
          );
          if (roomRes.rows.length > 0) {
            if (roomRes.rows[0].series_count)
              roomSeriesCount = roomRes.rows[0].series_count;
            if (roomRes.rows[0].difficulty)
              roomDiff = roomRes.rows[0].difficulty;
          }
        } catch (e) {
          console.error("Error fetching series_count/difficulty for room:", e);
        }

        const mulberry32 = (a) => {
          return function () {
            var t = (a += 0x6d2b79f5);
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        };
        const random = mulberry32(testNumber);

        const shuffleSeeded = (array) => {
          let currentIndex = array.length,
            randomIndex;
          while (currentIndex > 0) {
            randomIndex = Math.floor(random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [
              array[randomIndex],
              array[currentIndex],
            ];
          }
          return array;
        };

        const matchingStreets = uniqueStreetsList.filter((s) => {
          if (roomDiff === "lotissement")
            return s.properties.isCustom && s.properties.isLotissement;
          return s.computedDifficulty === roomDiff;
        });

        const getSortedFallback = (targetD, shuffler) => {
          let primaryFallback = [];
          let secondaryFallback = [];
          if (targetD === "easy") {
            primaryFallback = uniqueStreetsList.filter(
              (s) => s.computedDifficulty === "medium",
            );
            secondaryFallback = uniqueStreetsList.filter(
              (s) => s.computedDifficulty === "hard",
            );
          } else if (targetD === "hard") {
            primaryFallback = uniqueStreetsList.filter(
              (s) => s.computedDifficulty === "medium",
            );
            secondaryFallback = uniqueStreetsList.filter(
              (s) => s.computedDifficulty === "easy",
            );
          } else {
            primaryFallback = uniqueStreetsList.filter(
              (s) => s.computedDifficulty === "easy",
            );
            secondaryFallback = uniqueStreetsList.filter(
              (s) => s.computedDifficulty === "hard",
            );
          }
          shuffler(primaryFallback);
          shuffler(secondaryFallback);
          return [...primaryFallback, ...secondaryFallback];
        };

        const fallbackStreets = getSortedFallback(roomDiff, shuffleSeeded);

        shuffleSeeded(matchingStreets);

        selectedStreets = [...matchingStreets, ...fallbackStreets].slice(
          0,
          roomSeriesCount,
        );

        if (selectedStreets.length < roomSeriesCount) {
          return res
            .status(400)
            .json({ error: "not_enough_streets_difficulty" });
        }
      } else {
        const matchingStreets = uniqueStreetsList.filter((s) => {
          if (difficulty === "lotissement")
            return s.properties.isCustom && s.properties.isLotissement;
          return s.computedDifficulty === difficulty;
        });

        const shuffleArray = (arr) => {
          for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
          }
        };

        let primaryFallback = [];
        let secondaryFallback = [];
        if (difficulty === "easy") {
          primaryFallback = uniqueStreetsList.filter(
            (s) => s.computedDifficulty === "medium",
          );
          secondaryFallback = uniqueStreetsList.filter(
            (s) => s.computedDifficulty === "hard",
          );
        } else if (difficulty === "hard") {
          primaryFallback = uniqueStreetsList.filter(
            (s) => s.computedDifficulty === "medium",
          );
          secondaryFallback = uniqueStreetsList.filter(
            (s) => s.computedDifficulty === "easy",
          );
        } else {
          primaryFallback = uniqueStreetsList.filter(
            (s) => s.computedDifficulty === "easy",
          );
          secondaryFallback = uniqueStreetsList.filter(
            (s) => s.computedDifficulty === "hard",
          );
        }
        shuffleArray(primaryFallback);
        shuffleArray(secondaryFallback);
        const fallbackStreets = [...primaryFallback, ...secondaryFallback];

        shuffleArray(matchingStreets);

        selectedStreets = [...matchingStreets, ...fallbackStreets].slice(
          0,
          targetSeries,
        );

        if (selectedStreets.length < targetSeries) {
          return res
            .status(400)
            .json({ error: "not_enough_streets_difficulty" });
        }
      }

      const session = {
        gameId: crypto.randomUUID(),
        username: req.user.username,
        mode,
        difficulty: testNumber ? "competition" : difficulty,
        testNumber: testNumber || null,
        streets: selectedStreets.map((s, idx) => ({
          id: idx,
          name: s.properties.name,
          geometry: s.geometry,
          difficulty: s.computedDifficulty,
        })),
        currentRound: 0,
        streakCount: 0,
        scores: [],
        sprintHistory: [],
      };

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res
          .status(500)
          .json({ error: "Server security configuration error" });
      }

      const gameToken = encrypt(JSON.stringify(session), secret);
      const currentStreet = session.streets[0];
      const nextPrompt = {
        roundIndex: 0,
        totalRounds: session.streets.length,
        mode: session.mode,
      };

      if (mode === "target" || mode === "sprint") {
        nextPrompt.streetName = currentStreet.name;
      } else if (mode === "identify") {
        nextPrompt.geometry = currentStreet.geometry;
      }

      return res.json({
        gameToken,
        nextPrompt,
        disablePlaces,
        isFinished: false,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Internal server error starting game" });
    }
  }

  static async submitRound(req, res) {
    try {
      const { gameToken, guess, elapsedSeconds } = req.body;
      if (!gameToken) {
        return res.status(400).json({ error: "gameToken is required" });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res
          .status(500)
          .json({ error: "Server security configuration error" });
      }

      let session;
      try {
        session = JSON.parse(decrypt(gameToken, secret));
      } catch (err) {
        return res.status(400).json({ error: "Invalid or tampered gameToken" });
      }

      if (session.username !== req.user.username) {
        return res
          .status(403)
          .json({ error: "Game session does not belong to you" });
      }

      if (session.currentRound >= session.streets.length) {
        return res.status(400).json({ error: "Game is already finished" });
      }

      if (session.streakCount === undefined) {
        session.streakCount = 0;
      }

      const currentStreet = session.streets[session.currentRound];
      const mode = session.mode;
      const effectiveDifficulty =
        session.difficulty === "competition"
          ? currentStreet.difficulty
          : session.difficulty;
      const totalTime =
        effectiveDifficulty === "easy"
          ? 45
          : effectiveDifficulty === "medium" ||
              effectiveDifficulty === "lotissement"
            ? 60
            : 90;
      const remainingTime = Math.max(0, totalTime - (elapsedSeconds || 0));

      let pointsEarned = 0;
      let isCorrect = false;
      let distance = -1;
      let message = "";
      let feedback = {
        correctName: currentStreet.name,
        geometry: currentStreet.geometry,
      };

      if (mode === "target" || mode === "sprint") {
        if (
          !guess ||
          typeof guess.lat !== "number" ||
          typeof guess.lng !== "number"
        ) {
          distance = -1;
          pointsEarned = 0;
          isCorrect = false;
          feedback.code = remainingTime <= 0 ? "timeout_guess" : "passed";
          message =
            remainingTime <= 0
              ? "Temps écoulé ! Vous n'avez pas sélectionné d'emplacement."
              : "Passé.";
        } else {
          distance = getDistanceToStreet(
            guess.lat,
            guess.lng,
            currentStreet.geometry,
          );
          feedback.distance = Math.round(distance);
          if (distance <= 15) {
            pointsEarned = 100;
            isCorrect = true;
            feedback.code = "perfect";
            message = "Parfait ! Vous êtes exactement sur la rue.";
          } else if (distance <= 100) {
            const ratio = 1 - (distance - 15) / 85;
            pointsEarned = Math.round(10 + 40 * ratio);
            isCorrect = true;
            feedback.code = "near";
            message = `Pas mal ! Vous êtes à ${Math.round(distance)}m de la rue.`;
          } else {
            pointsEarned = 0;
            isCorrect = false;
            feedback.code = "miss";
            message = `Raté. Vous étiez à ${Math.round(distance)}m. Voici le véritable emplacement.`;
          }

          let timeBonus = 0;
          if (pointsEarned > 0 && remainingTime > 0) {
            const timeRatio = remainingTime / totalTime;
            if (mode === "sprint") {
              timeBonus = Math.round(timeRatio * 100);
            } else {
              timeBonus = Math.round(timeRatio * 30);
            }
            if (timeBonus > 0) {
              pointsEarned += timeBonus;
              feedback.timeBonus = timeBonus;
              message += ` Bonus de temps : +${timeBonus} pts.`;
            }
          }
        }

        if (mode === "sprint") {
          session.sprintHistory.push({
            name: currentStreet.name,
            distance: distance === -1 ? -1 : Math.round(distance),
            points: pointsEarned,
            timeBonus: feedback.timeBonus || 0,
          });
        }
      } else if (mode === "identify") {
        const normalize = (str) =>
          typeof str === "string"
            ? str
                .toLowerCase()
                .replace(/^(le|la|les|l'|d'|du|de|des)\s+/, "")
                .replace(/[^a-z0-9]/g, "")
                .trim()
            : "";
        const cleanAnswer = normalize(guess);
        const cleanCorrect = normalize(currentStreet.name);

        isCorrect =
          cleanAnswer.length > 0 &&
          (cleanAnswer === cleanCorrect || cleanCorrect.includes(cleanAnswer));
        if (isCorrect) {
          pointsEarned = 15;
          feedback.code = "identify_correct";
          message = `Bonne réponse ! C'était bien : ${currentStreet.name}`;

          let timeBonus = 0;
          if (remainingTime > 0) {
            timeBonus = Math.round((remainingTime / totalTime) * 10);
            if (timeBonus > 0) {
              pointsEarned += timeBonus;
              feedback.timeBonus = timeBonus;
              message += ` Bonus de temps : +${timeBonus} pts.`;
            }
          }
        } else {
          pointsEarned = 0;
          feedback.code =
            remainingTime <= 0 ? "identify_timeout" : "identify_false";
          message =
            remainingTime <= 0
              ? `Temps écoulé ! La bonne réponse était : ${currentStreet.name}`
              : `Faux. La bonne réponse était : ${currentStreet.name}`;
        }
      }

      if (isCorrect) {
        session.streakCount++;
      } else {
        session.streakCount = 0;
      }

      let multiplier = 1;
      if (session.streakCount >= 3) {
        multiplier = 3;
      } else if (session.streakCount === 2) {
        multiplier = 2;
      }

      if (pointsEarned > 0 && multiplier > 1) {
        pointsEarned *= multiplier;
        message += ` (Combo x${multiplier} !)`;
      }

      feedback.streakCount = session.streakCount;
      feedback.multiplier = multiplier;
      feedback.pointsEarned = pointsEarned;
      feedback.message = message + ` (+${pointsEarned} pts)`;
      feedback.isCorrect = isCorrect;
      feedback.distance = distance === -1 ? -1 : Math.round(distance);

      session.scores.push(pointsEarned);
      session.currentRound++;

      const isFinished = session.currentRound >= session.streets.length;
      let nextPrompt = null;
      let finalScore = 0;
      let newGameToken = null;

      if (!isFinished) {
        const nextStreet = session.streets[session.currentRound];
        nextPrompt = {
          roundIndex: session.currentRound,
          totalRounds: session.streets.length,
          mode: session.mode,
        };
        if (mode === "target" || mode === "sprint") {
          nextPrompt.streetName = nextStreet.name;
        } else if (mode === "identify") {
          nextPrompt.geometry = nextStreet.geometry;
        }
        newGameToken = encrypt(JSON.stringify(session), secret);
      } else {
        finalScore = session.scores.reduce((a, b) => a + b, 0);
        if (finalScore > 0) {
          await Score.create(
            session.username,
            finalScore,
            session.difficulty,
            null,
            session.testNumber,
          );
        }
      }

      return res.json({
        gameToken: newGameToken,
        feedback,
        nextPrompt,
        isFinished,
        totalScore: finalScore,
        sprintHistory: session.sprintHistory,
      });
    } catch (error) {
      return res
        .status(500)
        .json({ error: "Internal server error submitting round" });
    }
  }
}
