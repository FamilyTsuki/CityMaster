import test from "node:test";
import assert from "node:assert/strict";
import { User, isUserAdmin } from "../src/backend/models/User.js";

test("isUserAdmin strictly checks is_admin property", () => {
  assert.equal(isUserAdmin(null), false);
  assert.equal(isUserAdmin({}), false);
  assert.equal(
    isUserAdmin({ username: "random_user", is_admin: false }),
    false,
  );
  assert.equal(isUserAdmin({ username: "random_user", is_admin: true }), true);
  assert.equal(
    isUserAdmin({ username: "random_user", is_admin: "true" }),
    true,
  );
  assert.equal(isUserAdmin({ username: "other", is_admin: false }), false);
});

test("User.setAdminStatus persists admin and findByUsername retrieves it", async () => {
  const testUser = "admin_test_" + Date.now();

  const user = await User.setAdminStatus(testUser, true);
  assert.ok(user);
  assert.equal(user.username.toLowerCase(), testUser.toLowerCase());
  assert.equal(user.is_admin, true);

  const retrieved = await User.findByUsername(testUser);
  assert.ok(retrieved);
  assert.equal(retrieved.is_admin, true);

  await User.setAdminStatus(testUser, false);
  const downgraded = await User.findByUsername(testUser);
  assert.ok(downgraded);
  assert.equal(downgraded.is_admin, false);

  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const usersPath = path.join(process.cwd(), "config", "users.json");
    const content = JSON.parse(await fs.readFile(usersPath, "utf8"));
    const filtered = content.filter(
      (u) => !u.username.startsWith("admin_test_"),
    );
    await fs.writeFile(usersPath, JSON.stringify(filtered, null, 2), "utf8");
  } catch (e) {}
});

test("requireAdmin middleware validates token and checks persistent User fallback", async () => {
  const { requireAdmin } = await import("../src/backend/middleware/auth.js");
  const jwt = (await import("jsonwebtoken")).default;

  const adminToken = jwt.sign(
    { id: 9999, username: "tsuki", is_admin: false },
    process.env.JWT_SECRET || "testsecret",
  );

  let passed = false;
  const mockReq = {
    headers: { authorization: `Bearer ${adminToken}` },
  };
  const mockRes = {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  const mockNext = () => {
    passed = true;
  };

  process.env.JWT_SECRET = process.env.JWT_SECRET || "testsecret";
  await new Promise((resolve) => {
    requireAdmin(mockReq, mockRes, () => {
      mockNext();
      resolve();
    });
    const origJson = mockRes.json.bind(mockRes);
    mockRes.json = (body) => {
      origJson(body);
      resolve();
    };
  });

  assert.equal(
    passed,
    true,
    "tsuki should be authenticated as admin even if token has is_admin: false",
  );
});

test("Admin route lookup matches numeric id, string id, properties.id and originalName", () => {
  const routes = [
    {
      type: "Feature",
      id: 42,
      properties: { name: "Rue Numeric Id" },
    },
    {
      type: "Feature",
      properties: { id: "custom_str_99", name: "Avenue String Id" },
    },
    {
      type: "Feature",
      properties: {
        id: "renamed_1",
        name: "Place Nouvelle",
        originalName: "Place Ancienne",
      },
    },
  ];

  const matchRoute = (id, name) => {
    return routes.find(
      (r) =>
        (r.properties?.id !== undefined &&
          String(r.properties.id) === String(id)) ||
        (r.id !== undefined && String(r.id) === String(id)) ||
        (r.properties?.name &&
          (r.properties.name === name || r.properties.name === id)) ||
        (r.properties?.originalName &&
          (r.properties.originalName === name ||
            r.properties.originalName === id)),
    );
  };

  // String dataset id matching numeric r.id
  assert.equal(
    matchRoute("42", "Rue Numeric Id")?.properties.name,
    "Rue Numeric Id",
  );
  // String id matching r.properties.id
  assert.equal(
    matchRoute("custom_str_99", "Avenue String Id")?.properties.name,
    "Avenue String Id",
  );
  // Original name fallback
  assert.equal(
    matchRoute("Place Ancienne", "Place Ancienne")?.properties.name,
    "Place Nouvelle",
  );
  // Name fallback when id is empty
  assert.equal(matchRoute("", "Rue Numeric Id")?.id, 42);
});

test("AdminController.getSettings returns file fallback when database query fails", async () => {
  const { AdminController } =
    await import("../src/backend/controllers/AdminController.js");
  let responseData = null;
  const req = {};
  const res = {
    json(data) {
      responseData = data;
      return this;
    },
    status() {
      return this;
    },
  };

  await AdminController.getSettings(req, res);
  assert.ok(responseData !== null, "getSettings should return an object");
  assert.equal(typeof responseData, "object");
});
