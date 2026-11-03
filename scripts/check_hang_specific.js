const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
require('dotenv').config();

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function check() {
  try {
    const hangId = "cmqgdj4br0002hs5x7j3eyxmc"; // Nguyễn Thị Hằng
    const hangSlots = await prisma.observationSlot.findMany({
      where: { teacherId: hangId },
      include: {
        registrations: {
          include: {
            teacher: { select: { id: true, teacherName: true, teacherCode: true } },
            evaluation: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });

    console.log(`Slots of Nguyễn Thị Hằng (total ${hangSlots.length}):`);
    hangSlots.forEach(s => {
      console.log(`- ID: ${s.id} | Date: ${s.date.toISOString().split('T')[0]} | StartTime: ${s.startTime} | EndTime: ${s.endTime} | Status: ${s.status} | Topic: "${s.topic}" | Subject: ${s.subjectName} | Class: ${s.className}`);
      s.registrations.forEach(r => {
        console.log(`    Reg: ${r.teacher.teacherName} (${r.teacher.teacherCode}) | isApproved: ${r.isApproved} | approvedAt: ${r.approvedAt} | hasEval: ${!!r.evaluation}`);
      });
    });

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
check();
