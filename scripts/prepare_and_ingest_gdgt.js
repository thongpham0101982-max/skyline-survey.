const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@libsql/client');

const EXCEL_PATH = 'C:/Users/thongpn/Downloads/PPTC - MÔN GDGT - THCS.xlsx';
const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";
const ACADEMIC_YEAR_ID = 'cmnseevbh0000wjbmoigji2zd';

// Step 1: Read and parse GDGT Excel
console.log('Reading Excel file:', EXCEL_PATH);
const wb = xlsx.readFile(EXCEL_PATH);

const normalizedCurriculum = {
  subjectCode: 'GDGT',
  subjectName: 'Giáo dục giới tính',
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
    
    // Tiêu chí 1..3: Biết, Hiểu, Vận dụng
    let competency = 'Chung';
    if (r[6] && String(r[6]).trim().toLowerCase() === 'x') competency = 'Biết';
    else if (r[7] && String(r[7]).trim().toLowerCase() === 'x') competency = 'Hiểu';
    else if (r[8] && String(r[8]).trim().toLowerCase() === 'x') competency = 'Vận dụng';

    const topicCode = r[9] != null ? String(r[9]).trim() : '';
    const lessonCode = r[10] != null ? String(r[10]).trim() : '';

    if (topic) currentTopicName = topic;
    if (topicCode) currentTopicCode = topicCode;
    if (lesson) currentLessonName = lesson;
    if (lessonCode) currentLessonCode = lessonCode;

    if (!stdCode && !desc) continue;

    // Sanitize guide document to avoid raw personal machine path
    let sanitizedDoc = null;
    if (guideDocRaw) {
      if (guideDocRaw.includes('Tập huấn') || guideDocRaw.includes('TAPHUAN')) {
        sanitizedDoc = 'DOC_GDGT_TAPHUAN';
      } else if (guideDocRaw.includes('DE CUONG') || guideDocRaw.includes('TLHGT')) {
        sanitizedDoc = 'DOC_GDGT_DECUONG';
      } else {
        sanitizedDoc = 'DOC_GDGT_TL';
      }
    }

    const tCode = currentTopicCode || `GDGT${gradeStr}S.01`;
    const tName = currentTopicName || `Chủ đề GDGT Khối ${gradeStr}`;

    if (!topicsMap.has(tCode)) {
      topicsMap.set(tCode, {
        topicCode: tCode,
        topicName: tName,
        lessons: new Map()
      });
    }

    const topicObj = topicsMap.get(tCode);
    const lCode = currentLessonCode || `GDGT${gradeStr}S.01.${String(lessonCounter + 1).padStart(4, '0')}`;
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
      guideDoc: sanitizedDoc,
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

console.log(`\nNormalized GDGT Summary:`);
console.log(`- Grand Total Lessons: ${grandTotalLessons} (Expected: 40)`);
console.log(`- Grand Total Criteria: ${grandTotalCriteria} (Expected: 160)`);
Object.keys(normalizedCurriculum.grades).forEach(g => {
  const gd = normalizedCurriculum.grades[g];
  console.log(`  Grade ${g}: ${gd.lessonsCount} lessons, ${gd.criteriaCount} criteria`);
});

const jsonPath = path.resolve(__dirname, 'gdgt_normalized_curriculum.json');
fs.writeFileSync(jsonPath, JSON.stringify(normalizedCurriculum, null, 2), 'utf-8');
console.log(`Saved normalized JSON to: ${jsonPath}`);

// Step 2: Ingestion Function
async function ingestOnClient(client, dbName) {
  console.log(`\n=================== INGESTING GDGT INTO ${dbName} ===================`);

  // 1. Upsert SpecialSubject GDGT
  await client.execute({
    sql: `INSERT INTO "SpecialSubject" (id, code, name, levels, campuses, description, icon, color, status, updatedAt)
          VALUES ('spec_sub_gdgt', 'GDGT', 'Giáo dục giới tính', 'SECONDARY', 'ALL', 'Chương trình Giáo dục Giới tính Sky-Line từ Khối 6 đến Khối 9', 'Shield', '#E11D48', 'ACTIVE', CURRENT_TIMESTAMP)
          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            levels = excluded.levels,
            campuses = excluded.campuses,
            description = excluded.description,
            icon = excluded.icon,
            color = excluded.color,
            status = excluded.status,
            updatedAt = CURRENT_TIMESTAMP;`,
    args: []
  });
  console.log(`✓ SpecialSubject GDGT created/updated`);

  // 2. Curriculum: Secondary (6-9)
  await client.execute({
    sql: `INSERT INTO "SpecialCurriculum" (id, subjectId, code, name, level, targetGrades, status, updatedAt)
          VALUES ('curr_gdgt_secondary', 'spec_sub_gdgt', 'CURR_GDGT_SECONDARY', 'Khung chương trình Giáo dục Giới tính Khối THCS (6–9)', 'SECONDARY', '6,7,8,9', 'ACTIVE', CURRENT_TIMESTAMP)
          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            targetGrades = excluded.targetGrades,
            status = excluded.status,
            updatedAt = CURRENT_TIMESTAMP;`,
    args: []
  });
  console.log(`✓ Curriculum SECONDARY created/updated`);

  // 3. Curriculum Version
  await client.execute({
    sql: `INSERT INTO "SpecialCurriculumVersion" (id, curriculumId, versionCode, description, status, academicYearId, updatedAt)
          VALUES ('ver_gdgt_secondary_v1', 'curr_gdgt_secondary', 'v1.0', 'Chương trình Giáo dục Giới tính THCS (Chuẩn 2026-2027)', 'PUBLISHED', ?, CURRENT_TIMESTAMP)
          ON CONFLICT(curriculumId, versionCode) DO UPDATE SET
            description = excluded.description,
            status = excluded.status,
            updatedAt = CURRENT_TIMESTAMP;`,
    args: [ACADEMIC_YEAR_ID]
  });
  console.log(`✓ Published Version v1.0 created/updated`);

  let totalTopics = 0;
  let totalLessons = 0;
  let totalCriteria = 0;

  for (let g = 6; g <= 9; g++) {
    const gStr = g.toString();
    const gradeData = normalizedCurriculum.grades[gStr];
    if (!gradeData) continue;

    const versionId = 'ver_gdgt_secondary_v1';
    const gradeConfigId = `gc_gdgt_${gStr}`;

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
      args: [gradeConfigId, versionId, gStr, gradeData.lessonsCount, `Mục tiêu phát triển năng lực hiểu biết và bảo vệ bản thân Khối ${gStr}`]
    });

    let topicOrder = 0;
    for (const top of gradeData.topics) {
      topicOrder++;
      const topicId = `top_gdgt_${gStr}_${topicOrder}`;
      await client.execute({
        sql: `INSERT INTO "SpecialTopic" (id, versionId, grade, code, name, sortOrder, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(versionId, grade, code) DO UPDATE SET
                name = excluded.name,
                sortOrder = excluded.sortOrder,
                updatedAt = CURRENT_TIMESTAMP;`,
        args: [topicId, versionId, gStr, top.topicCode || `TOPIC_GDGT_${gStr}_${topicOrder}`, top.topicName, topicOrder]
      });
      totalTopics++;

      for (const les of top.lessons) {
        const lessonId = `les_gdgt_${gStr}_${les.lessonIndex}`;
        await client.execute({
          sql: `INSERT INTO "SpecialLesson" (id, versionId, topicId, grade, periodIndex, lessonName, objectives, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(versionId, grade, periodIndex) DO UPDATE SET
                  topicId = excluded.topicId,
                  lessonName = excluded.lessonName,
                  objectives = excluded.objectives,
                  updatedAt = CURRENT_TIMESTAMP;`,
          args: [lessonId, versionId, topicId, gStr, les.lessonIndex, les.lessonName, `Bài ${les.lessonIndex}: ${les.lessonName} (${les.criteria.length} tiêu chuẩn)`]
        });
        totalLessons++;

        // Clear existing criteria for clean refresh
        await client.execute({
          sql: `DELETE FROM "SpecialAssessmentCriterion" WHERE lessonId = ?;`,
          args: [lessonId]
        });

        // Insert criteria
        for (const crit of les.criteria) {
          const criterionId = `crit_gdgt_${gStr}_${les.lessonIndex}_${crit.criterionIndex}`;
          await client.execute({
            sql: `INSERT INTO "SpecialAssessmentCriterion" (id, gradeConfigId, lessonId, competencyGroup, programLevel, code, name, description, sortOrder, updatedAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);`,
            args: [
              criterionId,
              gradeConfigId,
              lessonId,
              crit.competencyGroup || 'Chung',
              crit.programLevel || null,
              crit.sourceCode || `TC_GDGT_${gStr}_${les.lessonIndex}_${crit.criterionIndex}`,
              crit.description ? crit.description.slice(0, 100) : '',
              crit.description || '',
              crit.criterionIndex || 1
            ]
          });
          totalCriteria++;
        }
      }
    }
  }

  console.log(`[${dbName}] Ingestion Complete:`);
  console.log(`- Topics: ${totalTopics}`);
  console.log(`- Lessons: ${totalLessons}`);
  console.log(`- Criteria: ${totalCriteria}`);

  // 4. Auto-Assign GDGT to Homeroom Teachers (GVCN) for Grades 6-9
  console.log(`[${dbName}] Assigning GDGT to Homeroom Teachers for Grades 6-9...`);
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
    const assignmentId = `assign_gdgt_${classId}_${teacherId}_1`;

    await client.execute({
      sql: `INSERT INTO "SpecialTeachingAssignment" (id, subjectId, teacherId, classId, academicYearId, semester, isLeadTeacher, status, updatedAt)
            VALUES (?, 'spec_sub_gdgt', ?, ?, ?, 1, 1, 'ACTIVE', CURRENT_TIMESTAMP)
            ON CONFLICT(subjectId, teacherId, classId, academicYearId, semester) DO UPDATE SET
              status = 'ACTIVE',
              isLeadTeacher = 1,
              updatedAt = CURRENT_TIMESTAMP;`,
      args: [assignmentId, teacherId, classId, ACADEMIC_YEAR_ID]
    });
    assignedCount++;
  }
  console.log(`[${dbName}] Assigned GDGT to ${assignedCount} active classes in grades 6-9.`);
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
