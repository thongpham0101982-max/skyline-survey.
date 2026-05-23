const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debug() {
    // Find the survey period for KSHL_HS_HK2-2026
    const period = await prisma.surveyPeriod.findFirst({
        where: { code: { contains: 'KSHL_HS_HK2' } },
        include: {
            questions: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' }
            }
        }
    });

    if (!period) {
        console.log('Period not found, trying by name...');
        const period2 = await prisma.surveyPeriod.findFirst({
            where: { name: { contains: 'HK2' } },
            include: {
                questions: {
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' }
                }
            }
        });
        if (!period2) {
            // Show all periods
            const all = await prisma.surveyPeriod.findMany({ select: { id: true, code: true, name: true } });
            console.log('All periods:', JSON.stringify(all, null, 2));
            return;
        }
        console.log('Period:', period2.code, period2.name);
        console.log('Questions count:', period2.questions.length);
        period2.questions.forEach(q => {
            console.log(`\nQ: ${q.questionText.substring(0, 50)}`);
            console.log(`  type: "${q.questionType}"`);
            console.log(`  options: ${q.options ? q.options.substring(0, 100) : 'null'}`);
            console.log(`  ratingMin: ${q.ratingScaleMin}, ratingMax: ${q.ratingScaleMax}`);
            console.log(`  isActive: ${q.isActive}`);
        });
        return;
    }

    console.log('Period:', period.code, period.name);
    console.log('Questions count:', period.questions.length);
    period.questions.forEach(q => {
        console.log(`\nQ: ${q.questionText.substring(0, 50)}`);
        console.log(`  type: "${q.questionType}"`);
        console.log(`  options: ${q.options ? q.options.substring(0, 150) : 'null'}`);
        console.log(`  ratingMin: ${q.ratingScaleMin}, ratingMax: ${q.ratingScaleMax}`);
        console.log(`  isActive: ${q.isActive}`);
    });
}

debug().catch(console.error).finally(() => prisma.$disconnect());
