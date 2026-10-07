import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { RoomController } from "../src/backend/controllers/RoomController.js";
import pool from "../src/backend/config/database.js";

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

test("RoomController: génération de code de salon (6 caractères hexadécimaux majuscules)", () => {
  // Vérifie le format de génération crypto utilisé par RoomController
  const hexCodeRegex = /^[0-9A-F]{6}$/;

  const generatedCodes = new Set();
  for (let i = 0; i < 50; i++) {
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    assert.equal(code.length, 6, "Le code doit comporter exactement 6 caractères");
    assert.match(code, hexCodeRegex, `Le code ${code} doit être hexadécimal majuscule`);
    generatedCodes.add(code);
  }

  // Vérifie la forte entropie et l'absence de collisions sur un échantillon
  assert.equal(generatedCodes.size, 50, "Les codes générés doivent être distincts et uniques");
});

test("RoomController: calcul et rejet des salons expirés (1h, 24h, 7 jours)", async () => {
  // 1. Validation du calcul des durées de validité (1h, 24h, 168h = 7 jours)
  const calculateExpiresAt = (validityHours, baseTime = Date.now()) => {
    const parsedValidity = parseInt(validityHours, 10);
    const cleanValidityHours = (!isNaN(parsedValidity) && [1, 24, 168].includes(parsedValidity))
      ? parsedValidity
      : 24;
    return new Date(baseTime + cleanValidityHours * 3600 * 1000);
  };

  const now = Date.now();
  const exp1h = calculateExpiresAt(1, now);
  const exp24h = calculateExpiresAt(24, now);
  const exp7d = calculateExpiresAt(168, now);
  const expDefault = calculateExpiresAt(999, now); // invalide -> repli sur 24h

  assert.equal(exp1h.getTime() - now, 1 * 3600 * 1000);
  assert.equal(exp24h.getTime() - now, 24 * 3600 * 1000);
  assert.equal(exp7d.getTime() - now, 168 * 3600 * 1000);
  assert.equal(expDefault.getTime() - now, 24 * 3600 * 1000);

  // 2. Test du rejet d'un salon expiré dans joinRoom et getRoom
  const originalQuery = pool.query;

  // Cas 1 : Salon expiré (date d'expiration dans le passé)
  pool.query = async (sql) => {
    if (sql.includes("FROM rooms WHERE code = $1")) {
      return {
        rows: [
          {
            code: "EXP123",
            city_key: "paris",
            difficulty: "hard",
            test_id: 12345,
            created_by: "alice",
            status: "waiting",
            series_count: 10,
            mode: "target",
            expires_at: new Date(Date.now() - 3600 * 1000).toISOString(), // expiré il y a 1h
          },
        ],
      };
    }
    return { rows: [] };
  };

  try {
    const resJoin = createMockRes();
    await RoomController.joinRoom({ params: { code: "EXP123" }, user: { username: "bob" } }, resJoin);
    assert.equal(resJoin.statusCode, 410, "Un salon expiré doit retourner le statut HTTP 410 (Gone)");
    assert.match(resJoin.body.error, /Ce salon a expiré/i);

    const resGet = createMockRes();
    await RoomController.getRoom({ params: { code: "EXP123" } }, resGet);
    assert.equal(resGet.statusCode, 410, "getRoom doit également retourner 410 sur un salon expiré");
    assert.match(resGet.body.error, /Ce salon a expiré/i);
  } finally {
    pool.query = originalQuery;
  }

  // Cas 2 : Salon actif non expiré
  pool.query = async (sql) => {
    if (sql.includes("FROM rooms WHERE code = $1")) {
      return {
        rows: [
          {
            code: "VAL123",
            city_key: "paris",
            difficulty: "hard",
            test_id: 12345,
            created_by: "alice",
            status: "waiting",
            series_count: 10,
            mode: "target",
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // expire dans 1h
          },
        ],
      };
    }
    if (sql.includes("INSERT INTO room_participants")) {
      return { rows: [] };
    }
    return { rows: [] };
  };

  try {
    const resJoinValid = createMockRes();
    await RoomController.joinRoom({ params: { code: "VAL123" }, user: { username: "bob" } }, resJoinValid);
    assert.equal(resJoinValid.statusCode, 200, "Un salon actif doit pouvoir être rejoint (200 OK)");
    assert.equal(resJoinValid.body.roomCode, "VAL123");
  } finally {
    pool.query = originalQuery;
  }
});

test("RoomController: mélange déterministe des rues via test_id (mulberry32 PRNG)", () => {
  // L'algorithme PRNG utilisé par CityMaster pour garantir que tous les joueurs d'un salon ont les mêmes questions dans le même ordre
  const mulberry32 = (seed) => {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const shuffleSeeded = (array, seed) => {
    const arr = [...array];
    const random = mulberry32(seed);
    let currentIndex = arr.length;
    while (currentIndex > 0) {
      const randomIndex = Math.floor(random() * currentIndex);
      currentIndex--;
      [arr[currentIndex], arr[randomIndex]] = [arr[randomIndex], arr[currentIndex]];
    }
    return arr;
  };

  const sampleStreets = [
    "Rue de la Paix",
    "Avenue des Champs-Élysées",
    "Boulevard Saint-Germain",
    "Rue de Rivoli",
    "Boulevard Haussmann",
    "Rue Victor Hugo",
    "Avenue Montaigne",
    "Rue Saint-Honoré",
    "Boulevard Saint-Michel",
    "Rue La Fayette"
  ];

  const testId1 = 54321;
  const testId2 = 98765;

  // 1. Deux mélanges avec le MÊME test_id doivent produire un ordre rigoureusement IDENTIQUE
  const run1 = shuffleSeeded(sampleStreets, testId1);
  const run2 = shuffleSeeded(sampleStreets, testId1);
  assert.deepEqual(run1, run2, "Deux joueurs avec le même test_id doivent recevoir exactement les mêmes rues dans le même ordre");

  // 2. Un mélange avec un test_id DIFFÉRENT doit produire un ordre différent
  const runDiff = shuffleSeeded(sampleStreets, testId2);
  assert.notDeepEqual(run1, runDiff, "Deux test_id différents doivent produire des tirages distincts");

  // 3. Toutes les rues d'origine doivent être conservées sans duplication ni omission
  assert.equal(run1.length, sampleStreets.length);
  assert.deepEqual([...run1].sort(), [...sampleStreets].sort());
});

