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

  // Downgrade
  await User.setAdminStatus(testUser, false);
  const downgraded = await User.findByUsername(testUser);
  assert.ok(downgraded);
  assert.equal(downgraded.is_admin, false);

  // Clean up test entry
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const usersPath = path.join(
      process.cwd(),
      "public",
      "assets",
      "data",
      "users.json",
    );
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
