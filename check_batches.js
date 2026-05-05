const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkBatches() {
    const batches = await prisma.inputAssessmentBatch.findMany();
    console.log("BATCHES:", batches);
}
checkBatches().finally(() => prisma.$disconnect());
