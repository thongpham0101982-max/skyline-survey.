const fs = require('fs');
const path = require('path');

const files = [
  'src/app/admin/layout.tsx',
  'src/app/teacher/layout.tsx',
  'src/app/parent/layout.tsx',
  'src/app/hocsinh/layout.tsx'
];

for (const file of files) {
  const fullPath = path.join('c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey', file);
  if (!fs.existsSync(fullPath)) continue;
  
  let content = fs.readFileSync(fullPath, 'utf8');

  // Remove <NotificationBell />
  content = content.replace('<NotificationBell />', '');
  // Clean up empty lines created
  content = content.replace(/^\s*[\r\n]/gm, '');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('Removed NotificationBell from ' + file);
}

// Now add colored borders to admin/page.tsx
const adminPagePath = path.join('c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey', 'src/app/admin/page.tsx');
let adminPageContent = fs.readFileSync(adminPagePath, 'utf8');
// replace border-slate-200 with colored borders on cards
adminPageContent = adminPageContent.replace('bg-white rounded-3xl border border-slate-200 p-6', 'bg-white rounded-2xl border-2 border-blue-100 p-5');
adminPageContent = adminPageContent.replace('bg-white rounded-3xl border border-slate-200 p-6', 'bg-white rounded-2xl border-2 border-indigo-100 p-5');
adminPageContent = adminPageContent.replace('bg-white rounded-3xl border border-slate-200 p-6', 'bg-white rounded-2xl border-2 border-amber-100 p-5');
adminPageContent = adminPageContent.replace('bg-white rounded-3xl border border-slate-200 p-6', 'bg-white rounded-2xl border-2 border-emerald-100 p-5');

// Update chart cards borders
adminPageContent = adminPageContent.replace('bg-white rounded-[2rem] border border-slate-200 p-8', 'bg-white rounded-2xl border-2 border-violet-100 p-6');
adminPageContent = adminPageContent.replace('bg-white rounded-[2rem] border border-slate-200 p-8', 'bg-white rounded-2xl border-2 border-emerald-100 p-6');

// Make header text more compact
adminPageContent = adminPageContent.replace('text-3xl font-black text-slate-800 tracking-tight', 'text-2xl font-black text-[#0A3230] tracking-tight');
adminPageContent = adminPageContent.replace('text-slate-500 font-medium mt-1', 'text-slate-500 text-sm font-medium mt-0.5');
adminPageContent = adminPageContent.replace('px-4 py-1.5 text-xs', 'px-3 py-1 text-[10px]');

fs.writeFileSync(adminPagePath, adminPageContent, 'utf8');
console.log('Updated admin page styles');
