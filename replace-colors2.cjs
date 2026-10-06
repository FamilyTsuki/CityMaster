const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, 'public/assets/styles');
const excludedFiles = ['variables.css'];

const replacements = [
  // landing.css specific light/dark greys
  { regex: /#(?:fbf7f0)\b/gi, replacement: 'var(--bg-main)' },
  { regex: /#(?:f5f5f4|d6d3d1)\b/gi, replacement: 'var(--text-muted)' },
  { regex: /#(?:1e293b)\b/gi, replacement: 'var(--bg-card-solid)' },

  // purple fallback
  { regex: /var\(--purple,\s*#8b5cf6\)/gi, replacement: 'var(--purple)' },
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

console.log("Replaced remaining colors successfully.");
