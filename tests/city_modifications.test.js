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
