import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { batchId } = await req.json();
    if (!batchId) {
      return NextResponse.json({ error: "Thiếu batchId" }, { status: 400 });
    }

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
      include: { finalRecords: true },
    });

    if (!batch) {
      return NextResponse.json({ error: "Không tìm thấy đợt import" }, { status: 404 });
    }

    if (batch.status === "ROLLED_BACK") {
      return NextResponse.json({ error: "Đợt import này đã được rollback trước đó" }, { status: 400 });
    }

    const studentSubjectPairs = Array.from(
      new Set(batch.finalRecords.map((r) => r.studentId + "_" + r.subjectId))
    );

    await prisma.$transaction(async (tx) => {
      await tx.studentCompetencyAssessment.deleteMany({
        where: { batchId },
      });

      for (const pair of studentSubjectPairs) {
        const [studentId, subjectId] = pair.split("_");

        const remainingAssessments = await tx.studentCompetencyAssessment.findMany({
          where: {
            studentId,
            subjectId,
            academicYearId: batch.academicYearId,
            assessmentPeriod: batch.assessmentPeriod,
          },
        });

        if (remainingAssessments.length === 0) {
          await tx.studentSubjectCompetencySummary.deleteMany({
            where: {
              studentId,
              subjectId,
              academicYearId: batch.academicYearId,
              assessmentPeriod: batch.assessmentPeriod,
            },
          });
        }
      }

      await tx.importBatch.update({
        where: { id: batchId },
        data: { status: "ROLLED_BACK" },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Đã rollback thành công toàn bộ đợt import",
    });
  } catch (error: any) {
    console.error("Rollback error:", error);
    return NextResponse.json({ error: error.message || "Lỗi rollback đợt import" }, { status: 500 });
  }
}