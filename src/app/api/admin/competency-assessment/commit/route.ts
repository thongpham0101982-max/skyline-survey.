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

    // 1. Fetch valid/warning/duplicate staging records
    const stagingRecords = await prisma.stagingCompetencyAssessment.findMany({
      where: {
        batchId,
        studentId: { not: null },
        subjectId: { not: null },
        competencyId: { not: null },
        validationStatus: { in: ["VALID", "WARNING", "DUPLICATE"] },
      },
      orderBy: { rowNumber: "asc" },
    });

    if (stagingRecords.length === 0) {
      return NextResponse.json({ error: "Không có dòng dữ liệu hợp lệ để import" }, { status: 400 });
    }

    const subjectIds = Array.from(new Set(stagingRecords.map((r) => r.subjectId as string)));
    const allCompetencies = await prisma.subjectCompetency.findMany({
      where: { subjectId: { in: subjectIds } },
    });

    // Group evaluations by Student + Subject + Competency to merge multi-component sub-subjects (e.g. KHTN Lý, Hóa, Sinh)
    const studentCompGroupMap = new Map<string, any[]>();
    for (const record of stagingRecords) {
      if (!record.studentId || !record.subjectId || !record.competencyId) continue;
      const compKey = record.studentId + "_" + record.subjectId + "_" + record.competencyId;
      if (!studentCompGroupMap.has(compKey)) {
        studentCompGroupMap.set(compKey, []);
      }
      studentCompGroupMap.get(compKey)!.push(record);
    }

    const assessmentRecordsToInsert: any[] = [];
    const studentSubjectMap = new Map<string, any[]>();

    for (const [compKey, records] of Array.from(studentCompGroupMap.entries())) {
      const first = records[0];
      let finalPercent: number | null = null;
      let finalAchieved: number | null = null;
      let finalMax: number | null = null;
      let finalSource = first.calculationSource || "SYSTEM_CALCULATED";

      const validPercents = records
        .map((r) => r.competencyPercent)
        .filter((p) => p !== null && p !== undefined) as number[];

      if (validPercents.length > 0) {
        const sum = validPercents.reduce((a, b) => a + b, 0);
        finalPercent = Math.round((sum / validPercents.length) * 100) / 100;
      }

      const validAchieved = records.map((r) => r.achievedScore).filter((s) => s !== null) as number[];
      const validMax = records.map((r) => r.maxScore).filter((s) => s !== null) as number[];
      if (validAchieved.length > 0 && validMax.length > 0) {
        finalAchieved = Math.round((validAchieved.reduce((a, b) => a + b, 0) / validAchieved.length) * 100) / 100;
        finalMax = Math.round((validMax.reduce((a, b) => a + b, 0) / validMax.length) * 100) / 100;
      }

      if (records.length > 1) {
        finalSource = "AVERAGED_COMPONENTS";
      }

      assessmentRecordsToInsert.push({
        id: crypto.randomUUID(),
        batchId: batch.id,
        studentId: first.studentId,
        subjectId: first.subjectId,
        competencyId: first.competencyId,
        academicYearId: batch.academicYearId,
        semester: batch.semester,
        assessmentPeriod: batch.assessmentPeriod,
        achievedScore: finalAchieved,
        maxScore: finalMax,
        competencyPercent: finalPercent !== null ? finalPercent : 0,
        calculationSource: finalSource,
      });

      const subjectGroupKey = first.studentId + "_" + first.subjectId;
      if (!studentSubjectMap.has(subjectGroupKey)) {
        studentSubjectMap.set(subjectGroupKey, []);
      }
      studentSubjectMap.get(subjectGroupKey)!.push({
        competencyId: first.competencyId,
        competencyPercent: finalPercent,
        achievedScore: finalAchieved,
        maxScore: finalMax,
        calculationSource: finalSource,
      });
    }

    // 2. Compute Subject Summaries in memory
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

    // 3. Fast Bulk Transaction
    await prisma.$transaction(async (tx) => {
      // Delete existing records in scope
      const studentIds = Array.from(new Set(assessmentRecordsToInsert.map((r) => r.studentId as string)));
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

      // Bulk create assessments in chunks of 1500
      const BATCH_SIZE = 1500;
      for (let i = 0; i < assessmentRecordsToInsert.length; i += BATCH_SIZE) {
        const chunk = assessmentRecordsToInsert.slice(i, i + BATCH_SIZE);
        await tx.studentCompetencyAssessment.createMany({
          data: chunk,
        });
      }

      // Bulk create summaries in chunks of 1500
      for (let i = 0; i < summariesToInsert.length; i += BATCH_SIZE) {
        const chunk = summariesToInsert.slice(i, i + BATCH_SIZE);
        await tx.studentSubjectCompetencySummary.createMany({
          data: chunk,
        });
      }

      // Update ImportBatch
      await tx.importBatch.update({
        where: { id: batch.id },
        data: {
          status: "COMMITTED",
          totalRows: stagingRecords.length,
          validRows: assessmentRecordsToInsert.length,
        },
      });
    }, { timeout: 45000 });

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