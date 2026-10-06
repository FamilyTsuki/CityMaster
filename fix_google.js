const fs = require('fs');
let file = fs.readFileSync('src/views/AuthView.js', 'utf8');
file = file.replace(/theme: "outline",\n\s*size: "medium"/, 'theme: document.documentElement.getAttribute("data-theme") === "dark" ? "filled_black" : "outline",\n            size: "medium"');
fs.writeFileSync('src/views/AuthView.js', file);
