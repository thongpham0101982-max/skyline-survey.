const fs = require('fs');
let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

c = c.replace(
  /<th className="px-5 py-3 text-left">Loại<\/th><th className="px-5 py-3 text-left">Trạng thái<\/th>/,
  '<th className="px-5 py-3 text-left">Loại</th><th className="px-5 py-3 text-center">Cấu hình cột</th><th className="px-5 py-3 text-left">Trạng thái</th>'
);

// also fix the layout issue where the extra td shifted the text
// wait, the previous `c = c.replace(/<td className="px-5 py-3 text-center"><span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">\{s\.scoreColumns \?\? 1\}.*?<\/span><\/td>/, ...)`
// replaced the newly inserted td perfectly if it matched. Let's make sure.

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
console.log('Fixed headers via node script');
