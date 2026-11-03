const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const EXCEL_PATH = path.resolve(__dirname, '../docs/PPCT_MON_GIAO_DUC_TAI_CHINH.xlsx');
const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";
const ACADEMIC_YEAR_ID = 'cmnseevbh0000wjbmoigji2zd';

// Step 1: Read and parse Finance Middle School Excel
console.log('Reading Excel file:', EXCEL_PATH);
const wb = xlsx.readFile(EXCEL_PATH);

const normalizedCurriculum = {
  subjectCode: 'FIN_EDU',
  subjectName: 'Giáo dục tài chính cá nhân',
  academicYearId: ACADEMIC_YEAR_ID,
  grades: {}
};

let grandTotalLessons = 0;
let grandTotalCriteria = 0;

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });

  const match = sheetName.match(/Khoi(\d+)S/i);
  if (!match) continue;
  const gradeStr = match[1];

  let currentTopicName = '';
  let currentTopicCode = '';
  let currentLessonName = '';
  let currentLessonCode = '';

  const topicsMap = new Map();
  let lessonCounter = 0;

  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] || [];
    const topic = r[0] != null ? String(r[0]).trim() : '';
    const lesson = r[1] != null ? String(r[1]).trim() : '';
    const desc = r[2] != null ? String(r[2]).trim() : '';
    const muc = r[3] != null ? String(r[3]).trim() : '';
    const stdCode = r[4] != null ? String(r[4]).trim() : '';
    const guideDocRaw = r[5] != null ? String(r[5]).trim() : '';

    // Col 6: Hiểu, Col 7: Biết, Col 8: Vận dụng
    let competency = 'Vận dụng';
    if (r[6] && String(r[6]).trim().toLowerCase() === 'x') competency = 'Hiểu';
    else if (r[7] && String(r[7]).trim().toLowerCase() === 'x') competency = 'Biết';
    else if (r[8] && String(r[8]).trim().toLowerCase() === 'x') competency = 'Vận dụng';

    const topicCode = r[14] != null ? String(r[14]).trim() : '';
    const lessonCode = r[15] != null ? String(r[15]).trim() : '';

    if (topic) currentTopicName = topic;
    if (topicCode) currentTopicCode = topicCode;
    if (lesson) currentLessonName = lesson;
    if (lessonCode) currentLessonCode = lessonCode;

    if (!stdCode && !desc) continue;

    const tCode = currentTopicCode || `TC${gradeStr.padStart(2, '0')}S.01`;
    const tName = currentTopicName || `Chủ đề Giáo dục tài chính Khối ${gradeStr}`;

    if (!topicsMap.has(tCode)) {
      topicsMap.set(tCode, {
        topicCode: tCode,
        topicName: tName,
        lessons: new Map()
      });
    }

    const topicObj = topicsMap.get(tCode);
    const lCode = currentLessonCode || `${tCode}.${String(lessonCounter + 1).padStart(4, '0')}`;
    const lName = currentLessonName || `Bài học ${lessonCounter + 1}`;

    if (!topicObj.lessons.has(lCode)) {
      lessonCounter++;
      topicObj.lessons.set(lCode, {
        lessonIndex: lessonCounter,
        lessonCode: lCode,
        lessonName: lName,
        criteria: []
      });
    }

    const lessonObj = topicObj.lessons.get(lCode);
    lessonObj.criteria.push({
      criterionIndex: lessonObj.criteria.length + 1,
      sourceCode: stdCode,
      description: desc,
      programLevel: muc || null,
      guideDoc: guideDocRaw || null,
      competencyGroup: competency
    });

    grandTotalCriteria++;
  }

  const gradeTopics = [];
  let gradeLessonsCount = 0;
  let gradeCriteriaCount = 0;

  for (const [tCode, tObj] of topicsMap.entries()) {
    const lessonsArr = [];
    for (const [lCode, lObj] of tObj.lessons.entries()) {
      lessonsArr.push(lObj);
      gradeLessonsCount++;
      gradeCriteriaCount += lObj.criteria.length;
    }
    gradeTopics.push({
      topicCode: tObj.topicCode,
      topicName: tObj.topicName,
      lessons: lessonsArr
    });
  }

  grandTotalLessons += gradeLessonsCount;

  normalizedCurriculum.grades[gradeStr] = {
    grade: gradeStr,
    topicsCount: gradeTopics.length,
    lessonsCount: gradeLessonsCount,
    criteriaCount: gradeCriteriaCount,
    topics: gradeTopics
  };
}

console.log(`\nNormalized Finance Middle School Summary:`);
console.log(`- Grand Total Lessons: ${grandTotalLessons} (Expected: 40)`);
console.log(`- Grand Total Criteria: ${grandTotalCriteria} (Expected: 118)`);
Object.keys(normalizedCurriculum.grades).forEach(g => {
  const gd = normalizedCurriculum.grades[g];
  console.log(`  Grade ${g}: ${gd.lessonsCount} lessons, ${gd.criteriaCount} criteria`);
});

const jsonPath = path.resolve(__dirname, 'finance_middle_normalized_curriculum.json');
fs.writeFileSync(jsonPath, JSON.stringify(normalizedCurriculum, null, 2), 'utf-8');
console.log(`Saved normalized JSON to: ${jsonPath}`);

// Step 2: Database Ingestion Function
async function ingestOnClient(client, dbName) {
  console.log(`\n=================== INGESTING FINANCE THCS INTO ${dbName} ===================`);

  // 1. Ensure SpecialSubject FIN_EDU has MIDDLE level
  await client.execute({
    sql: `UPDATE "SpecialSubject"
          SET levels = 'PRIMARY,MIDDLE',
              updatedAt = CURRENT_TIMESTAMP
          WHERE code = 'FIN_EDU';`,
    args: []
  });
  console.log(`✓ SpecialSubject FIN_EDU updated levels to PRIMARY,MIDDLE`);

  // 2. Curriculum: Secondary (6-9)
  await client.execute({
    sql: `INSERT INTO "SpecialCurriculum" (id, subjectId, code, name, level, targetGrades, status, updatedAt)
          VALUES ('spec_curr_fin_middle', 'spec_sub_fin_edu', 'CURR_FIN_MIDDLE', 'Khung chương trình Giáo dục tài chính Khối THCS', 'MIDDLE', '6,7,8,9', 'ACTIVE', CURRENT_TIMESTAMP)
          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            level = excluded.level,
            targetGrades = excluded.targetGrades,
            status = 'ACTIVE',
            updatedAt = CURRENT_TIMESTAMP;`,
    args: []
  });
  console.log(`✓ Curriculum CURR_FIN_MIDDLE activated & updated`);

  // 3. Curriculum Version: v1.0
  const versionId = 'ver_fin_middle_v1';
  await client.execute({
    sql: `INSERT INTO "SpecialCurriculumVersion" (id, curriculumId, versionCode, description, status, academicYearId, updatedAt)
          VALUES (?, 'spec_curr_fin_middle', 'v1.0', 'Chương trình Giáo dục Tài chính THCS Hệ S (Chuẩn 2026-2027)', 'PUBLISHED', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(curriculumId, versionCode) DO UPDATE SET
            description = excluded.description,
            status = 'PUBLISHED',
            updatedAt = CURRENT_TIMESTAMP;`,
    args: [versionId, ACADEMIC_YEAR_ID]
  });
  console.log(`✓ Curriculum Version v1.0 published`);

  let totalTopics = 0;
  let totalLessons = 0;
  let totalCriteria = 0;

  for (let g = 6; g <= 9; g++) {
    const gStr = g.toString();
    const gradeData = normalizedCurriculum.grades[gStr];
    if (!gradeData) continue;

    const gradeConfigId = `gc_fin_middle_${gStr}`;

    // Grade config
    await client.execute({
      sql: `INSERT INTO "SpecialSubjectGradeConfig" (id, versionId, grade, totalPeriods, periodMinutes, overallGoal, evalCycle, evalScaleType, summaryFormula, updatedAt)
            VALUES (?, ?, ?, ?, 45, ?, 'PER_LESSON', 'TOT_HOAN_THANH_CAN_CO_GANG', 'MOST_FREQUENT', CURRENT_TIMESTAMP)
            ON CONFLICT(versionId, grade) DO UPDATE SET
              totalPeriods = excluded.totalPeriods,
              periodMinutes = excluded.periodMinutes,
              evalScaleType = excluded.evalScaleType,
              summaryFormula = excluded.summaryFormula,
              updatedAt = CURRENT_TIMESTAMP;`,
      args: [gradeConfigId, versionId, gStr, gradeData.lessonsCount, `Mục tiêu phát triển năng lực tài chính, quản lý ngân sách và tư duy tiêu dùng Khối ${gStr}`]
    });

    let topicOrder = 0;
    for (const top of gradeData.topics) {
      topicOrder++;
      const topicId = `top_fin_middle_${gStr}_${topicOrder}`;
      await client.execute({
        sql: `INSERT INTO "SpecialTopic" (id, versionId, grade, code, name, sortOrder, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(versionId, grade, code) DO UPDATE SET
                name = excluded.name,
                sortOrder = excluded.sortOrder,
                updatedAt = CURRENT_TIMESTAMP;`,
        args: [topicId, versionId, gStr, top.topicCode || `TOP_FIN_${gStr}_${topicOrder}`, top.topicName, topicOrder]
      });
      totalTopics++;

      for (const les of top.lessons) {
        const lessonId = `les_fin_middle_${gStr}_${les.lessonIndex}`;
        await client.execute({
          sql: `INSERT INTO "SpecialLesson" (id, versionId, topicId, grade, periodIndex, lessonName, objectives, requirements, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(versionId, grade, periodIndex) DO UPDATE SET
                  topicId = excluded.topicId,
                  lessonName = excluded.lessonName,
                  objectives = excluded.objectives,
                  requirements = excluded.requirements,
                  updatedAt = CURRENT_TIMESTAMP;`,
          args: [
            lessonId, 
            versionId, 
            topicId, 
            gStr, 
            les.lessonIndex, 
            les.lessonName, 
            `Bài ${les.lessonIndex}: ${les.lessonName} (${les.criteria.length} tiêu chuẩn năng lực tài chính)`,
            les.criteria.map(c => c.description).join('; ')
          ]
        });
        totalLessons++;

        // Clear existing criteria for clean idempotent ingestion
        await client.execute({
          sql: `DELETE FROM "SpecialAssessmentCriterion" WHERE lessonId = ?;`,
          args: [lessonId]
        });

        // Insert criteria and rubrics
        for (const crit of les.criteria) {
          const criterionId = `crit_fin_middle_${gStr}_${les.lessonIndex}_${crit.criterionIndex}`;
          await client.execute({
            sql: `INSERT INTO "SpecialAssessmentCriterion" (id, gradeConfigId, lessonId, competencyGroup, programLevel, code, name, description, sortOrder, updatedAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);`,
            args: [
              criterionId,
              gradeConfigId,
              lessonId,
              crit.competencyGroup || 'Vận dụng',
              crit.programLevel || null,
              crit.sourceCode || `TC_FIN_${gStr}_${les.lessonIndex}_${crit.criterionIndex}`,
              crit.description ? crit.description.slice(0, 100) : '',
              crit.description || '',
              crit.criterionIndex || 1
            ]
          });
          totalCriteria++;

          // Rubrics for 3 qualitative levels
          await client.execute({
            sql: `INSERT INTO "SpecialRubricLevel" (id, criterionId, levelCode, levelName, description, numericValue, sortOrder, updatedAt)
                  VALUES (?, ?, 'TOT', 'Tốt', 'Hoàn thành tốt tiêu chí', 3, 1, CURRENT_TIMESTAMP)
                  ON CONFLICT(criterionId, levelCode) DO NOTHING;`,
            args: [`rub_${criterionId}_TOT`, criterionId]
          });
          await client.execute({
            sql: `INSERT INTO "SpecialRubricLevel" (id, criterionId, levelCode, levelName, description, numericValue, sortOrder, updatedAt)
                  VALUES (?, ?, 'DAT', 'Đạt', 'Hoàn thành tiêu chí', 2, 2, CURRENT_TIMESTAMP)
                  ON CONFLICT(criterionId, levelCode) DO NOTHING;`,
            args: [`rub_${criterionId}_DAT`, criterionId]
          });
          await client.execute({
            sql: `INSERT INTO "SpecialRubricLevel" (id, criterionId, levelCode, levelName, description, numericValue, sortOrder, updatedAt)
                  VALUES (?, ?, 'CAN_CO_GANG', 'Cần cố gắng', 'Cần cố gắng thêm', 1, 3, CURRENT_TIMESTAMP)
                  ON CONFLICT(criterionId, levelCode) DO NOTHING;`,
            args: [`rub_${criterionId}_CCG`, criterionId]
          });
        }
      }
    }
  }

  console.log(`[${dbName}] Ingestion Complete:`);
  console.log(`- Topics: ${totalTopics}`);
  console.log(`- Lessons: ${totalLessons} (40 lessons)`);
  console.log(`- Criteria: ${totalCriteria} (118 criteria)`);

  // 4. Auto-Assign FIN_EDU for Homeroom Teachers (GVCN) for Middle School Grades 6-9
  console.log(`[${dbName}] Assigning FIN_EDU to Homeroom Teachers for Grades 6-9...`);
  const activeClasses = await client.execute({
    sql: `SELECT id, className, grade, campusId, homeroomTeacherId 
          FROM "Class" 
          WHERE status = 'ACTIVE' 
            AND academicYearId = ?
            AND grade IN ('6', '7', '8', '9', 6, 7, 8, 9)
            AND homeroomTeacherId IS NOT NULL;`,
    args: [ACADEMIC_YEAR_ID]
  });

  let assignedCount = 0;
  for (const cls of activeClasses.rows) {
    const classId = String(cls.id);
    const teacherId = String(cls.homeroomTeacherId);
    const assignmentId = `assign_fin_${classId}_${teacherId}_1`;

    await client.execute({
      sql: `INSERT INTO "SpecialTeachingAssignment" (id, subjectId, teacherId, classId, academicYearId, semester, isLeadTeacher, status, updatedAt)
            VALUES (?, 'spec_sub_fin_edu', ?, ?, ?, 1, 1, 'ACTIVE', CURRENT_TIMESTAMP)
            ON CONFLICT(subjectId, teacherId, classId, academicYearId, semester) DO UPDATE SET
              status = 'ACTIVE',
              isLeadTeacher = 1,
              updatedAt = CURRENT_TIMESTAMP;`,
      args: [assignmentId, teacherId, classId, ACADEMIC_YEAR_ID]
    });
    assignedCount++;
  }
  console.log(`[${dbName}] Assigned FIN_EDU to ${assignedCount} active THCS classes in grades 6-9.`);
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await ingestOnClient(localClient, 'LOCAL SQLite');

  try {
    const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
    await ingestOnClient(cloudClient, 'TURSO Cloud');
  } catch (err) {
    console.warn('Turso Cloud Ingestion Warning:', err.stack || err);
  }
}

main().catch(console.error);
