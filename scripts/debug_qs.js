const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    const qs = await prisma.surveyQuestion.findMany({
        take: 10
    });
    
    console.log('Sample questions:');
    qs.forEach(q => {
        console.log(`- Text: ${q.questionText.substring(0, 30)}, Type: "${q.questionType}"`);
    });
}

debug().finally(() => prisma.$disconnect());
