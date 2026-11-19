import 'dotenv/config';
import { initDB, isDatabasePending } from './src/backend/config/database.js';
import { createApp } from './src/backend/app.js';
import { User } from './src/backend/models/User.js';
import { StaffService } from './src/backend/services/StaffService.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is missing.');
  process.exit(1);
}

const port = process.env.PORT || 3000;

// Les comptes que l'ancien code avait enregistrés dans users.json pendant une
// panne de la base sont repris dans PostgreSQL dès qu'il est joignable. Les
// candidatures acceptées avant les rôles (2.23.x) deviennent des communes de zone.
const usingDatabase = await initDB({
  onReady: async () => {
    await User.importFileUsersIntoDatabase();
    await StaffService.importApprovedApplications();
  },
});
if (!usingDatabase && !isDatabasePending()) {
  try {
    await StaffService.importApprovedApplications();
  } catch (error) {
    console.error('[staff] Import des candidatures acceptées impossible :', error);
  }
}
createApp().listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
