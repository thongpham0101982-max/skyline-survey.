const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

c = c.replace(
  /<th className="px-5 py-3 text-left">Lo?i<\/th><th className="px-5 py-3 text-left">Tr?ng thái<\/th>/,
  '<th className="px-5 py-3 text-left">Lo?i</th><th className="px-5 py-3 text-center">C?u h?nh c?t</th><th className="px-5 py-3 text-left">Tr?ng thái</th>'
);

c = c.replace(
  /<td className="px-5 py-3">\{s\.subjectType\?<span className="text-xs px-2 py-0\.5 rounded-full bg-blue-100 text-blue-700 font-medium">\{s\.subjectType\}<\/span>:'-'\}<\/td><td className="px-5 py-3">/,
  '<td className="px-5 py-3">{s.subjectType?<span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">{s.subjectType}</span>:\'-\'}</td><td className="px-5 py-3 text-center"><span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">{s.scoreColumns ?? 1} ði?m / {s.commentColumns ?? 1} NX</span></td><td className="px-5 py-3">'
);

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c);
console.log('client.tsx updated for table columns');
