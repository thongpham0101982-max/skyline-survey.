const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const EXCEL_PATH = path.resolve(__dirname, '../docs/PPCT_MON_GIAO_DUC_TAI_CHINH_KHOI_5.xlsx');
const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

console.log('Reading Excel file:', EXCEL_PATH);
const wb = xlsx.readFile(EXCEL_PATH);
const ws = wb.Sheets['KHỐI 5S'];
if (!ws) {
  throw new Error('Sheet KHỐI 5S not found in Excel!');
}
const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

const topicsMap = new Map();
let currentTopicName = '';
let currentTopicCode = '';
let currentLessonName = '';
let currentLessonCode = '';

let lessonCounter = 0;
let totalCriteria = 0;

for (let i = 3; i < rows.length; i++) {
  const r = rows[i] || [];
  const topic = r[0] != null ? String(r[0]).trim() : '';
  const lesson = r[1] != null ? String(r[1]).trim() : '';
  const desc = r[2] != null ? String(r[2]).trim() : '';
  const muc = r[3] != null ? String(r[3]).trim() : '';
  const stdCode = r[4] != null ? String(r[4]).trim() : '';
  const guideDoc = r[5] != null ? String(r[5]).trim() : '';

  let competency = 'Vận dụng';
  if (r[6] && String(r[6]).trim().toLowerCase() === 'x') competency = 'Hiểu';
  else if (r[7] && String(r[7]).trim().toLowerCase() === 'x') competency = 'Biết';
  else if (r[8] && String(r[8]).trim().toLowerCase() === 'x') competency = 'Vận dụng';

  const topicCode = r[14] != null ? String(r[14]).trim() : '';
  const lessonCode = r[15] != null ? String(r[15]).trim() : '';

  if (topic) currentTopicName = topic.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
  if (topicCode) currentTopicCode = topicCode;
  if (lesson) currentLessonName = lesson.replace(/\r\n/g, ' ').replace(/\n/g, ' ').trim();
  if (lessonCode) currentLessonCode = lessonCode;

  if (!stdCode && !desc) continue;

  const tCode = currentTopicCode;
  const tName = currentTopicName;

  if (!topicsMap.has(tCode)) {
    topicsMap.set(tCode, {
      topicCode: tCode,
      topicName: tName,
      lessons: new Map()
    });
  }

  const topicObj = topicsMap.get(tCode);
  const lCode = currentLessonCode;
  const lName = currentLessonName;

  if (!topicObj.lessons.has(lCode)) {
    lessonCounter++;
    topicObj.lessons.set(lCode, {
      lessonIndex: lessonCounter,
      lessonCode: lCode,
      lessonName: lName,
      isProject: lName.toLowerCase().includes('dự án') || lName.toLowerCase().includes('gian hàng'),
      criteria: []
    });
  }

  const lessonObj = topicObj.lessons.get(lCode);
  lessonObj.criteria.push({
    criterionIndex: lessonObj.criteria.length + 1,
    sourceCode: stdCode,
    description: desc,
    programLevel: muc || null,
    guideDoc: guideDoc || null,
    competencyGroup: competency
  });

  totalCriteria++;
}

console.log(`Parsed Topics: ${topicsMap.size}, Total Lessons: ${lessonCounter}, Total Criteria: ${totalCriteria}`);

async function ingestGrade5OnClient(client, dbName) {
  console.log(`\n=================== INGESTING FINANCE GRADE 5 INTO ${dbName} ===================`);

  const versionId = 'spec_ver_fin_v1_0';
  const gradeStr = '5';
  const gradeConfigId = 'spec_cfg_fin_g5';

  // 1. Ensure SpecialSubjectGradeConfig for Grade 5
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
      gradeStr,
      lessonCounter,
      'Chương trình Giáo dục tài chính cá nhân Lớp 5: Phát triển năng lực tiêu dùng thông minh, quản lí tiền cá nhân và trách nhiệm xã hội qua dự án thực tế.'
    ]
  });
  console.log(`✓ Updated SpecialSubjectGradeConfig for Grade 5 (12 periods)`);

  // 2. Fetch existing Grade 5 lessons in this version to clean up old criteria and lessons
  const existingLessons = await client.execute({
    sql: `SELECT id FROM "SpecialLesson" WHERE versionId = ? AND grade = ?;`,
    args: [versionId, gradeStr]
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

  // Also clean up any criteria attached directly to gradeConfigId
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

  // Delete existing Grade 5 lessons
  await client.execute({
    sql: `DELETE FROM "SpecialLesson" WHERE versionId = ? AND grade = ?;`,
    args: [versionId, gradeStr]
  });

  // Delete existing Grade 5 topics
  await client.execute({
    sql: `DELETE FROM "SpecialTopic" WHERE versionId = ? AND grade = ?;`,
    args: [versionId, gradeStr]
  });
  console.log(`✓ Cleaned up old placeholder Grade 5 topics and lessons`);

  // 3. Insert Topics, Lessons, Criteria, and Rubrics
  let topicSort = 0;
  let insertedLessons = 0;
  let insertedCriteria = 0;

  for (const [tCode, tObj] of topicsMap.entries()) {
    topicSort++;
    const topicId = `top_fin_g5_${topicSort}`;

    await client.execute({
      sql: `INSERT INTO "SpecialTopic" (id, versionId, grade, code, name, sortOrder, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
      args: [topicId, versionId, gradeStr, tObj.topicCode, tObj.topicName, topicSort]
    });

    for (const [lCode, lObj] of tObj.lessons.entries()) {
      const lessonId = `les_fin_g5_p${String(lObj.lessonIndex).padStart(2, '0')}`;
      const objectives = `${tObj.topicName} - ${lObj.lessonName} (${lObj.criteria.length} tiêu chuẩn năng lực)`;
      const requirements = lObj.criteria.map(c => c.description).join('; ');

      await client.execute({
        sql: `INSERT INTO "SpecialLesson" (id, versionId, topicId, grade, periodIndex, lessonName, objectives, requirements, isProject, projectMinPeriods, status, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
        args: [
          lessonId,
          versionId,
          topicId,
          gradeStr,
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
        const criterionId = `crit_fin_g5_${crit.sourceCode.replace(/\./g, '_')}`;
        await client.execute({
          sql: `INSERT INTO "SpecialAssessmentCriterion" (id, gradeConfigId, lessonId, competencyGroup, programLevel, code, name, description, weight, sortOrder, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`,
          args: [
            criterionId,
            gradeConfigId,
            lessonId,
            crit.competencyGroup || 'Vận dụng',
            crit.programLevel || null,
            crit.sourceCode,
            crit.description.slice(0, 100),
            crit.description,
            crit.criterionIndex
          ]
        });
        insertedCriteria++;

        // Insert 3 rubrics
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

  console.log(`[${dbName}] Ingestion Complete:`);
  console.log(`- Topics: ${topicSort}`);
  console.log(`- Lessons: ${insertedLessons}`);
  console.log(`- Criteria: ${insertedCriteria}`);
  console.log(`- Rubric levels: ${insertedCriteria * 3}`);
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await ingestGrade5OnClient(localClient, 'LOCAL SQLite');

  try {
    const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
    await ingestGrade5OnClient(cloudClient, 'TURSO Cloud');
  } catch (err) {
    console.warn('Turso Cloud Ingestion Warning:', err.stack || err);
  }
}

main().catch(console.error);
