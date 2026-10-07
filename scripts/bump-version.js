import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const rootDir = path.join(dirname, '..');

async function bumpVersion() {
  const bumpType = process.argv[2] || 'patch'; // 'patch', 'minor', 'major'
  const summary = process.argv[3] || '';

  const pkgPath = path.join(rootDir, 'package.json');
  const pkgContent = await fs.readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(pkgContent);

  const oldVersion = pkg.version;
  const parts = oldVersion.split('.').map(n => parseInt(n, 10));

  if (bumpType === 'major') {
    parts[0] += 1;
    parts[1] = 0;
    parts[2] = 0;
  } else if (bumpType === 'minor') {
    parts[1] += 1;
    parts[2] = 0;
  } else {
    parts[2] += 1;
  }

  const newVersion = parts.join('.');
  console.log(`Bumping version: ${oldVersion} -> ${newVersion} (${bumpType})`);

  // 1. Update package.json
  pkg.version = newVersion;
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  // 2. Update public/sw.js (increment CACHE_NAME)
  const swPath = path.join(rootDir, 'public', 'sw.js');
  let swContent = await fs.readFile(swPath, 'utf8');
  swContent = swContent.replace(/CACHE_NAME\s*=\s*['"]citymaster-v(\d+)['"]/, (match, num) => {
    const nextNum = parseInt(num, 10) + 1;
    return `CACHE_NAME = 'citymaster-v${nextNum}'`;
  });
  await fs.writeFile(swPath, swContent, 'utf8');

  // 3. Update public/index.html (?v=...)
  const htmlPath = path.join(rootDir, 'public', 'index.html');
  let htmlContent = await fs.readFile(htmlPath, 'utf8');
  htmlContent = htmlContent.replaceAll(`?v=${oldVersion}`, `?v=${newVersion}`);
  await fs.writeFile(htmlPath, htmlContent, 'utf8');

  // 4. Update README.md
  const readmePath = path.join(rootDir, 'README.md');
  let readmeContent = await fs.readFile(readmePath, 'utf8');
  readmeContent = readmeContent.replaceAll(`version-${oldVersion}-emerald`, `version-${newVersion}-emerald`);
  readmeContent = readmeContent.replaceAll(`through v${oldVersion}`, `through v${newVersion}`);
  await fs.writeFile(readmePath, readmeContent, 'utf8');

  // 5. Update CHANGELOG.md if summary provided or section missing
  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  let changelogContent = await fs.readFile(changelogPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];

  if (!changelogContent.includes(`## [${newVersion}]`)) {
    const headerPrefix = 'Ce fichier est crée et acctualiser par ia.\n\n';
    const entry = `## [${newVersion}] - ${today}\n\n### ${summary || 'Mise à jour et améliorations'}\n- Synchronisation automatique de version et ajustements du projet.\n\n---\n\n`;

    if (changelogContent.includes(headerPrefix)) {
      changelogContent = changelogContent.replace(headerPrefix, headerPrefix + entry);
    } else {
      changelogContent = changelogContent.replace('# Changelog - CityMaster\n\n', `# Changelog - CityMaster\n\n${entry}`);
    }
    await fs.writeFile(changelogPath, changelogContent, 'utf8');
  }

  console.log(`✅ Version successfully updated to ${newVersion} in all configuration and documentation files.`);
}

bumpVersion().catch(err => {
  console.error('Error bumping version:', err);
  process.exit(1);
});
