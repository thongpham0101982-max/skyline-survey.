const { createClient } = require('@libsql/client');
const path = require('path');

const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

async function verify(client, label) {
  console.log(`\n=== VERIFYING ${label} FOR GRADE 3S ===`);

  // 1. GradeConfig
  const cfg = await client.execute({
    sql: `SELECT id, versionId, grade, totalPeriods, evalCycle, evalScaleType FROM "SpecialSubjectGradeConfig" WHERE versionId = 'spec_ver_fin_v1_0' AND grade = '3';`,
    args: []
  });
  console.log('GradeConfig:', cfg.rows);

  // 2. Topics
  const topics = await client.execute({
    sql: `SELECT id, code, name, sortOrder FROM "SpecialTopic" WHERE versionId = 'spec_ver_fin_v1_0' AND grade = '3' ORDER BY sortOrder;`,
    args: []
  });
  console.log(`Topics count: ${topics.rows.length}`);
  for (const t of topics.rows) console.log(`  - [${t.code}] ${t.name}`);

  // 3. Lessons
  const lessons = await client.execute({
    sql: `SELECT id, topicId, periodIndex, lessonName, isProject FROM "SpecialLesson" WHERE versionId = 'spec_ver_fin_v1_0' AND grade = '3' ORDER BY periodIndex;`,
    args: []
  });
  console.log(`Lessons count: ${lessons.rows.length}`);

  // 4. Criteria & Competencies
  const crits = await client.execute({
    sql: `SELECT c.id, c.code, c.competencyGroup, c.programLevel, c.lessonId, l.lessonName 
          FROM "SpecialAssessmentCriterion" c
          JOIN "SpecialLesson" l ON c.lessonId = l.id
          WHERE l.versionId = 'spec_ver_fin_v1_0' AND l.grade = '3'
          ORDER BY c.code;`,
    args: []
  });
  console.log(`Criteria count: ${crits.rows.length}`);

  const compStats = {};
  for (const c of crits.rows) {
    compStats[c.competencyGroup] = (compStats[c.competencyGroup] || 0) + 1;
  }
  console.log('Competency breakdown:', compStats);

  // Special multi-competency check
  const multiCompCrits = crits.rows.filter(c => String(c.competencyGroup).includes(','));
  console.log('Multi-competency criteria count:', multiCompCrits.length);
  for (const mc of multiCompCrits) {
    console.log(`  * [${mc.code}] (${mc.competencyGroup}): ${mc.lessonName}`);
  }

  // 5. Rubric levels
  const rubrics = await client.execute({
    sql: `SELECT COUNT(*) as cnt FROM "SpecialRubricLevel" r
          JOIN "SpecialAssessmentCriterion" c ON r.criterionId = c.id
          JOIN "SpecialLesson" l ON c.lessonId = l.id
          WHERE l.versionId = 'spec_ver_fin_v1_0' AND l.grade = '3';`,
    args: []
  });
  console.log('Rubric levels count:', rubrics.rows[0].cnt);

  // 6. Teaching assignments for Grade 3
  const assigns = await client.execute({
    sql: `SELECT a.id, a.classId, c.className, c.grade, t.teacherName
          FROM "SpecialTeachingAssignment" a
          JOIN "Class" c ON a.classId = c.id
          LEFT JOIN "Teacher" t ON a.teacherId = t.id
          WHERE a.subjectId = 'spec_sub_fin_edu' AND c.grade IN ('3', 3)
          ORDER BY c.className;`,
    args: []
  });
  console.log(`Teaching assignments for Grade 3: ${assigns.rows.length}`);
}

async function main() {
  const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
  await verify(localClient, 'LOCAL SQLite');

  const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
  await verify(cloudClient, 'TURSO Cloud');
}

main().catch(console.error);
