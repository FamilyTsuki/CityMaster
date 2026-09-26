import test from 'node:test';
import assert from 'node:assert/strict';
import { User, isUserAdmin, getEnvAdmins } from '../src/backend/models/User.js';
import { User, isUserAdmin } from '../src/backend/models/User.js';

test('isUserAdmin detects admin flag or env whitelist', () => {
test('isUserAdmin strictly checks is_admin property', () => {
  assert.equal(isUserAdmin(null), false);
  assert.equal(isUserAdmin({}), false);
  assert.equal(isUserAdmin({ username: 'random_user', is_admin: false }), false);

  assert.equal(isUserAdmin({ username: 'random_user', is_admin: true }), true);
  assert.equal(isUserAdmin({ username: 'random_user', is_admin: 'true' }), true);

  // tsuki and admin are in process.env.ADMIN_USERS
  assert.equal(isUserAdmin({ username: 'tsuki', is_admin: false }), true);
  assert.equal(isUserAdmin({ username: 'TSUKI', is_admin: false }), true);
  assert.equal(isUserAdmin({ username: 'admin', is_admin: false }), true);
  assert.equal(isUserAdmin({ username: 'other', is_admin: false }), false);
});

test('User.setAdminStatus persists admin and findByUsername retrieves it', async () => {
  const testUser = 'admin_test_' + Date.now();

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
    const fs = await import('fs/promises');
    const path = await import('path');
    const usersPath = path.join(process.cwd(), 'public', 'assets', 'data', 'users.json');
    const content = JSON.parse(await fs.readFile(usersPath, 'utf8'));
    const filtered = content.filter(u => !u.username.startsWith('admin_test_'));
    await fs.writeFile(usersPath, JSON.stringify(filtered, null, 2), 'utf8');
  } catch (e) {}
});
