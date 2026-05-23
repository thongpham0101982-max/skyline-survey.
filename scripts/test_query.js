const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function test() {
    try {
        const allowedCampusIds = [];
        const academicYearId = 'AY-2026';
        const isGDCS = false; // Admin
        
        const periods = await prisma.inputAssessmentPeriod.findMany({
            where: { academicYearId, ...(isGDCS ? { campusId: { in: allowedCampusIds } } : {}) },
            include: {
                campus: true,
                InputAssessmentTeacherAssignment: { select: { id: true, unlockRequestStatus: true, unlockReason: true, user: { select: { fullName: true, id: true } } } },
                assignedUser: { select: { fullName: true } },
                batches: {
                    orderBy: { batchNumber: 'asc' }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        console.log("PERIODS LENGTH:", periods.length);
        console.log(periods);
    } catch (e) {
        console.error("ERROR:", e);
    }
}
test().finally(() => prisma.$disconnect());
