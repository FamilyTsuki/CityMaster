import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { encrypt, decrypt, getDistanceToStreet } from '../utils/game.js';
import { Score } from '../models/Score.js';
import pool from '../config/database.js';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

import * as turf from '@turf/turf';

export class GameController {
  static async startGame(req, res) {
    try {
      const { cityKey, mode, difficulty, testNumber } = req.body;
      if (!cityKey || !mode || !difficulty) {
        return res.status(400).json({ error: 'cityKey, mode, and difficulty are required' });
      }

      if (!/^[a-z0-9_]+$/.test(cityKey)) {
        return res.status(400).json({ error: 'Invalid cityKey' });
      }

      const filePath = path.join(dirname, '..', '..', '..', 'public', 'assets', 'data', `${cityKey}.json`);
      let geojson;
      try {
        const fileContent = await fs.readFile(filePath, 'utf8');
        geojson = JSON.parse(fileContent);
      } catch (err) {
        return res.status(404).json({ error: 'City data not found.' });
      }

      const allCityStreets = geojson.features.filter(f => f.properties && f.properties.name);

      try {
        const districtsFilePath = path.join(process.cwd(), 'public', 'assets', 'data', 'custom_districts.json');
        const content = await fs.readFile(districtsFilePath, 'utf8');
        const customDistrictsObj = JSON.parse(content);
        const cityDistricts = customDistrictsObj[cityKey] || [];
        allCityStreets.push(...cityDistricts);
      } catch (err) {}

      try {
        const routesFilePath = path.join(process.cwd(), 'public', 'assets', 'data', 'custom_routes.json');
        const routesContent = await fs.readFile(routesFilePath, 'utf8');
        const customRoutesObj = JSON.parse(routesContent);
        const cityRoutes = customRoutesObj[cityKey] || [];
        allCityStreets.push(...cityRoutes);
      } catch (err) {}

      if (allCityStreets.length === 0) {
        return res.status(400).json({ error: 'No streets found for this city.' });
      }

      let diffMode = 'length';
      try {
        const modeRes = await pool.query("SELECT value FROM global_settings WHERE key = 'difficulty_mode'");
        if (modeRes.rows.length > 0) {
          diffMode = modeRes.rows[0].value;
        }
      } catch (e) {}

      let centroids = [];
      if (diffMode === 'center') {
        centroids = allCityStreets.map(f => {
          if (f.geometry.type === 'Point') return f;
          try { return turf.centroid(f); } catch(e) { return null; }
        });
      }

      const getStreetDifficulty = (f, diffMode, index) => {
        if (f.properties.isCustom && f.properties.isLotissement) return 'lotissement';
        if (f.geometry.type === 'Point') return 'hard';

        if (diffMode === 'nomenclature') {
          const name = f.properties.name || '';
          const nameLower = name.toLowerCase().trim();
          const firstWord = nameLower.split(/[\s'-]+/)[0];
          const MAJOR_TYPES = ['boulevard', 'boulevards', 'avenue', 'avenues', 'place', 'places', 'cours', 'quai', 'quais', 'pont', 'ponts'];
          const MINOR_TYPES = ['impasse', 'impasses', 'allée', 'allées', 'chemin', 'chemins', 'chemain', 'passage', 'passages', 'ruelle', 'ruelles', 'square', 'squares', 'cour', 'cours', 'villa', 'villas', 'cité', 'cités', 'sentier', 'sentiers', 'traverse', 'traverses'];
          
          if (MAJOR_TYPES.includes(firstWord)) return 'easy';
          const isMinor = MINOR_TYPES.includes(firstWord) || nameLower.startsWith('grand chemin');
          if (!isMinor) return 'medium';
          return 'hard';
        } else if (diffMode === 'center') {
          const name = f.properties.name || '';
          const nameLower = name.toLowerCase().trim();
          const mediumWords = ['rue', 'route', 'avenue', 'boulevard', 'place', 'cours', 'quai'];
          const easyWords = [...mediumWords, 'impasse'];
          let isEasyType = easyWords.some(w => nameLower.includes(w));
          let isMediumType = mediumWords.some(w => nameLower.includes(w));
          let isHardType = nameLower.includes('chemin') || nameLower.includes('allée') || nameLower.includes('ruelle') || nameLower.includes('chemain');
          
          let nearCount = 0;
          if (centroids[index]) {
            for (let j = 0; j < centroids.length; j++) {
              if (index === j || !centroids[j]) continue;
              try {
                const dist = turf.distance(centroids[index], centroids[j], { units: 'meters' });
                if (dist <= 200) nearCount++;
              } catch(e) {}
            }
          }
          
          const inCenter = nearCount >= 4;
          if (isHardType) return 'hard';
          if (inCenter && isEasyType) return 'easy';
          if (isMediumType) return 'medium';
          return 'hard';
        } else {
          let streetLength = 0;
          try { streetLength = turf.length(f, { units: 'meters' }); } catch (e) { return 'hard'; }
          if (streetLength > 800) return 'easy';
          if (streetLength >= 250 && streetLength <= 800) return 'medium';
          return 'hard';
        }
      };

      const uniqueStreetsMap = new Map();
      allCityStreets.forEach((street, index) => {
        const nameKey = street.properties.name.toLowerCase().trim();
        if (!uniqueStreetsMap.has(nameKey)) {
          street.computedDifficulty = getStreetDifficulty(street, diffMode, index);
          uniqueStreetsMap.set(nameKey, street);
        }
      });
      const uniqueStreetsList = Array.from(uniqueStreetsMap.values());

      let selectedStreets = [];

      if (testNumber && typeof testNumber === 'number') {
        const easyStreets = uniqueStreetsList.filter(s => s.computedDifficulty === 'easy');
        const mediumStreets = uniqueStreetsList.filter(s => s.computedDifficulty === 'medium');
        const hardStreets = uniqueStreetsList.filter(s => s.computedDifficulty === 'hard');
        
        const mulberry32 = (a) => {
          return function() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
          }
        };
        const random = mulberry32(testNumber);

        const shuffleSeeded = (array) => {
          let currentIndex = array.length, randomIndex;
          while (currentIndex > 0) {
            randomIndex = Math.floor(random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
          }
          return array;
        };

        shuffleSeeded(easyStreets);
        shuffleSeeded(mediumStreets);
        shuffleSeeded(hardStreets);

        let pickedEasy = easyStreets.splice(0, 3);
        let pickedMedium = mediumStreets.splice(0, 3);
        let pickedHard = hardStreets.splice(0, 4);

        selectedStreets = [...pickedEasy, ...pickedMedium, ...pickedHard];
        
        let needed = 10 - selectedStreets.length;
        const remaining = [...hardStreets, ...mediumStreets, ...easyStreets];
        shuffleSeeded(remaining);
        if (needed > 0) {
          selectedStreets.push(...remaining.splice(0, needed));
        }
        
        shuffleSeeded(selectedStreets);

        if (selectedStreets.length < 10) {
          return res.status(400).json({ error: 'not_enough_streets_difficulty' });
        }
      } else {
        const filteredStreets = uniqueStreetsList.filter(s => {
          if (difficulty === 'lotissement') return s.properties.isCustom && s.properties.isLotissement;
          return s.computedDifficulty === difficulty;
        });

        if (filteredStreets.length < 5) {
          return res.status(400).json({ error: 'not_enough_streets_difficulty' });
        }

        for (let i = filteredStreets.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [filteredStreets[i], filteredStreets[j]] = [filteredStreets[j], filteredStreets[i]];
        }
        selectedStreets = filteredStreets.slice(0, 5);
      }

      const session = {
        gameId: crypto.randomUUID(),
        username: req.user.username,
        mode,
        difficulty: testNumber ? 'competition' : difficulty,
        testNumber: testNumber || null,
        streets: selectedStreets.map((s, idx) => ({
          id: idx,
          name: s.properties.name,
          geometry: s.geometry,
          difficulty: s.computedDifficulty
        })),
        currentRound: 0,
        streakCount: 0,
        scores: [],
        sprintHistory: []
      };

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ error: 'Server security configuration error' });
      }

      const gameToken = encrypt(JSON.stringify(session), secret);
      const currentStreet = session.streets[0];
      const nextPrompt = {
        roundIndex: 0,
        mode: session.mode
      };

      if (mode === 'target' || mode === 'sprint') {
        nextPrompt.streetName = currentStreet.name;
      } else if (mode === 'identify') {
        nextPrompt.geometry = currentStreet.geometry;
      }

      return res.json({
        gameToken,
        nextPrompt,
        isFinished: false
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error starting game' });
    }
  }

  static async submitRound(req, res) {
    try {
      const { gameToken, guess, elapsedSeconds } = req.body;
      if (!gameToken) {
        return res.status(400).json({ error: 'gameToken is required' });
      }

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ error: 'Server security configuration error' });
      }

      let session;
      try {
        session = JSON.parse(decrypt(gameToken, secret));
      } catch (err) {
        return res.status(400).json({ error: 'Invalid or tampered gameToken' });
      }

      if (session.username !== req.user.username) {
        return res.status(403).json({ error: 'Game session does not belong to you' });
      }

      if (session.currentRound >= session.streets.length) {
        return res.status(400).json({ error: 'Game is already finished' });
      }

      if (session.streakCount === undefined) {
        session.streakCount = 0;
      }

      const currentStreet = session.streets[session.currentRound];
      const mode = session.mode;
      const effectiveDifficulty = session.difficulty === 'competition' ? currentStreet.difficulty : session.difficulty;
      const totalTime = effectiveDifficulty === 'easy' ? 45 : (effectiveDifficulty === 'medium' || effectiveDifficulty === 'lotissement' ? 60 : 90);
      const remainingTime = Math.max(0, totalTime - (elapsedSeconds || 0));

      let pointsEarned = 0;
      let isCorrect = false;
      let distance = -1;
      let message = '';
      let feedback = {
        correctName: currentStreet.name,
        geometry: currentStreet.geometry
      };

      if (mode === 'target' || mode === 'sprint') {
        if (!guess || typeof guess.lat !== 'number' || typeof guess.lng !== 'number') {
          distance = -1;
          pointsEarned = 0;
          isCorrect = false;
          feedback.code = remainingTime <= 0 ? 'timeout_guess' : 'passed';
          message = remainingTime <= 0 ? "Temps écoulé ! Vous n'avez pas sélectionné d'emplacement." : "Passé.";
        } else {
          distance = getDistanceToStreet(guess.lat, guess.lng, currentStreet.geometry);
          feedback.distance = Math.round(distance);
          if (distance <= 15) {
            pointsEarned = 100;
            isCorrect = true;
            feedback.code = 'perfect';
            message = 'Parfait ! Vous êtes exactement sur la rue.';
          } else if (distance <= 100) {
            const ratio = 1 - ((distance - 15) / 85);
            pointsEarned = Math.round(10 + (40 * ratio));
            isCorrect = true;
            feedback.code = 'near';
            message = `Pas mal ! Vous êtes à ${Math.round(distance)}m de la rue.`;
          } else {
            pointsEarned = 0;
            isCorrect = false;
            feedback.code = 'miss';
            message = `Raté. Vous étiez à ${Math.round(distance)}m. Voici le véritable emplacement.`;
          }

          let timeBonus = 0;
          if (pointsEarned > 0 && remainingTime > 0) {
            const timeRatio = remainingTime / totalTime;
            if (mode === 'sprint') {
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

        if (mode === 'sprint') {
          session.sprintHistory.push({
            name: currentStreet.name,
            distance: distance === -1 ? -1 : Math.round(distance),
            points: pointsEarned,
            timeBonus: feedback.timeBonus || 0
          });
        }
      } else if (mode === 'identify') {
        const normalize = (str) => typeof str === 'string' ? str.toLowerCase().replace(/^(le|la|les|l'|d'|du|de|des)\s+/, '').replace(/[^a-z0-9]/g, '').trim() : '';
        const cleanAnswer = normalize(guess);
        const cleanCorrect = normalize(currentStreet.name);

        isCorrect = cleanAnswer.length > 0 && (cleanAnswer === cleanCorrect || cleanCorrect.includes(cleanAnswer));
        if (isCorrect) {
          pointsEarned = 15;
          feedback.code = 'identify_correct';
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
          feedback.code = remainingTime <= 0 ? 'identify_timeout' : 'identify_false';
          message = remainingTime <= 0
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
          mode: session.mode
        };
        if (mode === 'target' || mode === 'sprint') {
          nextPrompt.streetName = nextStreet.name;
        } else if (mode === 'identify') {
          nextPrompt.geometry = nextStreet.geometry;
        }
        newGameToken = encrypt(JSON.stringify(session), secret);
      } else {
        finalScore = session.scores.reduce((a, b) => a + b, 0);
        if (finalScore > 0) {
          await Score.create(session.username, finalScore, session.difficulty);
        }
      }

      return res.json({
        gameToken: newGameToken,
        feedback,
        nextPrompt,
        isFinished,
        totalScore: finalScore,
        sprintHistory: session.sprintHistory
      });
    } catch (error) {
      return res.status(500).json({ error: 'Internal server error submitting round' });
    }
  }
}
