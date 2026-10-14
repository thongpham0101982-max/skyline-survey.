require('dotenv').config();
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
const { PrismaClient } = require('@prisma/client');

const url = (process.env.TURSO_DATABASE_URL || "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io").replace(/^libsql:\/\//i, 'https://');
const authToken = process.env.TURSO_AUTH_TOKEN;

const libsql = createClient({ url, authToken });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function main() {
  const teacher = await prisma.teacher.findFirst({
    where: {
      OR: [
        { teacherName: { contains: 'Văn Quốc Hoàng' } },
        { teacherCode: { contains: '0201000133' } }
      ]
    },
    include: {
      user: true,
      TeachingAssignment: { include: { class: true, subject: true } }
    }
  });

  console.log('Teacher:', teacher ? {
    id: teacher.id,
    name: teacher.teacherName,
    code: teacher.teacherCode,
    email: teacher.email,
    userId: teacher.userId,
    userRole: teacher.user?.role
  } : 'NOT FOUND');

  if (teacher) {
    const hrClasses = await prisma.class.findMany({
      where: {
        OR: [
          { homeroomTeacherId: teacher.id },
          { homeroomTeacherId: { contains: teacher.id } },
          { homeroomTeacherId: teacher.teacherCode },
          { homeroomTeacherId: { contains: teacher.teacherCode } },
          { teachers: { some: { teacherId: teacher.id, roleInClass: 'GVCN' } } }
        ]
      }
    });
    console.log('Homeroom classes:', hrClasses.map(c => ({ id: c.id, name: c.className, grade: c.grade })));
    console.log('Teaching assignments:', (teacher.TeachingAssignment || []).map(ta => ({
      class: ta.class?.className,
      subject: ta.subject?.subjectName
    })));
  }

  // Activities
  const acts = await prisma.activityRecord.findMany({
    select: { id: true, code: true, name: true, locationId: true }
  });
  console.log('Total activities in DB:', acts.length);
  acts.forEach(a => {
    let loc = {};
    try { loc = JSON.parse(a.locationId); } catch {}
    console.log('Act:', a.code, '|', a.name, '| AssignedClasses:', (loc.assignedClasses || []).map(c => c.className || c.classId));
  });
}

main().finally(() => prisma.$disconnect());
