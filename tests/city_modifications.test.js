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

test("GameController.startGame respects difficulty override from difficulty_overrides.json", async () => {
  const { GameController } = await import(
    "../src/backend/controllers/GameController.js"
  );
  const { decrypt } = await import("../src/backend/utils/game.js");
  const fs = await import("fs/promises");
  const path = await import("path");

  process.env.JWT_SECRET =
    process.env.JWT_SECRET || "test_jwt_secret_citymaster_tests_123456789";

  const diffFilePath = path.join(
    process.cwd(),
    "public",
    "assets",
    "data",
    "difficulty_overrides.json",
  );
  let origContent = "{}";
  try {
    origContent = await fs.readFile(diffFilePath, "utf8");
  } catch (e) {}

  try {
    let diffData = {};
    try {
      diffData = JSON.parse(origContent);
    } catch (e) {}
    diffData["saint_cyr"] = diffData["saint_cyr"] || {};
    
    diffData["saint_cyr"]["chemin de gobson"] = "easy";
    await fs.writeFile(diffFilePath, JSON.stringify(diffData, null, 2), "utf8");

    let responseData = null;
    const req = {
      body: {
        cityKey: "saint_cyr",
        mode: "target",
        difficulty: "easy",
        seriesCount: 50,
      },
      user: { username: "tester" },
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await GameController.startGame(req, res);
    assert.ok(responseData, "startGame should return a response");
    assert.ok(responseData.gameToken, "startGame should return gameToken");

    const session = JSON.parse(
      decrypt(responseData.gameToken, process.env.JWT_SECRET),
    );
    const gobson = session.streets.find(
      (s) => s.name.toLowerCase().trim() === "chemin de gobson",
    );
    assert.ok(
      gobson,
      "Chemin de Gobson should be present in easy session due to override",
    );
    assert.equal(
      gobson.difficulty,
      "easy",
      "Difficulty should be overridden to easy",
    );
  } finally {
    await fs.writeFile(diffFilePath, origContent, "utf8");
  }
});

test("AdminController.saveRoute correctly preserves MultiLineString geometry for disconnected streets", async () => {
  const { AdminController } = await import(
    "../src/backend/controllers/AdminController.js"
  );
  const fs = await import("fs/promises");
  const path = await import("path");

  const routesFilePath = path.join(
    process.cwd(),
    "public",
    "assets",
    "data",
    "custom_routes.json",
  );
  let origRoutes = "{}";
  try {
    origRoutes = await fs.readFile(routesFilePath, "utf8");
  } catch (e) {}

  try {
    let responseData = null;
    const multiSegmentRoute = {
      name: "Avenue de Paris",
      difficulty: "easy",
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [1.9, 47.76],
            [1.91, 47.75],
          ],
          [
            [1.92, 47.74],
            [1.93, 47.73],
          ],
        ],
      },
    };

    const req = {
      body: {
        cityKey: "la_ferte_saint_aubin",
        route: multiSegmentRoute,
      },
    };
    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await AdminController.saveRoute(req, res);
    assert.ok(responseData, "saveRoute should return a response");
    assert.ok(responseData.feature, "saveRoute should return saved feature");
    assert.equal(responseData.feature.geometry.type, "MultiLineString");
    assert.equal(responseData.feature.geometry.coordinates.length, 2);
    assert.deepEqual(responseData.feature.geometry.coordinates[0], [
      [1.9, 47.76],
      [1.91, 47.75],
    ]);

    const savedFile = JSON.parse(await fs.readFile(routesFilePath, "utf8"));
    const savedInCity = savedFile["la_ferte_saint_aubin"];
    assert.ok(Array.isArray(savedInCity));
    const savedItem = savedInCity.find(
      (r) => r.properties.name === "Avenue de Paris",
    );
    assert.ok(savedItem);
    assert.equal(savedItem.geometry.type, "MultiLineString");
    assert.equal(savedItem.geometry.coordinates.length, 2);
  } finally {
    await fs.writeFile(routesFilePath, origRoutes, "utf8");
  }
});

