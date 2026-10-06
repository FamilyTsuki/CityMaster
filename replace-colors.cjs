const fs = require('fs');
const path = require('path');

const cssDir = path.join(__dirname, 'public/assets/styles');
const excludedFiles = ['variables.css'];

const replacements = [
  // White/Black
  { regex: /#(?:ffffff|fff)\b/gi, replacement: 'var(--white)' },
  { regex: /#(?:000000|000)\b/gi, replacement: 'var(--black)' },

  // Danger / Red
  { regex: /#(?:ef4444|f43f5e|dc2626|b91c1c|991b1b|fca5a5)\b/gi, replacement: 'var(--danger)' },

  // Success / Green
  { regex: /#(?:10b981|059669|166534|86efac)\b/gi, replacement: 'var(--success)' },

  // Warning / Orange / Yellow
  { regex: /#(?:f59e0b|facc15|fdba74|d97706|854d0e|fef08a)\b/gi, replacement: 'var(--warning)' },

  // Accent / Blue / Indigo
  { regex: /#(?:6366f1|06b6d4|3b82f6|1e40af|93c5fd|a5b4fc|818cf8)\b/gi, replacement: 'var(--accent)' },
  { regex: /#(?:8b5cf6)\b/gi, replacement: 'var(--purple, #8b5cf6)' }, // if purple doesn't exist

  // Greys (used in setup.css for slate)
  { regex: /#(?:f1f5f9)\b/gi, replacement: 'var(--bg-card-solid)' },
  { regex: /#(?:334155)\b/gi, replacement: 'var(--text-main)' },
  { regex: /#(?:cbd5e1)\b/gi, replacement: 'var(--border-color)' },

  // Dark colors (ink)
  { regex: /#(?:292524|26190f)\b/gi, replacement: 'var(--text-main)' },
  { regex: /#(?:57534e|594230)\b/gi, replacement: 'var(--text-secondary)' },

  // Oranges (from landing and buttons)
  { regex: /#(?:9a3412|7c2d12)\b/gi, replacement: 'var(--primary-hover)' },
  { regex: /#(?:ea580c|c2410c)\b/gi, replacement: 'var(--primary)' },
  { regex: /#(?:ffedd5)\b/gi, replacement: 'var(--secondary)' },
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.css') && !excludedFiles.includes(file)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // We will also remove fallback values in var() that contain hex colors
      // like var(--primary, #ea580c) -> var(--primary)
      content = content.replace(/var\((--[a-zA-Z0-9-]+),\s*#[0-9a-fA-F]{3,8}\)/g, 'var($1)');

      for (const { regex, replacement } of replacements) {
        content = content.replace(regex, replacement);
      }
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

processDir(cssDir);

// Now update variables.css to add --white, --black, and --purple
const varsPath = path.join(cssDir, 'variables.css');
let varsContent = fs.readFileSync(varsPath, 'utf8');

if (!varsContent.includes('--white:')) {
  varsContent = varsContent.replace(/--primary:/g, '--white: #ffffff;\n  --black: #000000;\n  --purple: #8b5cf6;\n  --primary:');
  fs.writeFileSync(varsPath, varsContent, 'utf8');
}

console.log("Replaced colors successfully.");
