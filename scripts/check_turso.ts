const { prisma } = require('./src/lib/db/index.ts');

async function main() {
  const records = await prisma.assessmentConfig.findMany();
  const targetRecords = records.filter(r => r.categoryType === 'HS_CT_QUOC_TE');
  console.log(`Found ${records.length} total configs, ${targetRecords.length} target records.`);
  
  if (targetRecords.length > 0) {
    const result = await prisma.assessmentConfig.updateMany({
      where: { categoryType: 'HS_CT_QUOC_TE' },
      data: { categoryType: 'HS_HT_HOC_SINH' }
    });
    console.log(`Updated ${result.count} database records in Turso`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
