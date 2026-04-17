const { PrismaClient } = require('./prisma/generated/client2');
const prisma = new PrismaClient();
async function main() {
    const res = await prisma.assessmentSubject.updateMany({
        where: { code: 'TLY' },
        data: { scoreColumns: 7, commentColumns: 1 }
    });
    console.log('Updated ' + res.count + ' rows');
}
main().catch(console.error).finally(() => prisma.$disconnect());
