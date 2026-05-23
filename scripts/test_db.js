const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const years = await prisma.academicYear.findMany();
  console.log("Years:", years);
  const periods = await prisma.inputAssessmentPeriod.findMany({
     include: { batches: true }
  });
  console.log("Periods count:", periods.length);
  if(periods.length > 0) {
    console.log("First period:", periods[0]);
  }
}
main().catch(console.error).finally(()=>prisma.$disconnect());
