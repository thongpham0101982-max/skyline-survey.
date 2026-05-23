const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.assessmentConfig.updateMany({
    where: { categoryType: 'HS_CT_QUOC_TE' },
    data: { categoryType: 'HS_HT_HOC_SINH' }
  });
  console.log(`Updated ${result.count} database records from HS_CT_QUOC_TE to HS_HT_HOC_SINH`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
