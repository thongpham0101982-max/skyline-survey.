const { PrismaClient } = require('./prisma/generated/client2');
const prisma = new PrismaClient();
async function main() {
    try {
        const users = await prisma.user.findMany({ take: 2 });
        console.log("Users available:", users.map(u => ({ id: u.id, role: u.role })));
        if (users.length > 0) {
            const assignments = await prisma.inputAssessmentTeacherAssignment.findMany({
                where: { teacherUserId: users[0].id },
                include: { subject: true, period: true }
            });
            console.log("Assignments for user 0:", assignments);
        }
    } catch(e) {
        console.error("Prisma Error:", e);
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());
