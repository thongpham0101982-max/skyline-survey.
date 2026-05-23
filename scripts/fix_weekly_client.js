const fs = require('fs');

let client = fs.readFileSync('src/app/admin/weekly-reports/client.tsx', 'utf8');

// 1. Remove getWeeksOfMonth from server import
client = client.replace(
  'import { getWeeksOfMonth, getWeeklyReport, getAllWeeklyReports, saveWeeklyReport, addManagerComment, addManagerItemNote } from "./actions"',
  'import { getWeeklyReport, getAllWeeklyReports, saveWeeklyReport, addManagerComment, addManagerItemNote } from "./actions"'
);

// 2. Add the function locally (not a server action)
const localFunc = `
// Calculate weeks for a given month/year (client-side)
function getWeeksOfMonth(month: number, year: number) {
  const weeks: { weekNum: number; start: string; end: string; label: string }[] = []
  const lastDay = new Date(year, month, 0)
  
  let current = new Date(year, month - 1, 1)
  while (current.getDay() !== 1 && current <= lastDay) {
    current.setDate(current.getDate() + 1)
  }
  
  let weekNum = 1
  while (current <= lastDay) {
    const start = new Date(current)
    const friday = new Date(current)
    friday.setDate(friday.getDate() + 4)
    const end = friday > lastDay ? new Date(lastDay) : friday
    
    weeks.push({
      weekNum,
      start: start.toLocaleDateString("vi-VN"),
      end: end.toLocaleDateString("vi-VN"),
      label: "Tuan " + weekNum + " (" + start.getDate() + "/" + (start.getMonth()+1) + " - " + end.getDate() + "/" + (end.getMonth()+1) + ")"
    })
    
    weekNum++
    current.setDate(current.getDate() + 7)
  }
  
  return weeks
}

`;

// Insert after imports (before const PROGRESS)
client = client.replace(
  'const PROGRESS = [',
  localFunc + 'const PROGRESS = ['
);

// 3. Fix the useEffect to use sync function directly
// It already calls getWeeksOfMonth synchronously which is fine now

fs.writeFileSync('src/app/admin/weekly-reports/client.tsx', client);
console.log('OK: Client fixed - getWeeksOfMonth is now local');
