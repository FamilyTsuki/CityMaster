import fs from 'fs';

let css = fs.readFileSync('public/assets/styles/auth.css', 'utf8');
css = css.replace(/<<<<<<< HEAD[\s\S]*?=======\r?\n/g, '');
css = css.replace(/>>>>>>> .*\r?\n/g, '');
fs.writeFileSync('public/assets/styles/auth.css', css, 'utf8');

let js = fs.readFileSync('src/views/AuthView.js', 'utf8');
js = js.replace(/<<<<<<< HEAD[\s\S]*?=======\r?\n/g, '');
js = js.replace(/>>>>>>> .*\r?\n/g, '');
fs.writeFileSync('src/views/AuthView.js', js, 'utf8');
