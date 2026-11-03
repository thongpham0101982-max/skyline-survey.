const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
require('dotenv').config();

const libsql = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const prisma = new PrismaClient({ adapter: new PrismaLibSQL(libsql) });

async function run() {
  const logs = await prisma.academicConsultationLog.findMany({
    include: { student: { include: { class: true } } }
  });
  const summary = {};
  logs.forEach(l => {
    const c = l.student?.class?.className || 'NONE';
    const notes = (l.notes || '').toLowerCase();
    const content = (l.content || '').toLowerCase();
    const isEx = notes.includes('[gradeperiod:') || 
                 notes.includes('trao đổi giữa gvcn và phhs về kết quả khảo sát') ||
                 (content.startsWith('ý kiến gvcn:') && notes.includes('khảo sát'));
    if (!summary[c]) summary[c] = { total: 0, nonGrade: 0, students: new Set() };
    summary[c].total++;
    if (!isEx) {
      summary[c].nonGrade++;
      summary[c].students.add(l.studentId);
    }
  });

  const out = Object.fromEntries(
    Object.entries(summary).sort().map(([k, v]) => [k, { totalLogs: v.total, regularLogs: v.nonGrade, uniqueStudents: v.students.size }])
  );
  console.log(JSON.stringify(out, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
