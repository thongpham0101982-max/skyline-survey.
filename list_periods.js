const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function run() {
    const periods = await p.surveyPeriod.findMany({
        select: { id: true, code: true, name: true, targetAudience: true },
        orderBy: { name: 'asc' }
    });
    console.log('All periods:');
    periods.forEach(x => console.log(`  ${x.code} | ${x.name} | audience: ${x.targetAudience}`));

    // Also check if KSHL_HS_HK2-2026 exists
    const kshl = await p.surveyPeriod.findFirst({
        where: { OR: [{ code: 'KSHL_HS_HK2-2026' }, { name: { contains: 'KSHL' } }] },
        include: { questions: { where: { isActive: true } } }
    });
    if (kshl) {
        console.log('\nFound KSHL period:', kshl.code, kshl.name);
        console.log('Questions:', kshl.questions.length);
        kshl.questions.slice(0,5).forEach(q => {
            console.log(`  type="${q.questionType}" opts=${q.options ? q.options.substring(0,80) : 'null'}`);
        });
    } else {
        console.log('\nKSHL period NOT found in local DB (it is in production Turso DB)');
    }
}

run().catch(console.error).finally(() => p.$disconnect());
