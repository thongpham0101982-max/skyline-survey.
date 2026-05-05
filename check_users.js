const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkUsers() {
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, campusIds: true } });
    console.log(users);
}
checkUsers().finally(() => prisma.$disconnect());
