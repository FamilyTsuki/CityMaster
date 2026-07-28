import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

dotenv.config({ path: path.join(dirname, '..', '.env') });

const { Pool } = pg;
const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE,
});

const username = process.argv[2];

if (!username) {
  console.error('Erreur: Veuillez specifier un nom d\'utilisateur.');
  console.log('Usage: npm run make-admin <username>');
  process.exit(1);
}

async function makeAdmin() {
  try {
    const result = await pool.query(
      'UPDATE users SET is_admin = true WHERE username = $1 RETURNING id, username, is_admin',
      [username]
    );

    if (result.rowCount === 0) {
      console.log(`❌ L'utilisateur "${username}" n'existe pas dans la base de donnees.`);
    } else {
      console.log(`✅ L'utilisateur "${username}" est maintenant Administrateur !`);
    }
  } catch (error) {
    console.error('Erreur lors de la mise a jour :', error);
  } finally {
    await pool.end();
  }
}

makeAdmin();
