const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, 'public/assets/styles');
const excludedFiles = ['variables.css'];

const replacements = [
  // Danger rgba
  { regex: /rgba\(\s*239\s*,\s*68\s*,\s*68\s*,\s*[0-9.]+\s*\)/gi, replacement: 'var(--danger-light)' },
  
  // Success rgba
  { regex: /rgba\(\s*16\s*,\s*185\s*,\s*129\s*,\s*[0-9.]+\s*\)/gi, replacement: 'var(--success-light)' },
  { regex: /rgba\(\s*34\s*,\s*197\s*,\s*94\s*,\s*[0-9.]+\s*\)/gi, replacement: 'var(--success-light)' },

  // Warning rgba
  { regex: /rgba\(\s*245\s*,\s*158\s*,\s*11\s*,\s*[0-9.]+\s*\)/gi, replacement: 'var(--warning-light)' },
  
  // Accent/Blue rgba
  { regex: /rgba\(\s*99\s*,\s*102\s*,\s*241\s*,\s*[0-9.]+\s*\)/gi, replacement: 'var(--accent-light)' },
  { regex: /rgba\(\s*59\s*,\s*130\s*,\s*246\s*,\s*[0-9.]+\s*\)/gi, replacement: 'var(--accent-light)' },
  { regex: /rgba\(\s*6\s*,\s*182\s*,\s*212\s*,\s*[0-9.]+\s*\)/gi, replacement: 'var(--accent-light)' },

  // Remove fallback from var() for rgba
  { regex: /var\((--[a-zA-Z0-9-]+),\s*rgba\([^)]+\)\)/g, replacement: 'var($1)' },
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.css') && !excludedFiles.includes(file)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDir(cssDir);
