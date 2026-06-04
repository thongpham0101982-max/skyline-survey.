const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  const fullPath = path.join('c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log('Skipping missing file: ' + fullPath);
    return;
  }
  let content = fs.readFileSync(fullPath, 'utf8');
  for (const r of replacements) {
    content = content.replace(r.from, r.to);
  }
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Updated: ' + filePath);
}

replaceInFile('src/app/parent/page.tsx', [
  { from: 'bg-white rounded-[2.5rem] border border-slate-200', to: 'bg-white rounded-[2.5rem] border-2 border-teal-100' }
]);

replaceInFile('src/app/hocsinh/hs-khaosat/danh-sach/page.tsx', [
  { from: 'group bg-white rounded-[2rem] border border-slate-200', to: 'group bg-white rounded-[2rem] border-2 border-teal-100' }
]);

replaceInFile('src/app/admin/nps/page.tsx', [
  { from: 'bg-white rounded-[2rem] p-8 border border-slate-200', to: 'bg-white rounded-[2rem] p-8 border-2 border-rose-100' },
  { from: 'bg-white rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-100', to: 'bg-white rounded-[2rem] border-2 border-indigo-100 shadow-sm hover:shadow-xl hover:border-indigo-200' }
]);

replaceInFile('src/app/admin/reports/client.tsx', [
  { from: 'bg-white p-8 rounded-3xl border border-slate-200 shadow-sm', to: 'bg-white p-8 rounded-[2rem] border-2 border-blue-100 shadow-sm' },
  { from: 'bg-white p-8 rounded-3xl border border-emerald-100 shadow-sm', to: 'bg-white p-8 rounded-[2rem] border-2 border-emerald-100 shadow-sm' },
  { from: 'bg-white p-8 rounded-3xl border border-rose-100 shadow-sm', to: 'bg-white p-8 rounded-[2rem] border-2 border-rose-100 shadow-sm' },
  { from: 'bg-slate-900 p-8 rounded-3xl shadow-xl flex items-center justify-between border border-slate-800', to: 'bg-slate-900 p-8 rounded-[2rem] shadow-xl flex items-center justify-between border-2 border-slate-700' }
]);

replaceInFile('src/app/teacher/classes/client.tsx', [
  { from: 'bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden', to: 'bg-white rounded-2xl shadow-sm border-2 border-teal-100 overflow-hidden' }
]);

// Wait, also check src/app/teacher/classes/[id]/page.tsx
