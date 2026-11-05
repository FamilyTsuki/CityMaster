import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { NetworkService } from "../src/services/NetworkService.js";
import { ScoreController } from "../src/controllers/ScoreController.js";

test("Service Worker: returns HTTP 503 on offline API fallback and caches OSM tiles", () => {
  const swContent = fs.readFileSync(path.resolve("public/sw.js"), "utf8");

  assert.match(
    swContent,
    /status:\s*503/,
    "sw.js must explicitly return status: 503 for offline API responses",
  );

  assert.match(
    swContent,
    /tile\.openstreetmap\.org/,
    "sw.js must allow caching OpenStreetMap tiles",
  );

  assert.match(
    swContent,
    /\/src\/services\/NetworkService\.js/,
    "sw.js must precache NetworkService.js",
  );
});

test("Statut réseau : message flash à la place du bandeau hors-ligne", () => {
  const indexHtml = fs.readFileSync(path.resolve("public/index.html"), "utf8");
  const networkSource = fs.readFileSync(path.resolve("src/services/NetworkService.js"), "utf8");

  assert.doesNotMatch(indexHtml, /offline-banner/, "index.html ne doit plus contenir de bandeau hors-ligne");
  assert.match(networkSource, /FlashMessageService\.error\(/, "la perte de connexion affiche un flash d'erreur");
  assert.match(networkSource, /FlashMessageService\.success\(/, "le retour de connexion affiche un flash de succès");
});

test("NetworkService: subscribes to status changes and updates state", () => {
  const service = NetworkService.getInstance();
  assert.strictEqual(typeof service.isOnline(), "boolean");

  const unsubscribe = service.onStatusChange(() => {});

  assert.strictEqual(typeof unsubscribe, "function");
  unsubscribe();
});

test("ScoreController: supprime l'ancienne file de scores hors-ligne au démarrage", async () => {
  const store = { citymaster_pending_scores: JSON.stringify([{ player: "Alice", score: 1250 }]) };
  global.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
  };

  new ScoreController({ renderLeaderboard: () => {}, showError: () => {} });
  assert.equal(store.citymaster_pending_scores, undefined);
});

test("CertificateView: displays offline notice and hides global leaderboard in offline mode", async () => {
  const { CertificateView } = await import("../src/views/CertificateView.js");

  // Mock DOM
  const certElements = {
    "cert-player-name": { textContent: "", style: {} },
    "cert-score": { textContent: "" },
    "cert-percentile-text": { textContent: "" },
    "cert-rank-comparison": {
      classList: {
        contains: () => false,
        add: () => {},
        remove: () => {},
      },
    },
    "test-leaderboard-container": {
      classList: {
        contains: () => false,
        add: (cls) => {
          certElements["test-leaderboard-container"].hidden = cls === "hidden";
        },
        remove: () => {},
      },
      hidden: false,
    },
    "test-leaderboard-title": { textContent: "" },
    "test-leaderboard-body": { replaceChildren: () => {} },
  };

  global.document = {
    getElementById: (id) => certElements[id] || null,
  };

  const certView = new CertificateView();
  certView.render("Alice", 1500, "target", [], 42, true);

  assert.strictEqual(
    certElements["test-leaderboard-container"].hidden,
    true,
    "Test leaderboard must remain hidden during offline games",
  );
  assert.match(
    certElements["cert-percentile-text"].textContent,
    /hors-ligne/i,
    "Certificate must display an offline notice explaining score remains local",
  );
});

test("badges.css: defines .city-offline-badge style for offline ready cities", () => {
  const css = fs.readFileSync(path.resolve("public/assets/styles/components/badges.css"), "utf8");
  assert.match(css, /\.city-offline-badge\s*\{/, ".city-offline-badge must be defined in badges.css");
});

test("HUD de jeu : positionné sous la barre de navigation", () => {
  const gameCss = fs.readFileSync(path.resolve("public/assets/styles/game.css"), "utf8");

  assert.doesNotMatch(gameCss, /offline-banner/, "game.css ne doit plus décaler le HUD pour le bandeau");

  assert.match(
    gameCss,
    /\.ui-overlay-top\s*\{[^}]*top:\s*var\(--game-top-offset\)/s,
    ".ui-overlay-top must use top: var(--game-top-offset)",
  );

  assert.match(
    gameCss,
    /\.leaflet-control-zoom\s*\{[^}]*margin-bottom:\s*clamp\(/s,
    ".leaflet-control-zoom must be elevated to prevent overlapping bottom action bar",
  );
});

test("PWA Auto-Update: SW install uses cache reload, index.html handles controllerchange and updateViaCache", () => {
  const swContent = fs.readFileSync(path.resolve("public/sw.js"), "utf8");
  const indexHtml = fs.readFileSync(path.resolve("public/index.html"), "utf8");

  // sw.js cache reload
  assert.match(
    swContent,
    /cache:\s*["']reload["']/,
    "sw.js must use cache: 'reload' when caching static assets to bypass stale HTTP cache",
  );
  assert.match(
    swContent,
    /SKIP_WAITING/,
    "sw.js must listen for SKIP_WAITING message",
  );

  // index.html controllerchange and updateViaCache
  assert.match(
    indexHtml,
    /controllerchange/,
    "index.html must listen to controllerchange to refresh active clients",
  );
  assert.match(
    indexHtml,
    /updateViaCache:\s*["']none["']/,
    "index.html must register sw.js with updateViaCache: 'none'",
  );
  assert.match(
    indexHtml,
    /visibilitychange/,
    "index.html must check for updates on visibilitychange when mobile PWA resumes",
  );
});

