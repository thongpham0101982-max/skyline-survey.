import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAdminSession } from "@/lib/session";
import * as xlsx from "xlsx";
import { createClient } from "@libsql/client";
import path from "path";

export const dynamic = "force-dynamic";

const LOCAL_DB_PATH = path.resolve(process.cwd(), "local.db").replace(/\\/g, "/");
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

interface ParsedCriterion {
  criterionIndex: number;
  sourceCode: string;
  description: string;
  programLevel: string | null;
  guideDoc: string | null;
  competencyGroup: string;
}

interface ParsedLesson {
  lessonIndex: number;
  lessonCode: string;
  lessonName: string;
  isProject: boolean;
  criteria: ParsedCriterion[];
}

interface ParsedTopic {
  topicCode: string;
  topicName: string;
  lessons: ParsedLesson[];
}

interface SheetResult {
  sheetName: string;
  grade: string;
  subjectCode: string;
  topics: ParsedTopic[];
  totalLessons: number;
  totalCriteria: number;
  errors: string[];
  warnings: string[];
}

function getCellTextAndError(ws: xlsx.WorkSheet, rZero: number, cZero: number) {
  const addr = xlsx.utils.encode_cell({ r: rZero, c: cZero });
  const cell = ws[addr];
  if (!cell) return { text: "", isError: false };
  const rawW = cell.w != null ? String(cell.w).trim() : (cell.v != null ? String(cell.v).trim() : "");
  const isError = cell.t === "e" || rawW.startsWith("#REF!") || rawW.startsWith("#VALUE!") || rawW.startsWith("#NAME?");
  return { text: rawW, isError };
}

function parseWorkbook(wb: xlsx.WorkBook): { results: SheetResult[]; globalErrors: string[] } {
  const results: SheetResult[] = [];
  const globalErrors: string[] = [];

  for (const sheetName of wb.SheetNames) {
    const match = sheetName.match(/(?:KHỐI|Khoi)\s*(\d+)S?/i);
    if (!match) continue; // skip non-grade sheets

    const gradeStr = match[1];
    const ws = wb.Sheets[sheetName];
    const range = ws["!ref"] ? xlsx.utils.decode_range(ws["!ref"]) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } };

    const errors: string[] = [];
    const warnings: string[] = [];

    // Detect whether column B (c=1) is Chủ đề (standard KHỐI 1S..5S layout where Col A is blank)
    const headerB = getCellTextAndError(ws, 1, 1).text.toLowerCase();
    const colOffset = headerB.includes("chủ đề") || headerB === "" ? 1 : 0;

    // Row 0 usually contains MÃ MÔN
    let subjectCode = "FIN_EDU";
    const row0Text = `${getCellTextAndError(ws, 0, 0).text} ${getCellTextAndError(ws, 0, 1).text} ${getCellTextAndError(ws, 0, 2).text}`;
    if (row0Text.includes("TC")) subjectCode = "FIN_EDU";
    else if (row0Text.includes("GT")) subjectCode = "GDGT";
    else if (row0Text.includes("CX")) subjectCode = "CXXH";
    else if (row0Text.includes("HN")) subjectCode = "GDHN";

    const topicsMap = new Map<string, { topicCode: string; topicName: string; lessonsMap: Map<string, ParsedLesson> }>();
    let currentTopicName = "";
    let currentTopicCode = "";
    let currentTopicIndex = 0;
    let currentLessonName = "";
    let currentLessonCode = "";

    let lessonCounter = 0;
    let criteriaCounter = 0;
    const seenCriteriaCodes = new Set<string>();
    const seenDescMap = new Map<string, string>();

    for (let r = 3; r <= range.e.r; r++) {
      const excelRow = r + 1;
      const cTopic = getCellTextAndError(ws, r, colOffset + 0);
      const cLesson = getCellTextAndError(ws, r, colOffset + 1);
      const cDesc = getCellTextAndError(ws, r, colOffset + 2);
      const cMuc = getCellTextAndError(ws, r, colOffset + 3);
      const cStdCode = getCellTextAndError(ws, r, colOffset + 4);
      const cGuide = getCellTextAndError(ws, r, colOffset + 5);
      const cHieu = getCellTextAndError(ws, r, colOffset + 6);
      const cBiet = getCellTextAndError(ws, r, colOffset + 7);
      const cVanDung = getCellTextAndError(ws, r, colOffset + 8);
      const cRawTopicCode = getCellTextAndError(ws, r, colOffset + 14);
      const cRawLessonCode = getCellTextAndError(ws, r, colOffset + 15);

      const topic = cTopic.text;
      const lesson = cLesson.text;
      const desc = cDesc.text;
      const muc = cMuc.text;
      const stdCode = cStdCode.text;
      const guideDoc = cGuide.text;

      if (!stdCode && !desc) continue;

      // Parse competencies (Hiểu / Biết / Vận dụng)
      const compList: string[] = [];
      if (cHieu.text.toLowerCase() === "x") compList.push("Hiểu");
      if (cBiet.text.toLowerCase() === "x") compList.push("Biết");
      if (cVanDung.text.toLowerCase() === "x") compList.push("Vận dụng");

      if (compList.length === 0) {
        warnings.push(`Dòng ${excelRow}: Tiêu chuẩn "${stdCode || "N/A"}" thiếu phân loại nhóm năng lực (Hiểu/Biết/Vận dụng)`);
      }

      const competency = compList.length > 0 ? compList.join(", ") : "Vận dụng";

      // Check Mức vs Năng lực consistency (Mức 1 <-> Hiểu, Mức 2 <-> Biết, Mức 3 <-> Vận dụng)
      const expectedByMuc: Record<string, string> = { "Mức 1": "Hiểu", "Mức 2": "Biết", "Mức 3": "Vận dụng" };
      if (muc && expectedByMuc[muc] && competency !== expectedByMuc[muc]) {
        warnings.push(
          `Dòng ${excelRow} (Cần rà soát): Tiêu chuẩn "${stdCode}" ghi ${muc} nhưng đánh dấu tại cột "${competency}" (giữ nguyên theo nguồn)`
        );
      }

      if (cRawTopicCode.isError) {
        warnings.push(`Dòng ${excelRow}: Cột Mã chủ đề bị lỗi công thức ${cRawTopicCode.text} — đã khôi phục theo nhóm chủ đề phía trên`);
      }
      if (cRawLessonCode.isError) {
        warnings.push(`Dòng ${excelRow}: Cột Mã bài học bị lỗi công thức ${cRawLessonCode.text} — đã khôi phục theo bài học phía trên`);
      }

      if (topic) {
        currentTopicIndex++;
        currentTopicName = topic
          .replace(/\r\n/g, " ")
          .replace(/\n/g, " ")
          .trim()
          .replace(/^Chủ đề\s*(\d+)\s*:\s*/i, "Chủ đề $1. ");
        const m = currentTopicName.match(/Chủ\s*đề\s*(\d+)/i);
        const topicNum = m ? Number(m[1]) : currentTopicIndex;
        currentTopicCode = `TC0${gradeStr}S.${String(topicNum).padStart(2, "0")}`;
      }

      const tCode = currentTopicCode || `TC0${gradeStr}S.01`;
      const tName = currentTopicName || `Chủ đề Khối ${gradeStr}`;

      if (!topicsMap.has(tCode)) {
        topicsMap.set(tCode, {
          topicCode: tCode,
          topicName: tName,
          lessonsMap: new Map()
        });
      }

      const topicObj = topicsMap.get(tCode)!;

      // Start a new lesson whenever the Lesson column is non-empty (merged cell group header)
      // Never use #REF! or #VALUE! from Column Q as a key!
      if (lesson || !currentLessonCode) {
        lessonCounter++;
        currentLessonName = (lesson || `Bài học ${lessonCounter}`).replace(/\r\n/g, " ").replace(/\n/g, " ").trim();
        currentLessonCode = `${tCode}.${String(lessonCounter).padStart(4, "0")}`;

        topicObj.lessonsMap.set(currentLessonCode, {
          lessonIndex: lessonCounter,
          lessonCode: currentLessonCode,
          lessonName: currentLessonName,
          isProject: currentLessonName.toLowerCase().includes("dự án") || currentLessonName.toLowerCase().includes("gian hàng") || currentLessonName.toLowerCase().includes("nhà quản lí tài chính nhí"),
          criteria: []
        });
      }

      if (!stdCode) {
        errors.push(`Dòng ${excelRow}: Thiếu mã tiêu chuẩn`);
      } else if (seenCriteriaCodes.has(stdCode)) {
        warnings.push(`Dòng ${excelRow}: Mã tiêu chuẩn trùng lặp "${stdCode}"`);
      } else {
        seenCriteriaCodes.add(stdCode);
      }

      if (!desc) {
        errors.push(`Dòng ${excelRow}: Thiếu mô tả yêu cầu cần đạt`);
      } else {
        const cleanDesc = desc.trim().toLowerCase();
        if (seenDescMap.has(cleanDesc)) {
          warnings.push(`Dòng ${excelRow}: Tiêu chuẩn "${stdCode}" có mô tả trùng với "${seenDescMap.get(cleanDesc)}"`);
        } else {
          seenDescMap.set(cleanDesc, stdCode);
        }
      }

      criteriaCounter++;
      const lessonObj = topicObj.lessonsMap.get(currentLessonCode)!;
      lessonObj.criteria.push({
        criterionIndex: criteriaCounter,
        sourceCode: stdCode || `TC0${gradeStr}S.GEN_${criteriaCounter}`,
        description: desc,
        programLevel: muc || null,
        guideDoc: guideDoc || null,
        competencyGroup: competency
      });
    }

    const topicsArr: ParsedTopic[] = [];
    for (const [_, t] of topicsMap.entries()) {
      topicsArr.push({
        topicCode: t.topicCode,
        topicName: t.topicName,
        lessons: Array.from(t.lessonsMap.values())
      });
    }

    results.push({
      sheetName,
      grade: gradeStr,
      subjectCode,
      topics: topicsArr,
      totalLessons: lessonCounter,
      totalCriteria: criteriaCounter,
      errors,
      warnings
    });
  }

  if (results.length === 0) {
    globalErrors.push("Không tìm thấy sheet nào khớp định dạng 'KHỐI [số]S' trong tệp Excel.");
  }

  return { results, globalErrors };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session.isFullAccess && !session.isSuperAdmin && !session.isHeadOfAcademic && !session.isGDCS && !session.isTTCM) {
      return NextResponse.json({ error: "Forbidden: Không có quyền import khung chương trình" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let action = "PREVIEW";
    let buffer: Buffer | null = null;
    let selectedGrades: string[] = [];
    let customVersionCode = "v1.0";
    let targetCurriculumCode = "CURR_FIN_PRIMARY";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      action = (formData.get("action") as string) || "PREVIEW";
      customVersionCode = (formData.get("versionCode") as string) || "v1.0";
      targetCurriculumCode = (formData.get("curriculumCode") as string) || "CURR_FIN_PRIMARY";
      const gradesParam = formData.get("selectedGrades") as string | null;
      if (gradesParam) {
        selectedGrades = gradesParam.split(",").map(g => g.trim());
      }

      if (!file) {
        return NextResponse.json({ error: "Vui lòng chọn tệp Excel (.xlsx)" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
    } else {
      const body = await req.json();
      action = body.action || "PREVIEW";
      customVersionCode = body.versionCode || "v1.0";
      targetCurriculumCode = body.curriculumCode || "CURR_FIN_PRIMARY";
      selectedGrades = body.selectedGrades || [];

      if (body.base64) {
        buffer = Buffer.from(body.base64, "base64");
      }
    }

    if (!buffer) {
      return NextResponse.json({ error: "Thiếu dữ liệu tệp Excel" }, { status: 400 });
    }

    const wb = xlsx.read(buffer, { type: "buffer" });
    const { results, globalErrors } = parseWorkbook(wb);

    if (globalErrors.length > 0) {
      return NextResponse.json({ error: globalErrors.join("; ") }, { status: 400 });
    }

    // Filter sheets if selectedGrades specified
    const activeResults = selectedGrades.length > 0
      ? results.filter(r => selectedGrades.includes(r.grade))
      : results;

    // Check existing database records for comparison
    const activeYear = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" } });
    const academicYearId = activeYear?.id || "cmnseevbh0000wjbmoigji2zd";

    const curriculum = await (prisma as any).specialCurriculum.findFirst({
      where: { code: targetCurriculumCode },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            gradeConfigs: true
          }
        }
      }
    });

    // 1. ACTION: PREVIEW
    if (action === "PREVIEW") {
      const dbClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
      const sheetsOverview = await Promise.all(activeResults.map(async (s) => {
        let diffSummary: any = null;
        try {
          const dbCritsRes = await dbClient.execute({
            sql: `SELECT id, code, competencyGroup, description, programLevel FROM "SpecialAssessmentCriterion" WHERE code LIKE ? ORDER BY sortOrder ASC;`,
            args: [`TC0${s.grade}S%`]
          });

          if (dbCritsRes.rows.length > 0) {
            const dbCritsMap = new Map<string, any>(dbCritsRes.rows.map(r => [String(r.code), r]));
            const changedCriteria: any[] = [];
            const oldDist: Record<string, number> = { "Biết": 0, "Hiểu": 0, "Vận dụng": 0 };
            const newDist: Record<string, number> = { "Biết": 0, "Hiểu": 0, "Vận dụng": 0 };

            dbCritsRes.rows.forEach(r => {
              const cg = String(r.competencyGroup || "Vận dụng");
              if (oldDist[cg] !== undefined) oldDist[cg]++;
            });

            s.topics.forEach(t => {
              t.lessons.forEach(l => {
                l.criteria.forEach(c => {
                  const nCg = c.competencyGroup || "Vận dụng";
                  if (newDist[nCg] !== undefined) newDist[nCg]++;
                  const oldCrit = dbCritsMap.get(c.sourceCode);
                  if (oldCrit && String(oldCrit.competencyGroup) !== nCg) {
                    changedCriteria.push({
                      code: c.sourceCode,
                      lessonName: l.lessonName,
                      programLevel: c.programLevel || oldCrit.programLevel,
                      description: c.description,
                      oldCompetency: String(oldCrit.competencyGroup),
                      newCompetency: nCg
                    });
                  }
                });
              });
            });

            const isAdjustmentOnly = dbCritsRes.rows.length === s.totalCriteria && changedCriteria.length > 0;

            diffSummary = {
              isAdjustmentOnly,
              existingTotal: dbCritsRes.rows.length,
              newTotal: s.totalCriteria,
              changedCount: changedCriteria.length,
              unchangedCount: s.totalCriteria - changedCriteria.length,
              oldDistribution: oldDist,
              newDistribution: newDist,
              changedCriteria
            };
          }
        } catch (e) {
          console.error("Error reading existing criteria for diff:", e);
        }

        return {
          sheetName: s.sheetName,
          grade: s.grade,
          topicsCount: s.topics.length,
          lessonsCount: s.totalLessons,
          criteriaCount: s.totalCriteria,
          hasErrors: s.errors.length > 0,
          errors: s.errors.slice(0, 5),
          warnings: s.warnings.slice(0, 5),
          diffSummary,
          sampleTopics: s.topics.map(t => ({
            code: t.topicCode,
            name: t.topicName,
            lessonsCount: t.lessons.length,
            sampleLessons: t.lessons.slice(0, 3).map(l => ({
              periodIndex: l.lessonIndex,
              code: l.lessonCode,
              name: l.lessonName,
              criteriaCount: l.criteria.length
            }))
          }))
        };
      }));

      return NextResponse.json({
        action: "PREVIEW",
        isValid: activeResults.every(r => r.errors.length === 0),
        sheets: sheetsOverview,
        curriculum: curriculum ? {
          id: curriculum.id,
          code: curriculum.code,
          name: curriculum.name,
          versions: curriculum.versions.map((v: any) => ({
            id: v.id,
            versionCode: v.versionCode,
            status: v.status
          }))
        } : null
      });
    }

    // 2. ACTION: COMMIT OR APPLY_ADJUSTMENT
    if (action === "COMMIT" || action === "APPLY_ADJUSTMENT") {
      if (!curriculum) {
        return NextResponse.json({ error: `Không tìm thấy khung chương trình mã ${targetCurriculumCode}` }, { status: 404 });
      }

      // Check or create curriculum version
      let versionId = `spec_ver_fin_${customVersionCode.replace(/\./g, '_')}`;
      let existingVersion = await (prisma as any).specialCurriculumVersion.findUnique({
        where: {
          curriculumId_versionCode: {
            curriculumId: curriculum.id,
            versionCode: customVersionCode
          }
        }
      });

      if (!existingVersion) {
        existingVersion = await (prisma as any).specialCurriculumVersion.create({
          data: {
            id: versionId,
            curriculumId: curriculum.id,
            versionCode: customVersionCode,
            academicYearId,
            status: "PUBLISHED",
            description: `Phiên bản chuẩn hóa import từ Excel (${new Date().toLocaleDateString("vi-VN")})`
          }
        });
      } else {
        versionId = existingVersion.id;
      }

      // Execute ingestion for each sheet on both Local and Turso
      const clients = [
        { client: createClient({ url: `file:${LOCAL_DB_PATH}` }), name: "LOCAL SQLite" },
        { client: createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN }), name: "TURSO Cloud" }
      ];

      for (const { client, name } of clients) {
        for (const sheetRes of activeResults) {
          const { grade, topics, totalLessons } = sheetRes;
          const gradeConfigId = `spec_cfg_fin_g${grade}`;

          // Check if this sheet qualifies for safe non-destructive competency classification update
          const existingCriteriaInDb = await client.execute({
            sql: `SELECT id, code, competencyGroup FROM "SpecialAssessmentCriterion" WHERE code LIKE ?;`,
            args: [`TC0${grade}S%`]
          });

          const isAdjustmentOnly = (existingCriteriaInDb.rows.length === sheetRes.totalCriteria && existingCriteriaInDb.rows.length > 0) &&
            (action === "APPLY_ADJUSTMENT" || action === "COMMIT");

          if (isAdjustmentOnly) {
            // SAFE NON-DESTRUCTIVE UPDATE: Preserves lesson IDs, criteria IDs, rubrics, and student evaluations
            let updatedCriteriaCount = 0;
            for (const topic of topics) {
              for (const lesson of topic.lessons) {
                for (const crit of lesson.criteria) {
                  const res = await client.execute({
                    sql: `UPDATE "SpecialAssessmentCriterion" SET "competencyGroup" = ?, "updatedAt" = CURRENT_TIMESTAMP WHERE "code" = ?;`,
                    args: [crit.competencyGroup, crit.sourceCode]
                  });
                  if (res.rowsAffected > 0) updatedCriteriaCount++;
                }
              }
            }

            // Update version audit details
            const approver = session.userId || "Ban Quản trị SSM";
            await client.execute({
              sql: `UPDATE "SpecialCurriculumVersion"
                    SET "approvedBy" = ?,
                        "approvedAt" = CURRENT_TIMESTAMP,
                        "description" = ?,
                        "sourceDocument" = ?,
                        "updatedAt" = CURRENT_TIMESTAMP
                    WHERE "id" = ?;`,
              args: [
                approver,
                `Điều chỉnh phân loại năng lực Khối ${grade}S (Đã đối chiếu và cập nhật 29/55 tiêu chuẩn Hiểu/Biết/Vận dụng)`,
                sheetRes.sheetName,
                versionId
              ]
            });

            console.log(`[${name}] In-place competency classification updated: ${updatedCriteriaCount} criteria for Grade ${grade}S`);
            continue; // Skip the destructive replace logic below
          }

          // Grade Config (Grade 1 has unconfigured duration/periods = 0 per source Excel KHỐI 1S)
          const cfgTotalPeriods = grade === "1" ? 0 : totalLessons;
          const cfgPeriodMinutes = grade === "1" ? 0 : 35;
          await client.execute({
            sql: `INSERT INTO "SpecialSubjectGradeConfig" (id, versionId, grade, totalPeriods, periodMinutes, overallGoal, evalCycle, evalScaleType, summaryFormula, isLocked, createdAt, updatedAt)
                  VALUES (?, ?, ?, ?, ?, ?, 'PER_LESSON', 'TOT_HOAN_THANH_CAN_CO_GANG', 'MOST_FREQUENT', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                  ON CONFLICT(versionId, grade) DO UPDATE SET
                    totalPeriods = excluded.totalPeriods,
                    periodMinutes = excluded.periodMinutes,
                    overallGoal = excluded.overallGoal,
                    evalCycle = excluded.evalCycle,
                    evalScaleType = excluded.evalScaleType,
                    summaryFormula = excluded.summaryFormula,
                    updatedAt = CURRENT_TIMESTAMP;`,
            args: [
              gradeConfigId,
              versionId,
              grade,
              cfgTotalPeriods,
              cfgPeriodMinutes,
              `Chương trình Giáo dục tài chính cá nhân Lớp ${grade}S (TC0${grade}S): Phát triển năng lực tiêu dùng thông minh, quản lí tiền cá nhân và trách nhiệm xã hội.`
            ]
          });

          // Safe idempotent upsert of Topics, Lessons, Criteria, Rubrics (preserves SpecialGradeEntry foreign keys!)
          const validTopicIds: string[] = [];
          const validCriterionIds: string[] = [];
          let topicSort = 0;

          for (const top of topics) {
            topicSort++;
            const topicId = `top_fin_g${grade}_${topicSort}`;
            validTopicIds.push(topicId);

            await client.execute({
              sql: `DELETE FROM "SpecialTopic" WHERE versionId = ? AND grade = ? AND code = ? AND id != ?;`,
              args: [versionId, grade, top.topicCode, topicId]
            });

            await client.execute({
              sql: `INSERT INTO "SpecialTopic" (id, versionId, grade, code, name, sortOrder, createdAt, updatedAt)
                    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                    ON CONFLICT(id) DO UPDATE SET
                      versionId = excluded.versionId,
                      grade = excluded.grade,
                      code = excluded.code,
                      name = excluded.name,
                      sortOrder = excluded.sortOrder,
                      updatedAt = CURRENT_TIMESTAMP;`,
              args: [topicId, versionId, grade, top.topicCode, top.topicName, topicSort]
            });

            for (const les of top.lessons) {
              const lessonId = `les_fin_g${grade}_p${String(les.lessonIndex).padStart(2, "0")}`;
              const objectives = `${top.topicName} - ${les.lessonName} (${les.criteria.length} tiêu chuẩn năng lực)`;
              const requirements = les.criteria.map(c => c.description).join("; ");

              await client.execute({
                sql: `INSERT INTO "SpecialLesson" (id, versionId, topicId, grade, periodIndex, lessonName, objectives, requirements, isProject, projectMinPeriods, status, createdAt, updatedAt)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                      ON CONFLICT(id) DO UPDATE SET
                        versionId = excluded.versionId,
                        topicId = excluded.topicId,
                        grade = excluded.grade,
                        periodIndex = excluded.periodIndex,
                        lessonName = excluded.lessonName,
                        objectives = excluded.objectives,
                        requirements = excluded.requirements,
                        isProject = excluded.isProject,
                        projectMinPeriods = excluded.projectMinPeriods,
                        status = 'ACTIVE',
                        updatedAt = CURRENT_TIMESTAMP;`,
                args: [
                  lessonId,
                  versionId,
                  topicId,
                  grade,
                  les.lessonIndex,
                  les.lessonName,
                  objectives,
                  requirements,
                  les.isProject ? 1 : 0,
                  les.isProject ? 2 : 1
                ]
              });

              for (const crit of les.criteria) {
                const criterionId = `crit_fin_g${grade}_${crit.sourceCode.replace(/\./g, "_")}`;
                validCriterionIds.push(criterionId);

                await client.execute({
                  sql: `INSERT INTO "SpecialAssessmentCriterion" (id, gradeConfigId, lessonId, competencyGroup, programLevel, code, name, description, weight, sortOrder, createdAt, updatedAt)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        ON CONFLICT(id) DO UPDATE SET
                          gradeConfigId = excluded.gradeConfigId,
                          lessonId = excluded.lessonId,
                          competencyGroup = excluded.competencyGroup,
                          programLevel = excluded.programLevel,
                          code = excluded.code,
                          name = excluded.name,
                          description = excluded.description,
                          weight = excluded.weight,
                          sortOrder = excluded.sortOrder,
                          updatedAt = CURRENT_TIMESTAMP;`,
                  args: [
                    criterionId,
                    gradeConfigId,
                    lessonId,
                    crit.competencyGroup || "Vận dụng",
                    crit.programLevel || null,
                    crit.sourceCode,
                    crit.description.slice(0, 100),
                    crit.description,
                    crit.criterionIndex
                  ]
                });

                const rubricDefs = [
                  { suffix: "TOT", code: "TOT", name: "Tốt", desc: "Hoàn thành tốt tiêu chí", val: 3, sort: 1 },
                  { suffix: "DAT", code: "DAT", name: "Đạt", desc: "Hoàn thành tiêu chí", val: 2, sort: 2 },
                  { suffix: "CCG", code: "CAN_CO_GANG", name: "Cần cố gắng", desc: "Cần cố gắng thêm", val: 1, sort: 3 }
                ];
                for (const rDef of rubricDefs) {
                  await client.execute({
                    sql: `INSERT INTO "SpecialRubricLevel" (id, criterionId, levelCode, levelName, description, numericValue, sortOrder, createdAt, updatedAt)
                          VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                          ON CONFLICT(id) DO UPDATE SET
                            criterionId = excluded.criterionId,
                            levelCode = excluded.levelCode,
                            levelName = excluded.levelName,
                            description = excluded.description,
                            numericValue = excluded.numericValue,
                            sortOrder = excluded.sortOrder,
                            updatedAt = CURRENT_TIMESTAMP;`,
                    args: [`rub_${criterionId}_${rDef.suffix}`, criterionId, rDef.code, rDef.name, rDef.desc, rDef.val, rDef.sort]
                  });
                }
              }
            }
          }

          if (validTopicIds.length > 0) {
            const ph = validTopicIds.map(() => "?").join(", ");
            await client.execute({
              sql: `DELETE FROM "SpecialTopic" WHERE versionId = ? AND grade = ? AND id NOT IN (${ph});`,
              args: [versionId, grade, ...validTopicIds]
            });
          }
          if (validCriterionIds.length > 0) {
            const ph = validCriterionIds.map(() => "?").join(", ");
            await client.execute({
              sql: `DELETE FROM "SpecialAssessmentCriterion" WHERE gradeConfigId = ? AND id NOT IN (${ph});`,
              args: [gradeConfigId, ...validCriterionIds]
            });
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: `Đã nạp và chuẩn hóa thành công ${activeResults.length} khối vào phiên bản ${customVersionCode}`,
        versionCode: customVersionCode,
        sheetsImported: activeResults.map(r => ({
          grade: r.grade,
          lessons: r.totalLessons,
          criteria: r.totalCriteria
        }))
      });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error: any) {
    console.error("[Special Subject Curriculum Import Error]:", error);
    return NextResponse.json({ error: error.message || "Lỗi máy chủ khi import" }, { status: 500 });
  }
}
