require('dotenv').config();
const { prisma } = require('./src/lib/db');
async function run() {
  const students = await prisma.inputAssessmentStudent.findMany({ where: { periodId: 'cmnrk8tcd00019yj31f18hjql' } });
  console.log("Total students in Turso:", students.length);
  if(students.length > 0) {
     console.log("Grades:", students.slice(0,5).map(s => s.grade));
  }
}
run();
