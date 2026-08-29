import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { synthesizeSubjectSummary } from "@/lib/competency-service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
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

    await prisma.$transaction(async (tx) => {
      for (const record of stagingRecords) {
        if (!record.studentId || !record.subjectId || !record.competencyId) continue;

        const assessmentData = {
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
        };

        if (duplicateAction === "OVERWRITE") {
          await tx.studentCompetencyAssessment.upsert({
            where: {
              unique_competency_assessment_entry: {
                academicYearId: batch.academicYearId,
                studentId: record.studentId,
                subjectId: record.subjectId,
                competencyId: record.competencyId,
                assessmentPeriod: batch.assessmentPeriod,
              },
            },
            create: assessmentData,
            update: assessmentData,
          });
        } else {
          const existing = await tx.studentCompetencyAssessment.findUnique({
            where: {
              unique_competency_assessment_entry: {
                academicYearId: batch.academicYearId,
                studentId: record.studentId,
                subjectId: record.subjectId,
                competencyId: record.competencyId,
                assessmentPeriod: batch.assessmentPeriod,
              },
            },
          });
          if (!existing) {
            await tx.studentCompetencyAssessment.create({
              data: assessmentData,
            });
          }
        }

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

      for (const [groupKey, assessments] of Array.from(studentSubjectMap.entries())) {
        const [studentId, subjectId] = groupKey.split("_");
        const subjectComps = allCompetencies.filter((c) => c.subjectId === subjectId);

        const summary = synthesizeSubjectSummary(subjectComps, assessments);

        await tx.studentSubjectCompetencySummary.upsert({
          where: {
            academicYearId_studentId_subjectId_assessmentPeriod: {
              academicYearId: batch.academicYearId,
              studentId,
              subjectId,
              assessmentPeriod: batch.assessmentPeriod,
            },
          },
          create: {
            studentId,
            subjectId,
            academicYearId: batch.academicYearId,
            semester: batch.semester,
            assessmentPeriod: batch.assessmentPeriod,
            subjectScore: summary.subjectScore,
            evaluatedCount: summary.evaluatedCount,
            totalCompetencies: summary.totalCompetencies,
            radarData: JSON.stringify(summary.radarData),
          },
          update: {
            subjectScore: summary.subjectScore,
            evaluatedCount: summary.evaluatedCount,
            totalCompetencies: summary.totalCompetencies,
            radarData: JSON.stringify(summary.radarData),
          },
        });
      }

      await tx.importBatch.update({
        where: { id: batch.id },
        data: {
          status: "COMMITTED",
        },
      });
    });

    return NextResponse.json({
      success: true,
      committedCount: stagingRecords.length,
      summariesCount: studentSubjectMap.size,
      message: "Đã import thành công " + stagingRecords.length + " bản ghi đánh giá năng lực!",
    });
  } catch (error: any) {
    console.error("Commit error:", error);
    return NextResponse.json({ error: error.message || "Lỗi lưu dữ liệu" }, { status: 500 });
  }
}