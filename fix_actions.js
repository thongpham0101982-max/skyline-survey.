const fs = require('fs');

// 1. Fix actions.ts - make getWeeksOfMonth async
let actions = fs.readFileSync('src/app/admin/weekly-reports/actions.ts', 'utf8');
actions = actions.replace(
  'export function getWeeksOfMonth(month: number, year: number) {',
  'export async function getWeeksOfMonth(month: number, year: number) {'
);
fs.writeFileSync('src/app/admin/weekly-reports/actions.ts', actions);
console.log('OK: actions.ts fixed - getWeeksOfMonth now async');

// 2. Push schema
console.log('Now push schema...');
