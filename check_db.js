const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const periods = await prisma.inputAssessmentPeriod.findMany({
        include: { batches: true }
    });
    console.log("PERIODS:", periods.length);
    console.log("FIRST:", periods[0]);
}

main().catch(console.error).finally(() => prisma.$disconnect());
