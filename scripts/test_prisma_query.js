const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const periods = await prisma.inputAssessmentPeriod.findMany({
      where: { academicYearId: 'AY-2026' },
      include: {
        campus: true,
        InputAssessmentTeacherAssignment: { 
            select: { 
                id: true, 
                unlockRequestStatus: true, 
                unlockReason: true, 
                user: { select: { fullName: true, id: true } } 
            } 
        },
        assignedUser: { select: { fullName: true } },
        batches: {
          orderBy: { batchNumber: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    console.log("Success! Found", periods.length);
  } catch (err) {
    console.log("Error:", err.message);
  }
}
main().finally(()=>prisma.$disconnect());
