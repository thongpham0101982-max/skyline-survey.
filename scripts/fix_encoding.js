const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

c = c.replace(
  /<td className="px-5 py-3 text-center"><span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">\{s\.scoreColumns \?\? 1\}.*?<\/span><\/td>/,
  '<td className="px-5 py-3 text-center"><span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{s.scoreColumns ?? 1} điểm / {s.commentColumns ?? 1} NX</span></td>'
);

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
console.log('Fixed literally');
