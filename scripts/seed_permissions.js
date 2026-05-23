const { PrismaClient } = require('./prisma/generated/client2');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

const tursoUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

async function run() {
  let prisma;
  if (tursoUrl) {
    const libsql = createClient({ url: tursoUrl, authToken });
    const adapter = new PrismaLibSQL(libsql);
    prisma = new PrismaClient({ adapter });
  } else {
    prisma = new PrismaClient();
  }

  const roles = [
    { code: 'ADMIN', name: 'Administrator', description: 'Full system access', isSystem: true },
    { code: 'KT_DBCL', name: 'Khảo thí & ĐBCL', description: 'Quality assurance staff', isSystem: false },
    { code: 'TEACHER', name: 'Giáo viên', description: 'Teacher access', isSystem: true },
    { code: 'PARENT', name: 'Phụ huynh', description: 'Parent access', isSystem: true },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role
    });
  }

  const modules = ['TASKS', 'WEEKLY_REPORTS', 'ACADEMIC_YEARS', 'MANAGE_CLASSES', 'TEACHERS', 'SUBJECTS', 'ASSIGNMENTS', 'INPUT_ASSESSMENTS', 'STUDENT_ACHIEVEMENTS', 'SURVEY_CATALOG'];

  // Grant all to ADMIN
  for (const mod of modules) {
    await prisma.permission.upsert({
      where: { roleCode_module: { roleCode: 'ADMIN', module: mod } },
      update: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
      create: { roleCode: 'ADMIN', module: mod, canRead: true, canCreate: true, canUpdate: true, canDelete: true }
    });
    
    // Grant most to KT_DBCL
    await prisma.permission.upsert({
        where: { roleCode_module: { roleCode: 'KT_DBCL', module: mod } },
        update: { canRead: true, canCreate: true, canUpdate: true, canDelete: true },
        create: { roleCode: 'KT_DBCL', module: mod, canRead: true, canCreate: true, canUpdate: true, canDelete: true }
      });
  }

  console.log('Roles and Permissions seeded to Turso');
  await prisma.$disconnect();
}

run().catch(e => console.error(e));
