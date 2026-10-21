import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCityStreets } from "../src/services/SpatialService.js";

test("Merge streets correctly adds custom routes", () => {
  const defaults = [
    {
      type: "Feature",
      id: 1,
      properties: { name: "Rue de la Paix" },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    },
  ];
  const customRoutes = [
    {
      type: "Feature",
      properties: { id: "route_123", name: "Avenue Nouvelle", isCustom: true },
      geometry: {
        type: "LineString",
        coordinates: [
          [2, 2],
          [3, 3],
        ],
      },
    },
  ];

  const merged = mergeCityStreets(defaults, [], customRoutes);
  assert.equal(merged.length, 2);
  const names = merged.map((f) => f.properties.name);
  assert.ok(names.includes("Rue de la Paix"));
  assert.ok(names.includes("Avenue Nouvelle"));
});

test("Merge streets overrides renamed default street without duplicates", () => {
  const defaults = [
    {
      type: "Feature",
      id: 1,
      properties: { name: "Rue Ancienne" },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    },
    {
      type: "Feature",
      id: 2,
      properties: { name: "Rue Permanente" },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 2],
        ],
      },
    },
  ];
  const customRoutes = [
    {
      type: "Feature",
      properties: {
        id: "route_mod",
        originalName: "Rue Ancienne",
        name: "Rue Moderne",
        isCustom: true,
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [5, 5],
          [6, 6],
        ],
      },
    },
  ];

  const merged = mergeCityStreets(defaults, [], customRoutes);
  assert.equal(merged.length, 2);
  const names = merged.map((f) => f.properties.name);
  assert.ok(!names.includes("Rue Ancienne"), "Old name should be filtered out");
  assert.ok(names.includes("Rue Moderne"), "New name should be present");
  assert.ok(
    names.includes("Rue Permanente"),
    "Other street should be preserved",
  );
});

test("Merge streets removes deleted default street", () => {
  const defaults = [
    {
      type: "Feature",
      id: 10,
      properties: { name: "Rue A Supprimer" },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    },
    {
      type: "Feature",
      id: 11,
      properties: { name: "Rue A Conserver" },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 2],
        ],
      },
    },
  ];
  const customRoutes = [
    {
      type: "Feature",
      properties: {
        id: "Rue A Supprimer",
        name: "Rue A Supprimer",
        isDeleted: true,
      },
    },
  ];

  const merged = mergeCityStreets(defaults, [], customRoutes);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].properties.name, "Rue A Conserver");
});

test("Merge streets removes original street when a renamed street is deleted", () => {
  const defaults = [
    {
      type: "Feature",
      id: 20,
      properties: { name: "Rue Origine" },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 1],
        ],
      },
    },
    {
      type: "Feature",
      id: 21,
      properties: { name: "Rue Restante" },
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 2],
        ],
      },
    },
  ];
  const customRoutes = [
    {
      type: "Feature",
      properties: {
        id: "route_renamed_then_deleted",
        name: "Rue Renommee",
        originalName: "Rue Origine",
        isDeleted: true,
      },
    },
  ];

  const merged = mergeCityStreets(defaults, [], customRoutes);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].properties.name, "Rue Restante");
});

test("RouteDifficultyService respects route.properties.difficulty", async () => {
  const { RouteDifficultyService } = await import(
    "../src/services/RouteDifficultyService.js"
  );
  const customFeature = {
    type: "Feature",
    properties: {
      id: "custom_1",
      name: "Allée Secrète",
      difficulty: "easy",
    },
    geometry: {
      type: "LineString",
      coordinates: [
        [0, 0],
        [0.001, 0.001],
      ],
    },
  };
  const diff = RouteDifficultyService.getRouteDifficulty(customFeature, 0, 0);
  assert.equal(
    diff,
    "easy",
    "Custom route with explicit difficulty should return easy despite minor keyword",
  );
});

test("GameController.startGame applique les difficultés forcées par l'administration", async () => {
  const { GameController } = await import("../src/backend/controllers/GameController.js");
  const { decryptGameToken } = await import("../src/backend/utils/game.js");
  const { writeDataFile, makeCity, makeStreet, createMockRes } = await import("./helpers.js");

  await writeDataFile(
    "override_city.json",
    makeCity([makeStreet("Chemin de Gobson", { lengthMeters: 120 })]),
  );
  await writeDataFile("difficulty_overrides.json", {
    override_city: { "chemin de gobson": "easy" },
  });

  const res = createMockRes();
  await GameController.startGame(
    {
      body: { cityKey: "override_city", mode: "target", difficulty: "easy", seriesCount: 5 },
      user: { username: "tester" },
    },
    res,
  );
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));

  const session = decryptGameToken(res.body.gameToken, process.env.JWT_SECRET);
  assert.equal(session.streets.length, 5);
  assert.equal(
    session.streets[0].name,
    "Chemin de Gobson",
    "la seule rue facile (forcée) doit être tirée en premier",
  );
  assert.equal(session.streets[0].difficulty, "easy");
});

test("AdminController.saveRoute conserve une géométrie MultiLineString", async () => {
  const { AdminController } = await import("../src/backend/controllers/AdminController.js");
  const { readDataFile, createMockRes } = await import("./helpers.js");

  const res = createMockRes();
  await AdminController.saveRoute(
    {
      body: {
        cityKey: "la_ferte_saint_aubin",
        route: {
          name: "Avenue de Paris",
          difficulty: "easy",
          geometry: {
            type: "MultiLineString",
            coordinates: [
              [[1.9, 47.76], [1.91, 47.75]],
              [[1.92, 47.74], [1.93, 47.73]],
            ],
          },
        },
      },
    },
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.feature.geometry.type, "MultiLineString");
  assert.equal(res.body.feature.properties.difficulty, "easy");

  const saved = (await readDataFile("custom_routes.json")).la_ferte_saint_aubin;
  assert.equal(saved.length, 1);
  assert.equal(saved[0].geometry.type, "MultiLineString");
  assert.equal(saved[0].geometry.coordinates.length, 2);

  const overrides = await readDataFile("difficulty_overrides.json");
  assert.equal(overrides.la_ferte_saint_aubin["avenue de paris"], "easy");
});
