import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const rootDir = path.join(dirname, '..');

async function bumpVersion() {
  const bumpType = process.argv[2] || 'patch';
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

  pkg.version = newVersion;
  await fs.writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');

  const swPath = path.join(rootDir, 'public', 'sw.js');
  let swContent = await fs.readFile(swPath, 'utf8');
  swContent = swContent.replace(/CACHE_NAME\s*=\s*['"]citymaster-v(\d+)['"]/, (match, num) => {
    const nextNum = parseInt(num, 10) + 1;
    return `CACHE_NAME = 'citymaster-v${nextNum}'`;
  });
  await fs.writeFile(swPath, swContent, 'utf8');

  const htmlPath = path.join(rootDir, 'public', 'index.html');
  let htmlContent = await fs.readFile(htmlPath, 'utf8');
  htmlContent = htmlContent.replaceAll(`?v=${oldVersion}`, `?v=${newVersion}`);
  await fs.writeFile(htmlPath, htmlContent, 'utf8');

  const readmePath = path.join(rootDir, 'README.md');
  let readmeContent = await fs.readFile(readmePath, 'utf8');
  readmeContent = readmeContent.replaceAll(`version-${oldVersion}-emerald`, `version-${newVersion}-emerald`);
  readmeContent = readmeContent.replaceAll(`through v${oldVersion}`, `through v${newVersion}`);
  await fs.writeFile(readmePath, readmeContent, 'utf8');

  const changelogPath = path.join(rootDir, 'CHANGELOG.md');
  let changelogContent = await fs.readFile(changelogPath, 'utf8');
  const today = new Date().toISOString().split('T')[0];

  if (!changelogContent.includes(`## [${newVersion}]`)) {
    const entry = `## [${newVersion}] - ${today}\n\n### ${summary || 'Amélioré'}\n- Mise à jour et optimisations des composants.\n\n---\n\n`;

    const match = changelogContent.search(/\n## \[/);
    if (match !== -1) {
      changelogContent = changelogContent.slice(0, match + 1) + entry + changelogContent.slice(match + 1);
    } else {
      changelogContent += '\n\n' + entry;
    }
    await fs.writeFile(changelogPath, changelogContent, 'utf8');
  }

  await fs.copyFile(changelogPath, path.join(rootDir, 'public', 'CHANGELOG.md'));

  console.log(`✅ Version successfully updated to ${newVersion} in all configuration and documentation files.`);
}

bumpVersion().catch(err => {
  console.error('Error bumping version:', err);
  process.exit(1);
});

