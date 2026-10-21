import 'dotenv/config';
import { initDB } from './src/backend/config/database.js';
import { createApp } from './src/backend/app.js';

if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is missing.');
  process.exit(1);
}

const port = process.env.PORT || 3000;

await initDB();
createApp().listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
