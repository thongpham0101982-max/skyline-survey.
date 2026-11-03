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
    const thuyTeacherId = 'cmq0cphsf0002gj8vts5gpcbs'; // Võ Minh Thủy
    console.log("=== All registrations for Võ Minh Thủy ===");
    const regs = await prisma.observationRegistration.findMany({
      where: { teacherId: thuyTeacherId },
      include: {
        slot: {
          include: {
            teacher: true
          }
        },
        evaluation: true
      },
      orderBy: { registeredAt: 'desc' }
    });

    console.log(`Total registrations: ${regs.length}`);
    for (const r of regs) {
      console.log({
        regId: r.id,
        isApproved: r.isApproved,
        approvedAt: r.approvedAt,
        registeredAt: r.registeredAt,
        hasEvaluation: !!r.evaluation,
        slotId: r.slot.id,
        slotTopic: r.slot.topic,
        slotDate: r.slot.date,
        slotStartTime: r.slot.startTime,
        slotEndTime: r.slot.endTime,
        slotStatus: r.slot.status,
        slotTeacher: r.slot.teacher.teacherName,
        slotTeacherCode: r.slot.teacher.teacherCode,
        className: r.slot.className,
        subjectName: r.slot.subjectName
      });
    }

    console.log("\n=== Any slot on 2026-10-27 ===");
    const slots27 = await prisma.observationSlot.findMany({
      where: {
        date: {
          gte: new Date('2026-10-26T17:00:00.000Z'),
          lte: new Date('2026-10-27T17:00:00.000Z')
        }
      },
      include: {
        teacher: true,
        registrations: {
          include: {
            teacher: true
          }
        }
      }
    });
    console.log(`Slots on 2026-10-27: ${slots27.length}`);
    for (const s of slots27) {
      console.log({
        id: s.id,
        topic: s.topic,
        teacher: s.teacher.teacherName,
        className: s.className,
        subjectName: s.subjectName,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        regs: s.registrations.map(reg => `${reg.teacher.teacherName} (approved: ${reg.isApproved})`)
      });
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
check();
