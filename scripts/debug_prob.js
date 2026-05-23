const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    const q = await prisma.surveyQuestion.findFirst({
        where: {
            questionText: {
                contains: 'Bạn vui lòng cho biết mức độ tự hào'
            }
        }
    });
    console.log(JSON.stringify(q, null, 2));
}

debug().finally(() => prisma.$disconnect());
