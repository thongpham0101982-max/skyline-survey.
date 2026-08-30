// @ts-nocheck
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import {
  resolveSubjectMatch,
  resolveCompetencyMatch,
  calculateCompetencyScore,
} from "@/lib/competency-service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      batchId,
      rows,
      mapping,
      assessmentPeriod,
      academicYearId,
      isFirstChunk = true,
      isLastChunk = true,
      chunkIndex = 0,
      totalChunks = 1,
      startIndex = 0,
    } = body;

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

    if (isFirstChunk) {
      await prisma.stagingCompetencyAssessment.deleteMany({
        where: { batchId },
      });
    }

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

    const studentMap = new Map<string, any>();
    students.forEach((s) => {
      if (s.studentCode) {
        studentMap.set(s.studentCode.trim().toLowerCase(), s);
      }
    });

    const existingSet = new Set<string>();
    existingAssessments.forEach((e) => {
      existingSet.add(e.studentId + "_" + e.subjectId + "_" + e.competencyId);
    });

    const stagingData: any[] = [];
    const getColVal = (row: any, key: string) => {
      const colName = mapping[key];
      if (!colName) return "";
      return row[colName] !== undefined && row[colName] !== null ? String(row[colName]).trim() : "";
    };

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const rowNum = (startIndex || 0) + i + 1;

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
        if (existingSet.has(uniqueKey)) {
          isDuplicate = true;
          warnings.push("Phát hiện bản ghi đã có sẵn trong hệ thống");
        }
      }

      let validationStatus = "VALID";
      if (errors.length > 0) {
        validationStatus = "ERROR";
      } else if (isDuplicate) {
        validationStatus = "DUPLICATE";
      } else if (warnings.length > 0) {
        validationStatus = "WARNING";
      }

      const errorMessages =
        errors.length > 0 || warnings.length > 0
          ? JSON.stringify({ errors, warnings })
          : null;

      stagingData.push({
        batchId: batch.id,
        rowNumber: rowNum,
        rawYear: rawYear || null,
        rawStudentCode: rawCode || null,
        rawStudentName: rawName || null,
        rawClass: rawClass || null,
        rawSubject: rawSub || null,
        rawCompetency: rawComp || null,
        rawAchievedScore: rawAchieved || null,
        rawMaxScore: rawMax || null,
        rawRadarPercent: rawRadar || null,
        studentId,
        subjectId,
        competencyId,
        achievedScore: scoreResult.achievedScore,
        maxScore: scoreResult.maxScore,
        competencyPercent: scoreResult.competencyPercent,
        calculationSource: scoreResult.calculationSource,
        validationStatus,
        errorMessages,
        isDuplicate,
      });
    }

    if (stagingData.length > 0) {
      await prisma.stagingCompetencyAssessment.createMany({
        data: stagingData,
      });
    }

    if (!isLastChunk) {
      return NextResponse.json({
        success: true,
        chunkIndex,
        totalChunks,
        processedRows: rows.length,
      });
    }

    const [totalRows, validRows, warningRows, errorRows, duplicateRows] = await Promise.all([
      prisma.stagingCompetencyAssessment.count({ where: { batchId } }),
      prisma.stagingCompetencyAssessment.count({ where: { batchId, validationStatus: "VALID" } }),
      prisma.stagingCompetencyAssessment.count({ where: { batchId, validationStatus: "WARNING" } }),
      prisma.stagingCompetencyAssessment.count({ where: { batchId, validationStatus: "ERROR" } }),
      prisma.stagingCompetencyAssessment.count({ where: { batchId, validationStatus: "DUPLICATE" } }),
    ]);

    const needReviewRows = await prisma.stagingCompetencyAssessment.count({
      where: {
        batchId,
        OR: [
          { competencyPercent: null },
          { competencyId: null },
        ],
      },
    });

    const sampleIssues = await prisma.stagingCompetencyAssessment.findMany({
      where: {
        batchId,
        validationStatus: { in: ["ERROR", "WARNING", "DUPLICATE"] },
      },
      take: 100,
      orderBy: { rowNumber: "asc" },
    });

    const formattedIssues = sampleIssues.map((s) => {
      let parsed = { errors: [], warnings: [] };
      if (s.errorMessages) {
        try {
          parsed = JSON.parse(s.errorMessages);
        } catch (_) {}
      }
      return {
        rowNumber: s.rowNumber,
        studentCode: s.rawStudentCode,
        studentName: s.rawStudentName,
        className: s.rawClass,
        subject: s.rawSubject,
        competency: s.rawCompetency,
        achievedScore: s.rawAchievedScore,
        maxScore: s.rawMaxScore,
        radarPercent: s.rawRadarPercent,
        calculatedPercent: s.competencyPercent,
        status: s.validationStatus,
        errors: parsed.errors || [],
        warnings: parsed.warnings || [],
        calculationSource: s.calculationSource,
        subjectId: s.subjectId,
        competencyId: s.competencyId,
      };
    });

    const stats = {
      totalRows,
      validRows,
      warningRows,
      errorRows,
      duplicateRows,
      needReviewRows,
    };

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        totalRows,
        validRows,
        warningRows,
        errorRows,
        duplicateRows,
        status: "STAGED",
      },
    });

    return NextResponse.json({
      success: true,
      stats,
      sampleIssues: formattedIssues,
      hasErrors: errorRows > 0,
      hasWarnings: warningRows > 0,
      hasDuplicates: duplicateRows > 0,
    });
  } catch (error: any) {
    console.error("Validation error:", error);
    return NextResponse.json({ error: error.message || "Lỗi xử lý kiểm tra" }, { status: 500 });
  }
}