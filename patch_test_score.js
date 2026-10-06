import fs from 'fs';

const file = 'src/backend/models/Score.js';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const query = 'SELECT id, player as username, score, difficulty, test_id, date as created_at FROM scores WHERE test_id = $1 ORDER BY score DESC LIMIT $2';",
  "const query = 'SELECT player as username, MAX(score) as score, MAX(date) as created_at FROM scores WHERE test_id = $1 GROUP BY player ORDER BY score DESC LIMIT $2';"
);

// Fallback logic
content = content.replace(
  /return \[\.\.\.memoryScores\]\s*\.filter\(s => s\.test_id === testNumber\)\s*\.sort\(\(a, b\) => b\.score - a\.score\)\s*\.slice\(0, limit\);/m,
  `const filteredTest = [...memoryScores].filter(s => s.test_id === testNumber);
      const groupedTest = {};
      for (const s of filteredTest) {
        if (!groupedTest[s.player] || groupedTest[s.player].score < s.score) {
          groupedTest[s.player] = s;
        }
      }
      return Object.values(groupedTest).sort((a, b) => b.score - a.score).slice(0, limit);`
);

fs.writeFileSync(file, content, 'utf8');
