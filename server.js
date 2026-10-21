import 'dotenv/config';
import { initDB } from './src/backend/config/database.js';
import { createApp } from './src/backend/app.js';
import { User } from './src/backend/models/User.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is missing.');
  process.exit(1);
}

const port = process.env.PORT || 3000;

// Les comptes que l'ancien code avait enregistrés dans users.json pendant une
// panne de la base sont repris dans PostgreSQL dès qu'il est joignable.
await initDB({ onReady: () => User.importFileUsersIntoDatabase() });
createApp().listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
