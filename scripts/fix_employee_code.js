const fs = require('fs');

// Fix page.tsx
let page = fs.readFileSync('src/app/admin/weekly-reports/page.tsx', 'utf8');
page = page.replace(
  "select: { id: true, fullName: true, role: true, email: true, employeeCode: true },",
  "select: { id: true, fullName: true, role: true, email: true },"
);
fs.writeFileSync('src/app/admin/weekly-reports/page.tsx', page);
console.log('OK: page.tsx fixed');

// Fix actions.ts
let actions = fs.readFileSync('src/app/admin/weekly-reports/actions.ts', 'utf8');
actions = actions.replace(
  "user: { select: { id: true, fullName: true, role: true, email: true, employeeCode: true } }",
  "user: { select: { id: true, fullName: true, role: true, email: true } }"
);
fs.writeFileSync('src/app/admin/weekly-reports/actions.ts', actions);
console.log('OK: actions.ts fixed');

// Fix client.tsx - use email instead of employeeCode
let client = fs.readFileSync('src/app/admin/weekly-reports/client.tsx', 'utf8');
client = client.replace(
  "report.user.employeeCode || report.user.email",
  "report.user.email"
);
fs.writeFileSync('src/app/admin/weekly-reports/client.tsx', client);
console.log('OK: client.tsx fixed');
