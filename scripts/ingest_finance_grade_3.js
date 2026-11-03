const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const EXCEL_PATH = path.resolve(__dirname, '../docs/PPCT_MON_GIAO_DUC_TAI_CHINH_3S.xlsx');
const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";
const ACADEMIC_YEAR_ID = 'cmnseevbh0000wjbmoigji2zd';

console.log('Reading Excel file:', EXCEL_PATH);
const wb = xlsx.readFile(EXCEL_PATH);

function parseGrade3Sheet() {
  const ws = wb.Sheets['KHỐI 3S'] || wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error('Sheet KHỐI 3S not found in Excel!');
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

  const topicsMap = new Map();
  let currentTopicName = '';
  let currentTopicCode = '';
  let currentLessonName = '';
  let currentLessonCode = '';

  let lessonCounter = 0;
  let criteriaCounter = 0;

  const seenCriteriaCodes = new Set();
  const duplicateCodes = [];
  const missingCompetencyWarnings = [];
  const multiCompetencyList = [];
  const descMap = new Map();
  const duplicateDescWarnings = [];

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] || [];
    const topic = r[0] != null ? String(r[0]).trim() : '';
    const lesson = r[1] != null ? String(r[1]).trim() : '';
    const desc = r[2] != null ? String(r[2]).trim() : '';
    const muc = r[3] != null ? String(r[3]).trim() : '';
    const stdCode = r[4] != null ? String(r[4]).trim() : '';
    const guideDoc = r[5] != null ? String(r[5]).trim() : '';

    if (!stdCode && !desc) continue;

    // Parse Competencies (Columns 6, 7, 8)
    const compList = [];
    if (r[6] && String(r[6]).trim().toLowerCase() === 'x') compList.push('Hiểu');
    if (r[7] && String(r[7]).trim().toLowerCase() === 'x') compList.push('Biết');
    if (r[8] && String(r[8]).trim().toLowerCase() === 'x') compList.push('Vận dụng');

    if (compList.length === 0) {
      missingCompetencyWarnings.push({
        line: i + 1,
        code: stdCode,
        desc: desc
      });
    }

    if (compList.length > 1) {
      multiCompetencyList.push({
        line: i + 1,
        code: stdCode,
        competencies: compList.join(', ')
      });
    }

    // Default competency if missing
    const competencyStr = compList.length > 0 ? compList.join(', ') : 'Vận dụng (Mặc định do thiếu phân loại)';

    // Topic detection from Col 0 (Chủ đề X)
    if (topic) {
      currentTopicName = topic.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
      const m = currentTopicName.match(/Chủ\s*đề\s*(\d+)/i);
      currentTopicCode = m ? `TC03S.${String(m[1]).padStart(2, '0')}` : (r[14] ? String(r[14]).trim() : 'TC03S.01');
    }
    if (!currentTopicCode) currentTopicCode = 'TC03S.01';

    // Lesson detection from Col 1
    if (lesson) {
      lessonCounter++;
      currentLessonName = lesson.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
      currentLessonCode = `${currentTopicCode}.${String(lessonCounter).padStart(4, '0')}`;
    }

    // Duplicate code check
    if (seenCriteriaCodes.has(stdCode)) {
      duplicateCodes.push({ line: i + 1, code: stdCode });
    } else {
      seenCriteriaCodes.add(stdCode);
    }

    // Duplicate description check
    const cleanDesc = desc.trim().toLowerCase();
    if (descMap.has(cleanDesc)) {
      duplicateDescWarnings.push({
        line: i + 1,
        code: stdCode,
        duplicateWith: descMap.get(cleanDesc),
        desc: desc
      });
    } else {
      descMap.set(cleanDesc, stdCode);
    }

    if (!topicsMap.has(currentTopicCode)) {
      topicsMap.set(currentTopicCode, {
        topicCode: currentTopicCode,
        topicName: currentTopicName,
        lessons: new Map()
      });
    }

    const topicObj = topicsMap.get(currentTopicCode);
    if (!topicObj.lessons.has(currentLessonCode)) {
      topicObj.lessons.set(currentLessonCode, {
        lessonIndex: lessonCounter,
        lessonCode: currentLessonCode,
        lessonName: currentLessonName,
        isProject: currentLessonName.toLowerCase().includes('dự án') || currentLessonName.toLowerCase().includes('gian hàng') || currentLessonName.toLowerCase().includes('quản lý tài chính nhỏ tuổi'),
        criteria: []
      });
    }

    const lessonObj = topicObj.lessons.get(currentLessonCode);
    lessonObj.criteria.push({
      criterionIndex: lessonObj.criteria.length + 1,
      sourceCode: stdCode,
      description: desc,
      programLevel: muc || null,
      guideDoc: guideDoc || null,
      competencyGroup: competencyStr
    });

    criteriaCounter++;
  }

  return {
    grade: '3',
    sheetName: 'KHỐI 3S',
    topicsMap,
    totalLessons: lessonCounter,
    totalCriteria: criteriaCounter,
    duplicateCodes,
    duplicateDescWarnings,
    missingCompetencyWarnings,
    multiCompetencyList
  };
}

const parsedGrade3 = parseGrade3Sheet();

console.log(`\n=== KẾT QUẢ PHÂN TÍCH DỮ LIỆU EXCEL KHỐI 3S ===`);
console.log(`- Số lượng Chủ đề: ${parsedGrade3.topicsMap.size}`);
for (const [k, v] of parsedGrade3.topicsMap.entries()) {
  console.log(`  * [${k}] ${v.topicName} (${v.lessons.size} bài)`);
}
console.log(`- Số lượng Bài học: ${parsedGrade3.totalLessons}`);
console.log(`- Số lượng Tiêu chuẩn năng lực: ${parsedGrade3.totalCriteria}`);
console.log(`- Trùng mã tiêu chuẩn: ${parsedGrade3.duplicateCodes.length}`);
console.log(`- Tiêu chuẩn có NHIỀU nhóm năng lực: ${parsedGrade3.multiCompetencyList.length}`);
for (const mc of parsedGrade3.multiCompetencyList) {
  console.log(`  * [${mc.code}] (Dòng ${mc.line}): Nhóm năng lực: ${mc.competencies}`);
}
console.log(`- Cảnh báo tiêu chuẩn THIẾU phân loại năng lực: ${parsedGrade3.missingCompetencyWarnings.length}`);
for (const mcw of parsedGrade3.missingCompetencyWarnings) {
  console.log(`  * [${mcw.code}] (Dòng ${mcw.line}): "${mcw.desc}"`);
}

async function ingestGrade3OnClient(client, parsedData, dbName) {
  const { grade, topicsMap, totalLessons, totalCriteria } = parsedData;
  const versionId = 'spec_ver_fin_v1_0';
  const gradeConfigId = `spec_cfg_fin_g${grade}`;

  console.log(`\n[${dbName}] Ingesting Grade ${grade} (${totalLessons} lessons, ${totalCriteria} criteria)...`);

  // 1. Update/Upsert SpecialSubjectGradeConfig
  await client.execute({
    sql: `INSERT INTO "SpecialSubjectGradeConfig" (id, versionId, grade, totalPeriods, periodMinutes, overallGoal, evalCycle, evalScaleType, summaryFormula, isLocked, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, 35, ?, 'PER_LESSON', 'TOT_HOAN_THANH_CAN_CO_GANG', 'MOST_FREQUENT', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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
      totalLessons,
      `Chương trình Giáo dục tài chính cá nhân Lớp 3S: Giúp học sinh bước đầu hiểu vai trò của tiền trong cuộc sống; biết trân trọng giá trị sức lao động; hình thành thói quen chi tiêu thông minh, ghi chép thu-chi và thực hành tiết kiệm.`
    ]
  });

  // 2. Clean old placeholder lessons & criteria for Grade 3 in this version
  const existingLessons = await client.execute({
    sql: `SELECT id FROM "SpecialLesson" WHERE versionId = ? AND grade = ?;`,
    args: [versionId, grade]
  });

  for (const lRow of existingLessons.rows) {
    const lId = String(lRow.id);
    const crits = await client.execute({
      sql: `SELECT id FROM "SpecialAssessmentCriterion" WHERE lessonId = ?;`,
      args: [lId]
    });
    for (const cRow of crits.rows) {
      await client.execute({
        sql: `DELETE FROM "SpecialRubricLevel" WHERE criterionId = ?;`,
        args: [String(cRow.id)]
      });
    }
    await client.execute({
      sql: `DELETE FROM "SpecialAssessmentCriterion" WHERE lessonId = ?;`,
      args: [lId]
    });
  }

  // Also clean any criteria attached directly to gradeConfigId
  const configCrits = await client.execute({
    sql: `SELECT id FROM "SpecialAssessmentCriterion" WHERE gradeConfigId = ?;`,
    args: [gradeConfigId]
  });
  for (const cRow of configCrits.rows) {
    await client.execute({
      sql: `DELETE FROM "SpecialRubricLevel" WHERE criterionId = ?;`,
      args: [String(cRow.id)]
    });
  }
  await client.execute({
    sql: `DELETE FROM "SpecialAssessmentCriterion" WHERE gradeConfigId = ?;`,
    args: [gradeConfigId]
  });

  // Delete existing lessons and topics for this grade
  await client.execute({
    sql: `DELETE FROM "SpecialLesson" WHERE versionId = ? AND grade = ?;`,
    args: [versionId, grade]
  });
  await client.execute({
    sql: `DELETE FROM "SpecialTopic" WHERE versionId = ? AND grade = ?;`,
    args: [versionId, grade]
  });

  // 3. Insert Topics, Lessons, Criteria, Rubric Levels
  let topicSort = 0;
  let insertedLessons = 0;
  let insertedCriteria = 0;

  for (const [tCode, tObj] of topicsMap.entries()) {
    topicSort++;
    const topicId = `top_fin_g${grade}_${topicSort}`;

    await client.execute({
      sql: `INSERT INTO "SpecialTopic" (id, versionId, grade, code, name, sortOrder, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      args: [topicId, versionId, grade, tObj.topicCode, tObj.topicName, topicSort]
    });

    for (const [lCode, lObj] of tObj.lessons.entries()) {
      const lessonId = `les_fin_g${grade}_p${String(lObj.lessonIndex).padStart(2, '0')}`;
      const objectives = `${tObj.topicName} - ${lObj.lessonName} (${lObj.criteria.length} tiêu chuẩn năng lực)`;
      const requirements = lObj.criteria.map(c => c.description).join('; ');

      await client.execute({
        sql: `INSERT INTO "SpecialLesson" (id, versionId, topicId, grade, periodIndex, lessonName, objectives, requirements, isProject, projectMinPeriods, status, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
        args: [
          lessonId,
          versionId,
          topicId,
          grade,
          lObj.lessonIndex,
          lObj.lessonName,
          objectives,
          requirements,
          lObj.isProject ? 1 : 0,
          lObj.isProject ? 2 : 1
        ]
      });
      insertedLessons++;

      for (const crit of lObj.criteria) {
        const criterionId = `crit_fin_g${grade}_${crit.sourceCode.replace(/\./g, '_')}`;
        await client.execute({
          sql: `INSERT INTO "SpecialAssessmentCriterion" (id, gradeConfigId, lessonId, competencyGroup, programLevel, code, name, description, weight, sortOrder, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
          args: [
            criterionId,
            gradeConfigId,
            lessonId,
            crit.competencyGroup,
            crit.programLevel || null,
            crit.sourceCode,
            crit.description.slice(0, 100),
            crit.description,
            crit.criterionIndex
          ]
        });
        insertedCriteria++;

        // 3 Rubrics: TOT (3), DAT (2), CAN_CO_GANG (1)
        await client.execute({
          sql: `INSERT INTO "SpecialRubricLevel" (id, criterionId, levelCode, levelName, description, numericValue, sortOrder, createdAt, updatedAt)
                VALUES (?, ?, 'TOT', 'Tốt', 'Hoàn thành tốt tiêu chí', 3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
          args: [`rub_${criterionId}_TOT`, criterionId]
        });
        await client.execute({
          sql: `INSERT INTO "SpecialRubricLevel" (id, criterionId, levelCode, levelName, description, numericValue, sortOrder, createdAt, updatedAt)
                VALUES (?, ?, 'DAT', 'Đạt', 'Hoàn thành tiêu chí', 2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
          args: [`rub_${criterionId}_DAT`, criterionId]
        });
        await client.execute({
          sql: `INSERT INTO "SpecialRubricLevel" (id, criterionId, levelCode, levelName, description, numericValue, sortOrder, createdAt, updatedAt)
                VALUES (?, ?, 'CAN_CO_GANG', 'Cần cố gắng', 'Cần cố gắng thêm', 1, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
          args: [`rub_${criterionId}_CCG`, criterionId]
        });
      }
    }
  }

  console.log(`✓ [${dbName}] Grade ${grade} complete: ${topicSort} topics, ${insertedLessons} lessons, ${insertedCriteria} criteria, ${insertedCriteria * 3} rubrics.`);
}

async function autoAssignGrade3(client, dbName) {
  console.log(`\n[${dbName}] Checking and auto-assigning FIN_EDU for Grade 3 classes...`);
  const activeClasses = await client.execute({
    sql: `SELECT id, className, grade, campusId, homeroomTeacherId 
          FROM "Class" 
          WHERE status = 'ACTIVE' 
            AND academicYearId = ?
            AND grade IN ('3', 3)
            AND homeroomTeacherId IS NOT NULL;`,
    args: [ACADEMIC_YEAR_ID]
  });

  let assignedCount = 0;
  for (const cls of activeClasses.rows) {
    const classId = String(cls.id);
    const teacherId = String(cls.homeroomTeacherId);
    const assignmentId = `assign_fin_${classId}_${teacherId}_1`;

    await client.execute({
      sql: `INSERT INTO "SpecialTeachingAssignment" (id, subjectId, teacherId, classId, academicYearId, semester, isLeadTeacher, status, createdAt, updatedAt)
            VALUES (?, 'spec_sub_fin_edu', ?, ?, ?, 1, 1, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            ON CONFLICT(subjectId, teacherId, classId, academicYearId, semester) DO UPDATE SET
              status = 'ACTIVE',
              isLeadTeacher = 1,
              updatedAt = CURRENT_TIMESTAMP;`,
      args: [assignmentId, teacherId, classId, ACADEMIC_YEAR_ID]
    });
    assignedCount++;
  }
  console.log(`✓ [${dbName}] Assigned FIN_EDU to ${assignedCount} active Grade 3 classes.`);
}

async function runOnClient(client, dbName) {
  console.log(`\n=================== PROCESSING ${dbName} ===================`);
  await ingestGrade3OnClient(client, parsedGrade3, dbName);
  await autoAssignGrade3(client, dbName);
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await runOnClient(localClient, 'LOCAL SQLite');

  try {
    const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
    await runOnClient(cloudClient, 'TURSO Cloud');
  } catch (err) {
    console.warn('Turso Cloud Error:', err.stack || err);
  }
}

main().catch(console.error);
