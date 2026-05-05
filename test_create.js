const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function createBatch() {
    try {
        const result = await prisma.inputAssessmentBatch.create({
          data: {
             periodId: 'cmnrk8tcd00019yj31f18hjql',
             batchNumber: 1,
             campusId: null,
             name: 'Batch 1',
             startDate: new Date(),
             endDate: new Date(),
             status: 'ACTIVE'
          }
        });
        console.log(result);
    } catch(e) {
        console.error("ERROR:", e);
    }
}
createBatch().finally(() => prisma.$disconnect());
