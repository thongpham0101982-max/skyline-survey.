const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

c = c.replace(
  /\{s\.scoreColumns \?\? 1\} điểm \/ \{s\.commentColumns \?\? 1\} NX/,
  '{s.scoreColumns ?? 1} cột điểm / {s.commentColumns ?? 1} cột NX'
);

// Do it globally just in case
c = c.replace(
  /\{s\.scoreColumns \?\? 1\} điểm \/ \{s\.commentColumns \?\? 1\} NX/g,
  '{s.scoreColumns ?? 1} cột điểm / {s.commentColumns ?? 1} cột NX'
);

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
console.log('UI text updated successfully');
