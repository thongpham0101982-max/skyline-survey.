require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');

const url = (process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || '').replace(/^libsql:\/\//, 'https://');
const authToken = process.env.TURSO_AUTH_TOKEN;

const libsql = createClient({ url, authToken });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function test() {
  const allParents = await prisma.user.findMany({
    where: { role: 'PARENT' },
    select: { id: true }
  });
  const ids = allParents.map(p => p.id);
  console.log('Testing with ids count:', ids.length);
  try {
    const t0 = Date.now();
    await prisma.user.updateMany({
      where: { id: { in: ids } },
      data: { status: 'LOCKED' }
    });
    console.log('User updateMany took ms:', Date.now() - t0);
  } catch (e) {
    console.log('User updateMany failed:', e.message);
  }
}
test().finally(() => prisma.$disconnect());
