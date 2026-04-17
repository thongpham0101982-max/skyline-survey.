const fs = require('fs');

let c = fs.readFileSync('src/app/admin/input-assessments/client.tsx', 'utf8');

// Undo bad replacement
const badButton = `\n    <button onClick={() => { setViewResultsGroup(g); setViewResultsData(null); }} className="p-1.5 text-slate-400 hover:text-sky-500 rounded-lg hover:bg-sky-50" title="Xem kết quả"><BookOpen className="w-3.5 h-3.5"/></button>`;
c = c.replace(badButton, "");

// Add to the right table
// The assignments table uses Delete group:
// `<button onClick={deleteGroup} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5"/></button>`
// Let's replace that exact string.
const target = `<button onClick={deleteGroup} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5"/></button>`;
const replacement = `<button onClick={deleteGroup} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5"/></button>
<button onClick={() => { setViewResultsGroup(g); setViewResultsData(null); }} className="p-1.5 text-sky-600 bg-sky-50 border border-sky-200 hover:bg-sky-500 hover:text-white transition-colors rounded-lg shadow-sm font-semibold text-xs py-1 px-3 ml-2 flex items-center gap-1.5" title="Xem kết quả điểm"><BookOpen className="w-3 h-3"/> Soi điểm</button>`;

c = c.replace(target, replacement);

fs.writeFileSync('src/app/admin/input-assessments/client.tsx', c, 'utf8');
console.log('Fixed button location');
