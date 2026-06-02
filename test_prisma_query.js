const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@libsql/client');
const { PrismaLibSQL } = require('@prisma/adapter-libsql');
require('dotenv').config();

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const periodId = 'cmnrk8tcd00019yj31f18hjql';
    const batchId = 'cmpw0nkmc0003ak07aueenlwt'; // Đợt 3
    
    const where = { periodId };
    where.OR = [
      { batchId: batchId },
      { batchId: null }
    ];
    
    console.log("Querying with where:", JSON.stringify(where, null, 2));
    const students = await prisma.inputAssessmentStudent.findMany({
      where,
      select: { studentCode: true, fullName: true, batchId: true }
    });
    console.log("Returned students:", students.length);
    console.log(students);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
