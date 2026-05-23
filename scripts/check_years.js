const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const years = await prisma.academicYear.findMany();
    console.log("YEARS:", years);
}

main().catch(console.error).finally(() => prisma.$disconnect());
