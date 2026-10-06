import fs from 'fs';

let content = fs.readFileSync('src/backend/controllers/RoomController.js', 'utf8');

// Add import if not present
if (!content.includes("import { City } from '../models/City.js';")) {
  content = content.replace(
    "import pool from '../config/database.js';",
    "import pool from '../config/database.js';\nimport { City } from '../models/City.js';"
  );
}

// Replace direct readFile with City.getAll()
content = content.replace(
  /const configCitiesPath = path\.join\(dirname, '\.\.', '\.\.', '\.\.', 'config', 'cities\.json'\);\s*const configContent = await fs\.readFile\(configCitiesPath, 'utf8'\);\s*const configCities = JSON\.parse\(configContent\);/,
  "const configCities = await City.getAll();"
);

fs.writeFileSync('src/backend/controllers/RoomController.js', content, 'utf8');
