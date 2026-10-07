import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import fs from "fs/promises";
import path from "path";
import { AuthController } from "../src/backend/controllers/AuthController.js";
import { User } from "../src/backend/models/User.js";

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

const createdUsernames = [];

async function cleanupTestUsers() {
  try {
    const usersPath = path.join(process.cwd(), "config", "users.json");
    const content = JSON.parse(await fs.readFile(usersPath, "utf8"));
    const filtered = content.filter((u) => !createdUsernames.includes(u.username.toLowerCase()));
    await fs.writeFile(usersPath, JSON.stringify(filtered, null, 2), "utf8");
  } catch (e) {}
}

test("AuthController.register: valider le format des pseudos (3-30 caractères, alphanumériques, hyphens, underscores)", async () => {
  // Trop court (< 3 caractères)
  const resTooShort = createMockRes();
  await AuthController.register({ body: { username: "ab", password: "password123" } }, resTooShort);
  assert.equal(resTooShort.statusCode, 400);
  assert.match(resTooShort.body.error, /between 3 and 30 characters/i);

  // Trop long (> 30 caractères)
  const resTooLong = createMockRes();
  await AuthController.register({ body: { username: "a".repeat(31), password: "password123" } }, resTooLong);
  assert.equal(resTooLong.statusCode, 400);
  assert.match(resTooLong.body.error, /between 3 and 30 characters/i);

  // Caractères invalides (espaces, symboles, @, !)
  const invalidUsernames = ["user name", "user@mail", "user!test", "pseudo#1", "test$"];
  for (const invalid of invalidUsernames) {
    const res = createMockRes();
    await AuthController.register({ body: { username: invalid, password: "password123" } }, res);
    assert.equal(res.statusCode, 400, `Expected 400 for username '${invalid}'`);
    assert.match(res.body.error, /alphanumeric/i);
  }

  // Pseudo vide ou non renseigné
  const resMissing = createMockRes();
  await AuthController.register({ body: { username: "", password: "password123" } }, resMissing);
  assert.equal(resMissing.statusCode, 400);

  const resNull = createMockRes();
  await AuthController.register({ body: { password: "password123" } }, resNull);
  assert.equal(resNull.statusCode, 400);
});

test("AuthController.register: valider la politique de mot de passe (min 6 caractères, max 72)", async () => {
  // Trop court (< 6 caractères)
  const resShortPass = createMockRes();
  await AuthController.register({ body: { username: "validUser1", password: "123" } }, resShortPass);
  assert.equal(resShortPass.statusCode, 400);
  assert.match(resShortPass.body.error, /Password must be between 6 and 72/i);

  // 5 caractères
  const res5Pass = createMockRes();
  await AuthController.register({ body: { username: "validUser2", password: "abcde" } }, res5Pass);
  assert.equal(res5Pass.statusCode, 400);

  // Trop long (> 72 caractères)
  const resLongPass = createMockRes();
  await AuthController.register({ body: { username: "validUser3", password: "a".repeat(73) } }, resLongPass);
  assert.equal(resLongPass.statusCode, 400);

  // Mot de passe manquant
  const resMissingPass = createMockRes();
  await AuthController.register({ body: { username: "validUser4" } }, resMissingPass);
  assert.equal(resMissingPass.statusCode, 400);
});

test("AuthController: hachage bcrypt sécurisé et génération de token JWT valide", async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_key_12345";
  const uniqueUsername = `auth_test_${Date.now()}`;
  createdUsernames.push(uniqueUsername.toLowerCase());
  const rawPassword = "SuperSecurePassword123!";

  // 1. Inscription réussie
  const resReg = createMockRes();
  await AuthController.register({ body: { username: uniqueUsername, password: rawPassword } }, resReg);
  assert.equal(resReg.statusCode, 201);
  assert.equal(resReg.body.message, "User registered successfully");
  assert.ok(resReg.body.id);

  // 2. Vérification que le mot de passe est bien haché par bcrypt dans le modèle
  const userInDb = await User.findByUsername(uniqueUsername);
  assert.ok(userInDb);
  assert.notEqual(userInDb.password, rawPassword, "Le mot de passe ne doit jamais être stocké en clair");
  assert.match(userInDb.password, /^\$2[aby]\$/, "Le mot de passe doit être un hash bcrypt valide");
  const isMatch = await bcrypt.compare(rawPassword, userInDb.password);
  assert.equal(isMatch, true, "bcrypt.compare doit valider le mot de passe avec le hash stocké");

  // 3. Connexion échoue avec un mauvais mot de passe
  const resBadLogin = createMockRes();
  await AuthController.login({ body: { username: uniqueUsername, password: "wrongPassword" } }, resBadLogin);
  assert.equal(resBadLogin.statusCode, 401);
  assert.equal(resBadLogin.body.error, "Invalid username or password");

  // 4. Connexion réussie avec bon mot de passe -> génère token JWT
  const resLogin = createMockRes();
  await AuthController.login({ body: { username: uniqueUsername, password: rawPassword } }, resLogin);
  assert.equal(resLogin.statusCode, 200);
  assert.ok(resLogin.body.token, "Un token JWT doit être renvoyé");
  assert.equal(resLogin.body.username, uniqueUsername);

  // 5. Vérification du token JWT
  const decoded = jwt.verify(resLogin.body.token, process.env.JWT_SECRET);
  assert.ok(decoded);
  assert.equal(decoded.username, uniqueUsername);
  assert.equal(decoded.id, userInDb.id);
  assert.equal(decoded.is_admin, userInDb.is_admin);

  await cleanupTestUsers();
});

