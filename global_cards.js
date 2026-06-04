const fs = require('fs');
const path = require('path');

const colors = [
  'border-2 border-blue-100',
  'border-2 border-amber-100',
  'border-2 border-indigo-100',
  'border-2 border-emerald-100',
  'border-2 border-violet-100',
  'border-2 border-rose-100',
  'border-2 border-teal-100'
];
let colorIndex = 0;

function processFile(fullPath) {
  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;

  // Regex to find things like: bg-white rounded-3xl border border-slate-200
  // Or bg-white rounded-[2rem] border border-slate-200 p-8
  const regex = /(bg-white\s+[^"']*)border\s+border-slate-200/g;
  
  content = content.replace(regex, (match, p1) => {
    // Only apply if it looks like a prominent card (has rounded and padding)
    if (match.includes('rounded') && (match.includes('p-') || match.includes('shadow'))) {
      const colorClass = colors[colorIndex % colors.length];
      colorIndex++;
      modified = true;
      return p1 + colorClass;
    }
    return match;
  });

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Updated cards in: ' + fullPath.split('src\\\\app\\\\')[1]);
  }
}

function search(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      search(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.jsx')) {
      processFile(fullPath);
    }
  }
}

search('c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app');
