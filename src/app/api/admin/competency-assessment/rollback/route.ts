import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { batchId } = await req.json();
    if (!batchId) {
      return NextResponse.json({ error: "Thiếu batchId" }, { status: 400 });
    }

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        batchCode: true,
        status: true,
        academicYearId: true,
        assessmentPeriod: true,
        finalRecords: {
          select: {
            studentId: true,
            subjectId: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Không tìm thấy đợt import" }, { status: 404 });
    }

    if (batch.status === "ROLLED_BACK") {
      return NextResponse.json({ error: "Đợt import này đã được rollback trước đó" }, { status: 400 });
    }

    const studentIds = Array.from(new Set(batch.finalRecords.map((r) => r.studentId).filter(Boolean)));
    const subjectIds = Array.from(new Set(batch.finalRecords.map((r) => r.subjectId).filter(Boolean)));
    const studentSubjectPairs = Array.from(
      new Set(batch.finalRecords.map((r) => `${r.studentId}_${r.subjectId}`))
    );

    await prisma.$transaction(async (tx) => {
      // 1. Delete all final assessment records created by this batch
      await tx.studentCompetencyAssessment.deleteMany({
        where: { batchId },
      });

      // 2. Check if any student-subject pairs STILL have other assessments for this academic year & period
      const remainingPairSet = new Set<string>();
      if (studentIds.length > 0 && subjectIds.length > 0) {
        const ID_CHUNK = 500;
        for (let i = 0; i < studentIds.length; i += ID_CHUNK) {
          const chunkIds = studentIds.slice(i, i + ID_CHUNK);
          const remaining = await tx.studentCompetencyAssessment.findMany({
            where: {
              academicYearId: batch.academicYearId,
              assessmentPeriod: batch.assessmentPeriod,
              studentId: { in: chunkIds },
              subjectId: { in: subjectIds },
            },
            select: {
              studentId: true,
              subjectId: true,
            },
            distinct: ["studentId", "subjectId"],
          });

          for (const r of remaining) {
            remainingPairSet.add(`${r.studentId}_${r.subjectId}`);
          }
        }
      }

      // 3. For any student-subject pair that has NO remaining assessments, batch delete the summary
      const emptyPairs = studentSubjectPairs.filter((p) => !remainingPairSet.has(p));
      if (emptyPairs.length > 0) {
        const emptyBySubject: Record<string, string[]> = {};
        for (const pair of emptyPairs) {
          const [sId, subId] = pair.split("_");
          if (!emptyBySubject[subId]) emptyBySubject[subId] = [];
          emptyBySubject[subId].push(sId);
        }

        const CHUNK_SIZE = 500;
        for (const [subId, stIds] of Object.entries(emptyBySubject)) {
          for (let i = 0; i < stIds.length; i += CHUNK_SIZE) {
            const chunkIds = stIds.slice(i, i + CHUNK_SIZE);
            await tx.studentSubjectCompetencySummary.deleteMany({
              where: {
                academicYearId: batch.academicYearId,
                assessmentPeriod: batch.assessmentPeriod,
                subjectId: subId,
                studentId: { in: chunkIds },
              },
            });
          }
        }
      }

      // 4. Update batch status
      await tx.importBatch.update({
        where: { id: batchId },
        data: { status: "ROLLED_BACK" },
      });
    }, { timeout: 60000, maxWait: 15000 });

    return NextResponse.json({
      success: true,
      message: "Đã rollback thành công toàn bộ đợt import",
    });
  } catch (error: any) {
    console.error("Rollback error:", error);
    return NextResponse.json({ error: error.message || "Lỗi rollback đợt import" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const batchId = searchParams.get("batchId");
    if (!batchId) {
      return NextResponse.json({ error: "Thiếu batchId" }, { status: 400 });
    }

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      select: {
        id: true,
        batchCode: true,
        status: true,
        academicYearId: true,
        assessmentPeriod: true,
        finalRecords: {
          select: {
            studentId: true,
            subjectId: true,
          },
        },
      },
    });

    if (!batch) {
      return NextResponse.json({ error: "Không tìm thấy đợt import" }, { status: 404 });
    }

    const studentIds = Array.from(new Set(batch.finalRecords.map((r) => r.studentId).filter(Boolean)));
    const subjectIds = Array.from(new Set(batch.finalRecords.map((r) => r.subjectId).filter(Boolean)));
    const studentSubjectPairs = Array.from(
      new Set(batch.finalRecords.map((r) => `${r.studentId}_${r.subjectId}`))
    );

    await prisma.$transaction(async (tx) => {
      // 1. Delete final records if any
      if (batch.finalRecords.length > 0) {
        await tx.studentCompetencyAssessment.deleteMany({
          where: { batchId },
        });

        const remainingPairSet = new Set<string>();
        if (studentIds.length > 0 && subjectIds.length > 0) {
          const ID_CHUNK = 500;
          for (let i = 0; i < studentIds.length; i += ID_CHUNK) {
            const chunkIds = studentIds.slice(i, i + ID_CHUNK);
            const remaining = await tx.studentCompetencyAssessment.findMany({
              where: {
                academicYearId: batch.academicYearId,
                assessmentPeriod: batch.assessmentPeriod,
                studentId: { in: chunkIds },
                subjectId: { in: subjectIds },
              },
              select: {
                studentId: true,
                subjectId: true,
              },
              distinct: ["studentId", "subjectId"],
            });

            for (const r of remaining) {
              remainingPairSet.add(`${r.studentId}_${r.subjectId}`);
            }
          }
        }

        const emptyPairs = studentSubjectPairs.filter((p) => !remainingPairSet.has(p));
        if (emptyPairs.length > 0) {
          const emptyBySubject: Record<string, string[]> = {};
          for (const pair of emptyPairs) {
            const [sId, subId] = pair.split("_");
            if (!emptyBySubject[subId]) emptyBySubject[subId] = [];
            emptyBySubject[subId].push(sId);
          }

          const CHUNK_SIZE = 500;
          for (const [subId, stIds] of Object.entries(emptyBySubject)) {
            for (let i = 0; i < stIds.length; i += CHUNK_SIZE) {
              const chunkIds = stIds.slice(i, i + CHUNK_SIZE);
              await tx.studentSubjectCompetencySummary.deleteMany({
                where: {
                  academicYearId: batch.academicYearId,
                  assessmentPeriod: batch.assessmentPeriod,
                  subjectId: subId,
                  studentId: { in: chunkIds },
                },
              });
            }
          }
        }
      }

      // 2. Cascade delete the importBatch (will delete staging records too)
      await tx.importBatch.delete({
        where: { id: batchId },
      });
    }, { timeout: 60000, maxWait: 15000 });

    return NextResponse.json({
      success: true,
      message: `Đã xóa đợt import ${batch.batchCode} thành công`,
    });
  } catch (error: any) {
    console.error("Delete batch error:", error);
    return NextResponse.json({ error: error.message || "Lỗi xóa đợt import" }, { status: 500 });
  }
}
