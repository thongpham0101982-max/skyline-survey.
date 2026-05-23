const fs = require('fs');
let s = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Add weeklyReports relation to AcademicYear
const old = '  workTasks           WorkTask[]\n}';
const rep = '  workTasks           WorkTask[]\n  weeklyReports      WeeklyReport[]\n}';

if (s.includes(old) && !s.includes('weeklyReports      WeeklyReport')) {
  s = s.replace(old, rep);
  fs.writeFileSync('prisma/schema.prisma', s);
  console.log('OK: AcademicYear relation added');
} else {
  // Try with \r\n
  const old2 = '  workTasks           WorkTask[]\r\n}';
  if (s.includes(old2)) {
    s = s.replace(old2, '  workTasks           WorkTask[]\r\n  weeklyReports      WeeklyReport[]\r\n}');
    fs.writeFileSync('prisma/schema.prisma', s);
    console.log('OK: AcademicYear relation added (CRLF)');
  } else {
    console.log('ERROR: Pattern not found');
  }
}
