import fs from 'fs';

let css = fs.readFileSync('public/assets/styles/auth.css', 'utf8');
css = css.replace(/<<<<<<< HEAD\n\.google-auth-container \{\n  display: flex;\n  justify-content: center;\n  margin-bottom: 0\.25rem;\n  width: 100%;\n=======\n\.google-auth-container \{\n  display: flex;\n  justify-content: center;\n  align-items: center;\n  margin-bottom: 0\.25rem;\n  width: 100%;\n>>>>>>> [^\n]+\n/m, 
`.google-auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 0.25rem;
  width: 100%;
`);
fs.writeFileSync('public/assets/styles/auth.css', css, 'utf8');

let js = fs.readFileSync('src/views/AuthView.js', 'utf8');
js = js.replace(/<<<<<<< HEAD\n            size: "large"\n=======\n            size: "medium"\n>>>>>>> [^\n]+\n/m, '            size: "medium"\n');
fs.writeFileSync('src/views/AuthView.js', js, 'utf8');
