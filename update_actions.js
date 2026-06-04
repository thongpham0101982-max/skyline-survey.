const fs = require('fs');
const filePath = 'c:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\e243b0d8-3241-4833-8c7a-e612ebbae098\\browser\\Skyline-survey\\src\\app\\admin\\tasks\\actions.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  /isRead: false(\s*)}/g,
  'isRead: false,\n          link: "/admin/tasks?taskId=" + task.id}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Added link to actions.ts');
