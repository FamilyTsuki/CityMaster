import fs from 'fs';

const file = 'src/backend/models/Score.js';
let content = fs.readFileSync(file, 'utf8');

// Replace getTopScores query
content = content.replace(
  "let query = 'SELECT id, player as username, score, difficulty, date as created_at FROM scores WHERE difficulty = $2 AND test_id IS NULL ORDER BY score DESC LIMIT $1';",
  "let query = 'SELECT player as username, MAX(score) as score, MAX(date) as created_at FROM scores WHERE difficulty = $2 AND test_id IS NULL GROUP BY player ORDER BY score DESC LIMIT $1';"
);

content = content.replace(
  "query = 'SELECT id, player as username, score, difficulty, date as created_at FROM scores WHERE date >= date_trunc(\\'month\\', CURRENT_DATE) AND difficulty = $2 AND test_id IS NULL ORDER BY score DESC LIMIT $1';",
  "query = 'SELECT player as username, MAX(score) as score, MAX(date) as created_at FROM scores WHERE date >= date_trunc(\\'month\\', CURRENT_DATE) AND difficulty = $2 AND test_id IS NULL GROUP BY player ORDER BY score DESC LIMIT $1';"
);

// Fix fallback logic for monthly
content = content.replace(
  /return \[\.\.\.memoryScores\]\s*\.filter\(s => \{\s*const scoreDate = new Date\(s\.date\);\s*return scoreDate\.getMonth\(\) === currentMonth && scoreDate\.getFullYear\(\) === currentYear && \(s\.difficulty === difficulty \|\| \(\!s\.difficulty && difficulty === 'hard'\)\) && s\.test_id == null;\s*\}\)\s*\.sort\(\(a, b\) => b\.score - a\.score\)\s*\.slice\(0, limit\);/m,
  `const filtered = [...memoryScores].filter(s => {
            const scoreDate = new Date(s.date);
            return scoreDate.getMonth() === currentMonth && scoreDate.getFullYear() === currentYear && (s.difficulty === difficulty || (!s.difficulty && difficulty === 'hard')) && s.test_id == null;
          });
          const grouped = {};
          for (const s of filtered) {
            if (!grouped[s.player] || grouped[s.player].score < s.score) {
              grouped[s.player] = s;
            }
          }
          return Object.values(grouped).sort((a, b) => b.score - a.score).slice(0, limit);`
);

// Fix fallback logic for all time
content = content.replace(
  /return \[\.\.\.memoryScores\]\s*\.filter\(s => \(s\.difficulty === difficulty \|\| \(\!s\.difficulty && difficulty === 'hard'\)\) && s\.test_id == null\)\s*\.sort\(\(a, b\) => b\.score - a\.score\)\s*\.slice\(0, limit\);/m,
  `const filteredAll = [...memoryScores].filter(s => (s.difficulty === difficulty || (!s.difficulty && difficulty === 'hard')) && s.test_id == null);
      const groupedAll = {};
      for (const s of filteredAll) {
        if (!groupedAll[s.player] || groupedAll[s.player].score < s.score) {
          groupedAll[s.player] = s;
        }
      }
      return Object.values(groupedAll).sort((a, b) => b.score - a.score).slice(0, limit);`
);

fs.writeFileSync(file, content, 'utf8');
