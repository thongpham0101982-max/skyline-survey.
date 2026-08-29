import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  resolveSubjectMatch,
  resolveCompetencyMatch,
  calculateCompetencyScore,
} from "@/lib/competency-service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { batchId, rows, mapping, assessmentPeriod, academicYearId } = body;

    if (!batchId || !rows || !Array.isArray(rows)) {
      return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
    }

    const batch = await prisma.importBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      return NextResponse.json({ error: "Không tìm thấy đợt import" }, { status: 404 });
    }

    const targetYearId = academicYearId || batch.academicYearId;
    const targetPeriod = assessmentPeriod || batch.assessmentPeriod;

    const [students, subjects, subjectAliases, competencies, compAliases, existingAssessments] =
      await Promise.all([
        prisma.student.findMany({
          select: { id: true, studentCode: true, studentName: true, academicYearId: true },
        }),
        prisma.subject.findMany({
          select: { id: true, subjectCode: true, subjectName: true },
        }),
        prisma.subjectAlias.findMany({
          select: { id: true, subjectId: true, normalizedKey: true },
        }),
        prisma.subjectCompetency.findMany({
          select: { id: true, subjectId: true, code: true, name: true, displayOrder: true, weight: true },
        }),
        prisma.subjectCompetencyAlias.findMany({
          select: { id: true, competencyId: true, normalizedKey: true },
        }),
        prisma.studentCompetencyAssessment.findMany({
          where: { academicYearId: targetYearId, assessmentPeriod: targetPeriod },
          select: { studentId: true, subjectId: true, competencyId: true },
        }),
      ]);

    const studentMap = new Map<string, (typeof students)[0]>();
    students.forEach((s) => {
      studentMap.set(s.studentCode.trim().toLowerCase(), s);
    });

    const existingSet = new Set<string>();
    existingAssessments.forEach((e) => {
      existingSet.add(e.studentId + "_" + e.subjectId + "_" + e.competencyId);
    });

    const batchDuplicateSet = new Set<string>();

    let validCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    let needReviewCount = 0;

    const stagingData: any[] = [];
    const sampleIssues: any[] = [];

    const getColVal = (row: any, key: string) => {
      const colName = mapping[key];
      if (!colName) return "";
      return row[colName] !== undefined && row[colName] !== null ? String(row[colName]).trim() : "";
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = i + 1;

      const rawYear = getColVal(r, "academicYear");
      const rawCode = getColVal(r, "studentCode");
      const rawName = getColVal(r, "studentName");
      const rawClass = getColVal(r, "className");
      const rawSub = getColVal(r, "subjectName");
      const rawComp = getColVal(r, "competencyName");
      const rawAchieved = getColVal(r, "achievedScore");
      const rawMax = getColVal(r, "maxScore");
      const rawRadar = getColVal(r, "radarPercent");

      const errors: string[] = [];
      const warnings: string[] = [];

      let studentId: string | null = null;
      if (!rawCode) {
        errors.push("Thiếu mã học sinh");
      } else {
        const foundStudent = studentMap.get(rawCode.toLowerCase());
        if (!foundStudent) {
          errors.push('Không tìm thấy học sinh có mã "' + rawCode + '" trong hệ thống');
        } else {
          studentId = foundStudent.id;
        }
      }

      let subjectId: string | null = null;
      if (!rawSub) {
        errors.push("Thiếu tên môn học");
      } else {
        subjectId = resolveSubjectMatch(rawSub, subjects, subjectAliases);
        if (!subjectId) {
          errors.push('Môn học "' + rawSub + '" chưa được cấu hình hoặc chưa có alias');
        }
      }

      let competencyId: string | null = null;
      if (!rawComp) {
        warnings.push("Tên năng lực trống (NEED_REVIEW - sẽ không tạo trục radar)");
      } else if (subjectId) {
        competencyId = resolveCompetencyMatch(subjectId, rawComp, competencies, compAliases);
        if (!competencyId) {
          warnings.push('Năng lực "' + rawComp + '" chưa có trong danh mục môn (NEED_REVIEW)');
        }
      }

      const scoreResult = calculateCompetencyScore(rawAchieved, rawMax, rawRadar);

      if (scoreResult.calculationSource === "LEGACY_IMPORTED") {
        warnings.push("Dữ liệu chuyển tiếp lịch sử (tính từ %_ThucTe_Radar, không có điểm tối đa)");
      } else if (scoreResult.competencyPercent === null && competencyId) {
        warnings.push("Chưa có điểm đánh giá (NULL - không tính vào radar)");
      }

      let isDuplicate = false;
      if (studentId && subjectId && competencyId) {
        const uniqueKey = studentId + "_" + subjectId + "_" + competencyId;
        if (batchDuplicateSet.has(uniqueKey) || existingSet.has(uniqueKey)) {
          isDuplicate = true;
          warnings.push("Phát hiện bản ghi trùng lặp trong đợt hoặc đã có trong hệ thống");
          duplicateCount++;
        } else {
          batchDuplicateSet.add(uniqueKey);
        }
      }

      let status = "VALID";
      if (errors.length > 0) {
        status = "ERROR";
        errorCount++;
      } else if (isDuplicate) {
        status = "DUPLICATE";
      } else if (!competencyId) {
        status = "NEED_REVIEW";
        needReviewCount++;
      } else if (warnings.length > 0) {
        status = "WARNING";
        warningCount++;
      } else {
        validCount++;
      }

      const stagingItem = {
        batchId,
        rowNumber: rowNum,
        rawYear,
        rawStudentCode: rawCode,
        rawStudentName: rawName,
        rawClass,
        rawSubject: rawSub,
        rawCompetency: rawComp,
        rawAchievedScore: rawAchieved,
        rawMaxScore: rawMax,
        rawRadarPercent: rawRadar,
        studentId,
        subjectId,
        competencyId,
        achievedScore: scoreResult.achievedScore,
        maxScore: scoreResult.maxScore,
        competencyPercent: scoreResult.competencyPercent,
        calculationSource: scoreResult.calculationSource,
        validationStatus: status,
        errorMessages: JSON.stringify([...errors, ...warnings]),
      };

      stagingData.push(stagingItem);

      if (status !== "VALID" && sampleIssues.length < 50) {
        sampleIssues.push({
          rowNumber: rowNum,
          studentCode: rawCode,
          studentName: rawName,
          subject: rawSub,
          competency: rawComp,
          status,
          errors,
          warnings,
        });
      }
    }

    await prisma.stagingCompetencyAssessment.deleteMany({ where: { batchId } });

    const CHUNK_SIZE = 1000;
    for (let i = 0; i < stagingData.length; i += CHUNK_SIZE) {
      const chunk = stagingData.slice(i, i + CHUNK_SIZE);
      await prisma.stagingCompetencyAssessment.createMany({
        data: chunk,
      });
    }

    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        academicYearId: targetYearId,
        assessmentPeriod: targetPeriod,
        totalRows: rows.length,
        validRows: validCount,
        warningRows: warningCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
      },
    });

    return NextResponse.json({
      success: true,
      batchId,
      stats: {
        totalRows: rows.length,
        validRows: validCount,
        warningRows: warningCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
        needReviewRows: needReviewCount,
      },
      sampleIssues,
    });
  } catch (error: any) {
    console.error("Validation error:", error);
    return NextResponse.json({ error: error.message || "Lỗi kiểm tra dữ liệu" }, { status: 500 });
  }
}