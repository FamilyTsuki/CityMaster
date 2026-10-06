const fs = require('fs');
const path = require('path');
const varsPath = path.join(__dirname, 'public/assets/styles/variables.css');
let content = fs.readFileSync(varsPath, 'utf8');

// light mode
content = content.replace(/--danger: #dc2626;/g, '--danger: #dc2626;\n  --danger-light: rgba(220, 38, 38, 0.15);');
content = content.replace(/--success: #15803d;/g, '--success: #15803d;\n  --success-light: rgba(21, 128, 61, 0.15);');
content = content.replace(/--warning: #b45309;/g, '--warning: #b45309;\n  --warning-light: rgba(180, 83, 9, 0.15);');
content = content.replace(/--accent: #0284c7;/g, '--accent: #0284c7;\n  --accent-light: rgba(2, 132, 199, 0.15);');

// dark mode
content = content.replace(/--danger: #f87171;/g, '--danger: #f87171;\n  --danger-light: rgba(248, 113, 113, 0.15);');
content = content.replace(/--success: #4ade80;/g, '--success: #4ade80;\n  --success-light: rgba(74, 222, 128, 0.15);');
content = content.replace(/--warning: #fbbf24;/g, '--warning: #fbbf24;\n  --warning-light: rgba(251, 191, 36, 0.15);');
content = content.replace(/--accent: #38bdf8;/g, '--accent: #38bdf8;\n  --accent-light: rgba(56, 189, 248, 0.15);');

fs.writeFileSync(varsPath, content, 'utf8');
