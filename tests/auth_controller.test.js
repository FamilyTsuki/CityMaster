import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { AuthController } from "../src/backend/controllers/AuthController.js";
import { User } from "../src/backend/models/User.js";
import { createMockRes } from "./helpers.js";

test("AuthController.register: valider le format des pseudos (3-30 caractères, alphanumériques, hyphens, underscores)", async () => {
  
  const resTooShort = createMockRes();
  await AuthController.register({ body: { username: "ab", password: "password123" } }, resTooShort);
  assert.equal(resTooShort.statusCode, 400);
  assert.match(resTooShort.body.error, /between 3 and 30 characters/i);

  const resTooLong = createMockRes();
  await AuthController.register({ body: { username: "a".repeat(31), password: "password123" } }, resTooLong);
  assert.equal(resTooLong.statusCode, 400);
  assert.match(resTooLong.body.error, /between 3 and 30 characters/i);

  const invalidUsernames = ["user name", "user@mail", "user!test", "pseudo#1", "test$"];
  for (const invalid of invalidUsernames) {
    const res = createMockRes();
    await AuthController.register({ body: { username: invalid, password: "password123" } }, res);
    assert.equal(res.statusCode, 400, `Expected 400 for username '${invalid}'`);
    assert.match(res.body.error, /alphanumeric/i);
  }

  const resMissing = createMockRes();
  await AuthController.register({ body: { username: "", password: "password123" } }, resMissing);
  assert.equal(resMissing.statusCode, 400);

  const resNull = createMockRes();
  await AuthController.register({ body: { password: "password123" } }, resNull);
  assert.equal(resNull.statusCode, 400);
});

test("AuthController.register: valider la politique de mot de passe (min 6 caractères, max 72)", async () => {
  
  const resShortPass = createMockRes();
  await AuthController.register({ body: { username: "validUser1", password: "123" } }, resShortPass);
  assert.equal(resShortPass.statusCode, 400);
  assert.match(resShortPass.body.error, /Password must be between 6 and 72/i);

  const res5Pass = createMockRes();
  await AuthController.register({ body: { username: "validUser2", password: "abcde" } }, res5Pass);
  assert.equal(res5Pass.statusCode, 400);

  const resLongPass = createMockRes();
  await AuthController.register({ body: { username: "validUser3", password: "a".repeat(73) } }, resLongPass);
  assert.equal(resLongPass.statusCode, 400);

  const resMissingPass = createMockRes();
  await AuthController.register({ body: { username: "validUser4" } }, resMissingPass);
  assert.equal(resMissingPass.statusCode, 400);
});

test("AuthController: hachage bcrypt sécurisé et génération de token JWT valide", async () => {
  const uniqueUsername = `auth_test_${Date.now()}`;
  const rawPassword = "SuperSecurePassword123!";

  const resReg = createMockRes();
  await AuthController.register({ body: { username: uniqueUsername, password: rawPassword } }, resReg);
  assert.equal(resReg.statusCode, 201);
  assert.equal(resReg.body.message, "User registered successfully");
  assert.ok(resReg.body.id);

  const userInDb = await User.findByUsername(uniqueUsername);
  assert.ok(userInDb);
  assert.notEqual(userInDb.password, rawPassword, "Le mot de passe ne doit jamais être stocké en clair");
  assert.match(userInDb.password, /^\$2[aby]\$/, "Le mot de passe doit être un hash bcrypt valide");
  const isMatch = await bcrypt.compare(rawPassword, userInDb.password);
  assert.equal(isMatch, true, "bcrypt.compare doit valider le mot de passe avec le hash stocké");

  const resBadLogin = createMockRes();
  await AuthController.login({ body: { username: uniqueUsername, password: "wrongPassword" } }, resBadLogin);
  assert.equal(resBadLogin.statusCode, 401);
  assert.equal(resBadLogin.body.error, "Invalid username or password");

  const resLogin = createMockRes();
  await AuthController.login({ body: { username: uniqueUsername, password: rawPassword } }, resLogin);
  assert.equal(resLogin.statusCode, 200);
  assert.ok(resLogin.body.token, "Un token JWT doit être renvoyé");
  assert.equal(resLogin.body.username, uniqueUsername);

  const decoded = jwt.verify(resLogin.body.token, process.env.JWT_SECRET);
  assert.ok(decoded);
  assert.equal(decoded.username, uniqueUsername);
  assert.equal(decoded.id, userInDb.id);
  assert.equal(decoded.is_admin, userInDb.is_admin);
});

test("AuthController.login: un compte Google (sans mot de passe) renvoie 401, pas 500", async () => {
  await User.createGoogleUser("google_only_user", "google-sub-123", null);

  const res = createMockRes();
  await AuthController.login(
    { body: { username: "google_only_user", password: "anything123" } },
    res,
  );
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Invalid username or password");
});

test("AuthController.guestLogin: refuse les pseudos réservés aux comptes et aux administrateurs", async () => {
  await User.create("registered_player", "hash");
  const taken = createMockRes();
  await AuthController.guestLogin({ body: { username: "Registered_Player" } }, taken);
  assert.equal(taken.statusCode, 409);

  process.env.ADMIN_USERS = "env_boss";
  try {
    const reserved = createMockRes();
    await AuthController.guestLogin({ body: { username: "env_boss" } }, reserved);
    assert.equal(reserved.statusCode, 409);
  } finally {
    process.env.ADMIN_USERS = "";
  }

  const ok = createMockRes();
  await AuthController.guestLogin({ body: { username: "free_guest" } }, ok);
  assert.equal(ok.statusCode, 200);
  const decoded = jwt.verify(ok.body.token, process.env.JWT_SECRET);
  assert.equal(decoded.is_guest, true);
  assert.equal(decoded.id, null);
});

