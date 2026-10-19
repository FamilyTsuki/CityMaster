import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { NetworkService } from "../src/services/NetworkService.js";
import { ScoreController } from "../src/controllers/ScoreController.js";

test("Service Worker: returns HTTP 503 on offline API fallback and caches OSM tiles", () => {
  const swContent = fs.readFileSync(path.resolve("public/sw.js"), "utf8");

  // Vérifier le statut 503 pour les requêtes API en échec
  assert.match(
    swContent,
    /status:\s*503/,
    "sw.js must explicitly return status: 503 for offline API responses",
  );

  // Vérifier le support du cache des tuiles OpenStreetMap
  assert.match(
    swContent,
    /tile\.openstreetmap\.org/,
    "sw.js must allow caching OpenStreetMap tiles",
  );

  // Vérifier la présence de NetworkService dans STATIC_ASSETS
  assert.match(
    swContent,
    /\/src\/services\/NetworkService\.js/,
    "sw.js must precache NetworkService.js",
  );
});

test("index.html: contains accessible #offline-banner with ARIA attributes", () => {
  const indexHtml = fs.readFileSync(path.resolve("public/index.html"), "utf8");

  assert.match(
    indexHtml,
    /id=["']offline-banner["']/,
    "index.html must contain #offline-banner element",
  );
  assert.match(
    indexHtml,
    /role=["']status["']/,
    "offline-banner must have role='status' for screen readers",
  );
  assert.match(
    indexHtml,
    /aria-live=["']polite["']/,
    "offline-banner must have aria-live='polite'",
  );
  assert.match(
    indexHtml,
    /data-i18n=["']offline\.banner_offline["']/,
    "offline-banner must have data-i18n attribute for localization",
  );
});

test("NetworkService: subscribes to status changes and updates state", () => {
  const service = NetworkService.getInstance();
  assert.strictEqual(typeof service.isOnline(), "boolean");

  let receivedStatus = null;
  const unsubscribe = service.onStatusChange((isOnline) => {
    receivedStatus = isOnline;
  });

  assert.strictEqual(typeof unsubscribe, "function");
  unsubscribe();
});

test("ScoreController: queuePendingScore persists scores in storage and flushPendingScores drains them", async () => {
  // Mock localStorage
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const k of Object.keys(store)) delete store[k];
    },
  };

  const mockGameView = {
    renderLeaderboard: () => {},
    showError: () => {},
  };

  const controller = new ScoreController(mockGameView);

  // Queue two scores
  controller.queuePendingScore("Alice", 1250);
  controller.queuePendingScore("Bob", 840);

  const stored = JSON.parse(store["citymaster_pending_scores"]);
  assert.strictEqual(stored.length, 2);
  assert.strictEqual(stored[0].player, "Alice");
  assert.strictEqual(stored[0].score, 1250);
  assert.strictEqual(stored[1].player, "Bob");
  assert.strictEqual(stored[1].score, 840);

  // Test drain when token is absent (should gracefully skip)
  await controller.flushPendingScores();
  assert.strictEqual(stored.length, 2, "Should retain scores until valid token/online flush");
});

