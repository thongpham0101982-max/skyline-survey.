const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const normalizedData = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'cxxh_normalized_curriculum.json'), 'utf-8'));

async function ingestOnClient(client, dbName) {
  console.log(`\n=== INGESTING CXXH INTO ${dbName} ===`);
  
  // 1. Upsert SpecialSubject CXXH
  await client.execute({
    sql: `INSERT INTO "SpecialSubject" (id, code, name, description, color, status, updatedAt)
          VALUES ('spec_sub_cxxh', 'CXXH', 'Giáo dục Cảm xúc - Xã hội', 'Chương trình Giáo dục Cảm xúc - Xã hội (Social-Emotional Learning - SEL) Sky-Line từ Khối 1 đến Khối 9', '#00A19A', 'ACTIVE', CURRENT_TIMESTAMP)
          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            description = excluded.description,
            color = excluded.color,
            status = excluded.status,
            updatedAt = CURRENT_TIMESTAMP;`,
    args: []
  });
  console.log(`✓ SpecialSubject CXXH created/updated`);

  // 2. Curriculums: Primary (1-5) and Secondary (6-9)
  await client.execute({
    sql: `INSERT INTO "SpecialCurriculum" (id, subjectId, code, name, level, targetGrades, status, updatedAt)
          VALUES ('curr_cxxh_primary', 'spec_sub_cxxh', 'CURR_CXXH_PRIMARY', 'Khung chương trình Giáo dục Cảm xúc Khối Tiểu học (1–5)', 'PRIMARY', '1,2,3,4,5', 'ACTIVE', CURRENT_TIMESTAMP)
          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            targetGrades = excluded.targetGrades,
            status = excluded.status,
            updatedAt = CURRENT_TIMESTAMP;`,
    args: []
  });
  await client.execute({
    sql: `INSERT INTO "SpecialCurriculum" (id, subjectId, code, name, level, targetGrades, status, updatedAt)
          VALUES ('curr_cxxh_secondary', 'spec_sub_cxxh', 'CURR_CXXH_SECONDARY', 'Khung chương trình Giáo dục Cảm xúc Khối THCS (6–9)', 'SECONDARY', '6,7,8,9', 'ACTIVE', CURRENT_TIMESTAMP)
          ON CONFLICT(code) DO UPDATE SET
            name = excluded.name,
            targetGrades = excluded.targetGrades,
            status = excluded.status,
            updatedAt = CURRENT_TIMESTAMP;`,
    args: []
  });
  console.log(`✓ Curriculums PRIMARY & SECONDARY created/updated`);

  // 3. Curriculum Versions
  await client.execute({
    sql: `INSERT INTO "SpecialCurriculumVersion" (id, curriculumId, versionCode, description, status, academicYearId, updatedAt)
          VALUES ('ver_cxxh_primary_v1', 'curr_cxxh_primary', 'v1.0', 'Chương trình Giáo dục Cảm xúc Tiểu học (Chuẩn 2026-2027)', 'PUBLISHED', 'cmnseevbh0000wjbmoigji2zd', CURRENT_TIMESTAMP)
          ON CONFLICT(curriculumId, versionCode) DO UPDATE SET
            description = excluded.description,
            status = excluded.status,
            updatedAt = CURRENT_TIMESTAMP;`,
    args: []
  });
  await client.execute({
    sql: `INSERT INTO "SpecialCurriculumVersion" (id, curriculumId, versionCode, description, status, academicYearId, updatedAt)
          VALUES ('ver_cxxh_secondary_v1', 'curr_cxxh_secondary', 'v1.0', 'Chương trình Giáo dục Cảm xúc THCS (Chuẩn 2026-2027)', 'PUBLISHED', 'cmnseevbh0000wjbmoigji2zd', CURRENT_TIMESTAMP)
          ON CONFLICT(curriculumId, versionCode) DO UPDATE SET
            description = excluded.description,
            status = excluded.status,
            updatedAt = CURRENT_TIMESTAMP;`,
    args: []
  });
  console.log(`✓ Published Versions v1.0 created/updated`);

  // Iterate grades 1 to 9
  let totalTopicsInserted = 0;
  let totalLessonsInserted = 0;
  let totalCriteriaInserted = 0;

  for (let g = 1; g <= 9; g++) {
    const gStr = g.toString();
    const gradeData = normalizedData.grades[gStr];
    if (!gradeData) continue;

    const isPrimary = g <= 5;
    const versionId = isPrimary ? 'ver_cxxh_primary_v1' : 'ver_cxxh_secondary_v1';
    const periodMinutes = isPrimary ? 35 : 45;

    // Grade config
    const gradeConfigId = `gc_cxxh_${gStr}`;
    await client.execute({
      sql: `INSERT INTO "SpecialSubjectGradeConfig" (id, versionId, grade, totalPeriods, periodMinutes, overallGoal, evalCycle, evalScaleType, summaryFormula, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, 'PER_LESSON', 'TOT_HOAN_THANH_CAN_CO_GANG', 'MOST_FREQUENT', CURRENT_TIMESTAMP)
            ON CONFLICT(versionId, grade) DO UPDATE SET
              totalPeriods = excluded.totalPeriods,
              periodMinutes = excluded.periodMinutes,
              evalScaleType = excluded.evalScaleType,
              summaryFormula = excluded.summaryFormula,
              updatedAt = CURRENT_TIMESTAMP;`,
      args: [gradeConfigId, versionId, gStr, gradeData.lessonsCount, periodMinutes, `Mục tiêu rèn luyện Cảm xúc - Xã hội Khối ${gStr}`]
    });

    // Ingest Topics and Lessons
    let topicOrder = 0;
    for (const top of gradeData.topics) {
      topicOrder++;
      const topicId = `top_cxxh_${gStr}_${topicOrder}`;
      await client.execute({
        sql: `INSERT INTO "SpecialTopic" (id, versionId, grade, code, name, sortOrder, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(versionId, grade, code) DO UPDATE SET
                name = excluded.name,
                sortOrder = excluded.sortOrder,
                updatedAt = CURRENT_TIMESTAMP;`,
        args: [topicId, versionId, gStr, `TOPIC_${gStr}_${topicOrder}`, top.topicName, topicOrder]
      });
      totalTopicsInserted++;

      for (const les of top.lessons) {
        const lessonId = `les_cxxh_${gStr}_${les.lessonIndex}`;
        await client.execute({
          sql: `INSERT INTO "SpecialLesson" (id, versionId, topicId, grade, periodIndex, lessonName, objectives, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(versionId, grade, periodIndex) DO UPDATE SET
                  topicId = excluded.topicId,
                  lessonName = excluded.lessonName,
                  objectives = excluded.objectives,
                  updatedAt = CURRENT_TIMESTAMP;`,
          args: [lessonId, versionId, topicId, gStr, les.lessonIndex, les.lessonName, `Bài ${les.lessonIndex}: ${les.lessonName} (${les.criteriaCount} tiêu chuẩn)`]
        });
        totalLessonsInserted++;

        // Clear existing criteria for this lesson to ensure fresh cleanly indexed criteria
        await client.execute({
          sql: `DELETE FROM "SpecialAssessmentCriterion" WHERE lessonId = ?;`,
          args: [lessonId]
        });

        // Insert Criteria with internal CUID and programLevel
        for (const crit of les.criteria) {
          const criterionId = `crit_cxxh_${gStr}_${les.lessonIndex}_${crit.criterionIndex}`;
          await client.execute({
            sql: `INSERT INTO "SpecialAssessmentCriterion" (id, gradeConfigId, lessonId, competencyGroup, programLevel, code, name, description, sortOrder, updatedAt)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP);`,
            args: [
              criterionId,
              gradeConfigId,
              lessonId,
              crit.competencyGroup || 'Chung',
              crit.programLevel || null,
              crit.sourceCode || `TC_${gStr}_${les.lessonIndex}_${crit.criterionIndex}`,
              crit.description ? crit.description.slice(0, 100) : '',
              crit.description || '',
              crit.criterionIndex || 1
            ]
          });
          totalCriteriaInserted++;
        }
      }
    }
  }

  console.log(`[${dbName}] Ingested successfully:`);
  console.log(`- Topics: ${totalTopicsInserted}`);
  console.log(`- Lessons: ${totalLessonsInserted}`);
  console.log(`- Criteria: ${totalCriteriaInserted}`);
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await ingestOnClient(localClient, 'LOCAL SQLite');

  try {
    const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
    await ingestOnClient(cloudClient, 'TURSO Cloud');
  } catch (err) {
    console.warn('Turso cloud ingestion warning:', err.stack || err);
  }
}

main().catch(console.error);
