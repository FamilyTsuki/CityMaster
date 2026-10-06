import fs from 'fs';

let content = fs.readFileSync('src/backend/controllers/CityController.js', 'utf8');

content = content.replace(
  /const citiesData = await fs\.promises\.readFile\(\s*path\.join\(process\.cwd\(\), "config", "cities\.json"\),\s*"utf-8",\s*\);\s*const cities = JSON\.parse\(citiesData\);/m,
  "const cities = await City.getAll();"
);

fs.writeFileSync('src/backend/controllers/CityController.js', content, 'utf8');
