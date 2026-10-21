import path from 'path';
import { initDB, closeDB } from '../src/backend/config/database.js';
import { ROOT_DIR, USERS_FILE } from '../src/backend/config/paths.js';
import { User } from '../src/backend/models/User.js';

/**
 * Donne les droits administrateur à un compte existant.
 * Usage : npm run make-admin -- <pseudo> [--revoke]
 * Fonctionne avec PostgreSQL ou, sans base, avec config/users.json.
 */
const username = process.argv[2];
const revoke = process.argv.includes('--revoke');

if (!username || username.startsWith('--')) {
  console.error("Erreur : veuillez indiquer un nom d'utilisateur.");
  console.log('Usage : npm run make-admin -- <pseudo> [--revoke]');
  process.exit(1);
}

try {
  const usingDatabase = await initDB();
  const user = await User.setAdminStatus(username, !revoke);
  const storage = usingDatabase ? 'la base de données' : path.relative(ROOT_DIR, USERS_FILE);

  if (!user) {
    console.log(`❌ L'utilisateur "${username}" n'existe pas dans ${storage}.`);
    process.exitCode = 1;
  } else if (revoke) {
    console.log(`✅ "${user.username}" n'est plus administrateur (${storage}).`);
  } else {
    console.log(`✅ "${user.username}" est maintenant administrateur (${storage}).`);
  }
} catch (error) {
  console.error('Erreur lors de la mise à jour :', error);
  process.exitCode = 1;
} finally {
  await closeDB();
}
