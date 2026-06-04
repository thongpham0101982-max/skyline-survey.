const fs = require('fs');
const clientPath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\teacher\\input-assessments\\client.tsx';
let clientContent = fs.readFileSync(clientPath, 'utf8');

// Replace text-sm in the table with text-[13px] for a more compact look
clientContent = clientContent.replace(/text-sm whitespace-nowrap/g, 'text-[13px] whitespace-nowrap');
clientContent = clientContent.replace(/<td className="px-3 py-3 bg-transparent text-left">\s*<span className="font-bold text-slate-700 text-sm whitespace-nowrap">/g, '<td className="px-3 py-3 bg-transparent text-left">\n                                              <span className="font-bold text-slate-700 text-[13px] whitespace-nowrap">');

// Apply compact borders to inputs
clientContent = clientContent.replace(/h-\[42px\]/g, 'h-[36px] text-[13px]');

fs.writeFileSync(clientPath, clientContent, 'utf8');
console.log('Made table UI more compact');
