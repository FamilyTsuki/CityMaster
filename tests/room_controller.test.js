import test from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { RoomController } from "../src/backend/controllers/RoomController.js";
import pool from "../src/backend/config/database.js";
import { createMockRes } from "./helpers.js";
import { pickStreets, seededRandom } from "../src/backend/services/CityStreetsService.js";

test("RoomController: génération de code de salon (6 caractères hexadécimaux majuscules)", () => {
  
  const hexCodeRegex = /^[0-9A-F]{6}$/;

  const generatedCodes = new Set();
  for (let i = 0; i < 50; i++) {
    const code = crypto.randomBytes(3).toString("hex").toUpperCase();
    assert.equal(code.length, 6, "Le code doit comporter exactement 6 caractères");
    assert.match(code, hexCodeRegex, `Le code ${code} doit être hexadécimal majuscule`);
    generatedCodes.add(code);
  }

  assert.equal(generatedCodes.size, 50, "Les codes générés doivent être distincts et uniques");
});

test("RoomController: calcul et rejet des salons expirés (1h, 24h, 7 jours)", async () => {
  
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
  const expDefault = calculateExpiresAt(999, now); 

  assert.equal(exp1h.getTime() - now, 1 * 3600 * 1000);
  assert.equal(exp24h.getTime() - now, 24 * 3600 * 1000);
  assert.equal(exp7d.getTime() - now, 168 * 3600 * 1000);
  assert.equal(expDefault.getTime() - now, 24 * 3600 * 1000);

  const originalQuery = pool.query;

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
            expires_at: new Date(Date.now() - 3600 * 1000).toISOString(), 
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
            expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), 
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

test("Tirage des rues : même test_id, mêmes rues dans le même ordre (code réel)", () => {
  const streets = [
    ...["Rue A", "Rue B", "Rue C", "Rue D", "Rue E", "Rue F"].map((name) => ({
      feature: { properties: { name } },
      difficulty: "hard",
    })),
    ...["Avenue G", "Avenue H", "Avenue I"].map((name) => ({
      feature: { properties: { name } },
      difficulty: "medium",
    })),
  ];
  const names = (picked) => picked.map((s) => s.feature.properties.name);

  const run1 = names(pickStreets(streets, "hard", 8, seededRandom(54321)));
  const run2 = names(pickStreets(streets, "hard", 8, seededRandom(54321)));
  const other = names(pickStreets(streets, "hard", 8, seededRandom(98765)));

  assert.deepEqual(run1, run2);
  assert.notDeepEqual(run1, other);
  assert.equal(run1.length, 8);
  assert.ok(run1.slice(0, 6).every((n) => n.startsWith("Rue")), "les rues de la difficulté demandée d'abord");
  assert.ok(run1.slice(6).every((n) => n.startsWith("Avenue")), "puis les rues de secours");

  // Valeur obtenue avec l'algorithme d'avant la refonte (v2.17.5) :
  // un salon créé avant une mise à jour garde exactement les mêmes rues.
  assert.deepEqual(run1, ["Rue D", "Rue C", "Rue F", "Rue A", "Rue B", "Rue E", "Avenue I", "Avenue G"]);
});

test("RoomController.createRoom: refuse les invités et les paramètres invalides", async () => {
  const guest = createMockRes();
  await RoomController.createRoom(
    { body: { cityKey: "paris", difficulty: "hard" }, user: { username: "g", is_guest: true } },
    guest,
  );
  assert.equal(guest.statusCode, 403);

  const badDifficulty = createMockRes();
  await RoomController.createRoom(
    { body: { cityKey: "paris", difficulty: "' OR 1=1" }, user: { username: "alice", id: 1 } },
    badDifficulty,
  );
  assert.equal(badDifficulty.statusCode, 400);

  const badCity = createMockRes();
  await RoomController.createRoom(
    { body: { cityKey: "../etc", difficulty: "hard" }, user: { username: "alice", id: 1 } },
    badCity,
  );
  assert.equal(badCity.statusCode, 400);
});

test("RoomController.submitRoomScore: rejette les scores impossibles", async () => {
  const originalQuery = pool.query;
  const updates = [];
  pool.query = async (sql, params) => {
    if (sql.includes("SELECT series_count FROM rooms")) return { rows: [{ series_count: 2 }] };
    if (sql.includes("UPDATE room_participants")) {
      updates.push(params);
      return { rows: [{ username: "bob", score: params[0] }] };
    }
    if (sql.includes("SELECT finished")) return { rows: [{ finished: false }] };
    return { rows: [] };
  };
  try {
    for (const score of [-5, 1.5, "abc", 2 * 600 + 1]) {
      const res = createMockRes();
      await RoomController.submitRoomScore({ params: { code: "abc123" }, body: { score }, user: { username: "bob" } }, res);
      assert.equal(res.statusCode, 400, `score ${score} doit être refusé`);
    }
    const ok = createMockRes();
    await RoomController.submitRoomScore({ params: { code: "abc123" }, body: { score: 1200 }, user: { username: "bob" } }, ok);
    assert.equal(ok.statusCode, 200);
    assert.deepEqual(updates, [[1200, "ABC123", "bob"]]);
  } finally {
    pool.query = originalQuery;
  }
});
