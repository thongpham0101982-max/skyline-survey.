// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { synthesizeSubjectSummary } from "@/lib/competency-service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { batchId, duplicateAction = "OVERWRITE" } = body;

    if (!batchId) {
      return NextResponse.json({ error: "Thiếu mã đợt import" }, { status: 400 });
    }

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json({ error: "Không tìm thấy đợt import" }, { status: 404 });
    }

    const stagingRecords = await prisma.stagingCompetencyAssessment.findMany({
      where: {
        batchId,
        studentId: { not: null },
        subjectId: { not: null },
        competencyId: { not: null },
        validationStatus: { in: ["VALID", "WARNING", "DUPLICATE"] },
      },
    });

    if (stagingRecords.length === 0) {
      return NextResponse.json({ error: "Không có dòng dữ liệu hợp lệ để import" }, { status: 400 });
    }

    const subjectIds = Array.from(new Set(stagingRecords.map((r) => r.subjectId as string)));
    const allCompetencies = await prisma.subjectCompetency.findMany({
      where: { subjectId: { in: subjectIds } },
    });

    const studentSubjectMap = new Map<string, any[]>();
    const assessmentRecordsToInsert: any[] = [];

    for (const record of stagingRecords) {
      if (!record.studentId || !record.subjectId || !record.competencyId) continue;

      assessmentRecordsToInsert.push({
        id: crypto.randomUUID(),
        batchId: batch.id,
        studentId: record.studentId,
        subjectId: record.subjectId,
        competencyId: record.competencyId,
        academicYearId: batch.academicYearId,
        semester: batch.semester,
        assessmentPeriod: batch.assessmentPeriod,
        achievedScore: record.achievedScore,
        maxScore: record.maxScore,
        competencyPercent: record.competencyPercent !== null ? record.competencyPercent : 0,
        calculationSource: record.calculationSource || "SYSTEM_CALCULATED",
      });

      const groupKey = record.studentId + "_" + record.subjectId;
      if (!studentSubjectMap.has(groupKey)) {
        studentSubjectMap.set(groupKey, []);
      }
      studentSubjectMap.get(groupKey)!.push({
        competencyId: record.competencyId,
        competencyPercent: record.competencyPercent,
        achievedScore: record.achievedScore,
        maxScore: record.maxScore,
        calculationSource: record.calculationSource,
      });
    }

    const summariesToInsert: any[] = [];
    for (const [groupKey, assessments] of Array.from(studentSubjectMap.entries())) {
      const [studentId, subjectId] = groupKey.split("_");
      const subjectComps = allCompetencies.filter((c) => c.subjectId === subjectId);
      const summary = synthesizeSubjectSummary(subjectComps, assessments);

      summariesToInsert.push({
        id: crypto.randomUUID(),
        studentId,
        subjectId,
        academicYearId: batch.academicYearId,
        semester: batch.semester,
        assessmentPeriod: batch.assessmentPeriod,
        subjectScore: summary.subjectScore,
        evaluatedCount: summary.evaluatedCount,
        totalCompetencies: summary.totalCompetencies,
        radarData: JSON.stringify(summary.radarData),
      });
    }

    await prisma.$transaction(async (tx) => {
      if (duplicateAction === "OVERWRITE") {
        const studentIds = Array.from(new Set(stagingRecords.map((r) => r.studentId as string)));
        const ID_CHUNK = 500;
        for (let i = 0; i < studentIds.length; i += ID_CHUNK) {
          const chunkStudentIds = studentIds.slice(i, i + ID_CHUNK);
          await tx.studentCompetencyAssessment.deleteMany({
            where: {
              academicYearId: batch.academicYearId,
              assessmentPeriod: batch.assessmentPeriod,
              studentId: { in: chunkStudentIds },
              subjectId: { in: subjectIds },
            },
          });
          await tx.studentSubjectCompetencySummary.deleteMany({
            where: {
              academicYearId: batch.academicYearId,
              assessmentPeriod: batch.assessmentPeriod,
              studentId: { in: chunkStudentIds },
              subjectId: { in: subjectIds },
            },
          });
        }
      }

      const BATCH_SIZE = 1500;
      for (let i = 0; i < assessmentRecordsToInsert.length; i += BATCH_SIZE) {
        const chunk = assessmentRecordsToInsert.slice(i, i + BATCH_SIZE);
        await tx.studentCompetencyAssessment.createMany({
          data: chunk,
        });
      }

      for (let i = 0; i < summariesToInsert.length; i += BATCH_SIZE) {
        const chunk = summariesToInsert.slice(i, i + BATCH_SIZE);
        await tx.studentSubjectCompetencySummary.createMany({
          data: chunk,
        });
      }

      await tx.importBatch.update({
        where: { id: batch.id },
        data: {
          status: "COMMITTED",
          committedAt: new Date(),
          totalRows: stagingRecords.length,
          validRows: stagingRecords.length,
        },
      });
    }, { timeout: 30000 });

    return NextResponse.json({
      success: true,
      message: "Import thành công " + assessmentRecordsToInsert.length + " bản ghi đánh giá năng lực",
      totalCommitted: assessmentRecordsToInsert.length,
      totalSummaries: summariesToInsert.length,
      batchCode: batch.batchCode,
    });
  } catch (error: any) {
    console.error("Commit error:", error);
    return NextResponse.json({ error: error.message || "Lỗi lưu dữ liệu chính thức" }, { status: 500 });
  }
}