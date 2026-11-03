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
    console.log("=== CHECK TEACHER HẰNG ===");
    const teachers = await prisma.teacher.findMany({
      where: {
        OR: [
          { user: { fullName: { contains: "Hằng" } } },
          { teacherCode: { contains: "0201000086" } },
          { user: { email: { contains: "hang" } } }
        ]
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } }
      }
    });
    console.log("Teachers found:", JSON.stringify(teachers, null, 2));

    console.log("\n=== CHECK TEACHER THỦY ===");
    const observers = await prisma.teacher.findMany({
      where: {
        OR: [
          { user: { fullName: { contains: "Thủy" } } },
          { user: { fullName: { contains: "Thuy" } } },
          { user: { email: { contains: "thuy" } } }
        ]
      },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } }
      }
    });
    console.log("Observers found:", JSON.stringify(observers, null, 2));

    console.log("\n=== CHECK OBSERVATION SLOTS ===");
    const slots = await prisma.observationSlot.findMany({
      where: {
        OR: [
          { topic: { contains: "Cảm xúc" } },
          { topic: { contains: "đến từ đâu" } },
          { teacherId: { in: teachers.map(t => t.id) } }
        ]
      },
      include: {
        teacher: {
          include: {
            user: { select: { fullName: true, email: true } }
          }
        },
        registrations: {
          include: {
            teacher: {
              include: {
                user: { select: { fullName: true, email: true } }
              }
            },
            evaluation: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    console.log("Observation Slots found:", JSON.stringify(slots, null, 2));

  } catch (err) {
    console.error("Error checking:", err);
  } finally {
    await prisma.$disconnect();
  }
}

check();
