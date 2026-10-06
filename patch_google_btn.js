import fs from 'fs';

let content = fs.readFileSync('public/assets/styles/auth.css', 'utf8');

content = content.replace(
  /\.google-auth-container \{\s*display: flex;\s*justify-content: center;\s*margin-bottom: 0\.25rem;\s*width: 100%;\s*\}/m,
  ".google-auth-container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  margin-bottom: 0.25rem;\n  width: 100%;\n}"
);

content += `\n#google-login-btn {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}\n`;

fs.writeFileSync('public/assets/styles/auth.css', content, 'utf8');
