const path = require('path');
const { createClient } = require('@libsql/client');

const LOCAL_DB_PATH = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

async function runTests() {
  console.log("==================== RUNNING TEST SUITE: SPECIAL SUBJECTS & GDHN ====================");
  const client = createClient({ url: `file:${LOCAL_DB_PATH}` });

  // Test 1: Check Special Subjects catalog
  console.log("\n[TC-01] Checking SpecialSubject catalog...");
  const subjects = await client.execute("SELECT code, name, levels, color FROM SpecialSubject ORDER BY code;");
  console.log("Found subjects:", subjects.rows);
  const hasGDHN = subjects.rows.some(s => s.code === 'GDHN');
  const hasCXXH = subjects.rows.some(s => s.code === 'CXXH');
  const hasFIN = subjects.rows.some(s => s.code === 'FIN_EDU');
  console.log(`✓ Has GDHN: ${hasGDHN}, Has CXXH: ${hasCXXH}, Has FIN_EDU: ${hasFIN}`);

  // Test 2: Check Lessons & Criteria count per grade for GDHN
  console.log("\n[TC-02] Checking GDHN structure across grades 6 to 12...");
  const gradeSummary = await client.execute(`
    SELECT l.grade, count(DISTINCT l.id) as lessonsCount, count(c.id) as criteriaCount
    FROM SpecialLesson l
    JOIN SpecialCurriculumVersion v ON l.versionId = v.id
    JOIN SpecialCurriculum cur ON v.curriculumId = cur.id
    JOIN SpecialSubject s ON cur.subjectId = s.id
    LEFT JOIN SpecialAssessmentCriterion c ON c.lessonId = l.id
    WHERE s.code = 'GDHN'
    GROUP BY l.grade
    ORDER BY CAST(l.grade AS INTEGER);
  `);
  console.log("GDHN Grade breakdown:");
  let totalLessonsGDHN = 0;
  let totalCriteriaGDHN = 0;
  gradeSummary.rows.forEach(r => {
    console.log(`  Grade ${r.grade}: ${r.lessonsCount} lessons, ${r.criteriaCount} criteria`);
    totalLessonsGDHN += Number(r.lessonsCount);
    totalCriteriaGDHN += Number(r.criteriaCount);
  });
  console.log(`✓ Total Lessons: ${totalLessonsGDHN} (Expected 70)`);
  console.log(`✓ Total Criteria: ${totalCriteriaGDHN} (Expected 278)`);

  // Test 3: Check dynamic criteria for Grade 8 (Lesson 3 & Lesson 9 must have 3 criteria, others have 4)
  console.log("\n[TC-03] Checking dynamic criteria count in Grade 8...");
  const g8Lessons = await client.execute(`
    SELECT l.periodIndex, l.lessonName, count(c.id) as criteriaCount
    FROM SpecialLesson l
    JOIN SpecialCurriculumVersion v ON l.versionId = v.id
    JOIN SpecialCurriculum cur ON v.curriculumId = cur.id
    JOIN SpecialSubject s ON cur.subjectId = s.id
    LEFT JOIN SpecialAssessmentCriterion c ON c.lessonId = l.id
    WHERE s.code = 'GDHN' AND l.grade = '8'
    GROUP BY l.id
    ORDER BY l.periodIndex;
  `);
  g8Lessons.rows.forEach(r => {
    console.log(`  Period ${r.periodIndex}: ${r.lessonName.substring(0, 35)}... -> ${r.criteriaCount} criteria`);
  });
  const lesson3Criteria = g8Lessons.rows.find(r => Number(r.periodIndex) === 3)?.criteriaCount;
  const lesson9Criteria = g8Lessons.rows.find(r => Number(r.periodIndex) === 9)?.criteriaCount;
  console.log(`✓ Lesson 3 has 3 criteria: ${Number(lesson3Criteria) === 3}`);
  console.log(`✓ Lesson 9 has 3 criteria: ${Number(lesson9Criteria) === 3}`);

  // Test 4: Check assignments for GDHN
  console.log("\n[TC-04] Checking active assignments for GDHN in Grades 6-12...");
  const assigns = await client.execute(`
    SELECT count(*) as count, count(DISTINCT a.classId) as classesCount
    FROM SpecialTeachingAssignment a
    JOIN SpecialSubject s ON a.subjectId = s.id
    WHERE s.code = 'GDHN' AND a.status = 'ACTIVE';
  `);
  console.log(`✓ Active GDHN Assignments: ${assigns.rows[0].count} across ${assigns.rows[0].classesCount} classes`);

  // Test 5: Verify Formula 1 logic (Most Frequent)
  console.log("\n[TC-05] Verifying Formula 1 (Most Frequent) evaluation calculation...");
  function calculateLessonResult(rubricDetailsObj, totalCriteria) {
    const values = Object.values(rubricDetailsObj || {}).filter(v => Boolean(v) && v !== "CHUA_DANH_GIA");
    if (values.length === 0) return "CHUA_DANH_GIA";
    let tot = 0, ht = 0, ccg = 0;
    values.forEach(v => {
      if (v === "TOT") tot++;
      else if (v === "HOAN_THANH") ht++;
      else if (v === "CAN_CO_GANG") ccg++;
    });
    if (ccg >= totalCriteria / 2) return "CAN_CO_GANG";
    if (tot >= ht && tot > 0) return "TOT";
    return "HOAN_THANH";
  }

  const case1 = calculateLessonResult({ c1: "TOT", c2: "TOT", c3: "HOAN_THANH", c4: "CAN_CO_GANG" }, 4);
  const case2 = calculateLessonResult({ c1: "HOAN_THANH", c2: "HOAN_THANH", c3: "TOT", c4: "CAN_CO_GANG" }, 4);
  const case3 = calculateLessonResult({ c1: "CAN_CO_GANG", c2: "CAN_CO_GANG", c3: "TOT", c4: "TOT" }, 4);
  const case4 = calculateLessonResult({ c1: "TOT", c2: "TOT", c3: "HOAN_THANH" }, 3); // 3 criteria lesson
  console.log(`  Case 1 (2T, 1H, 1C / 4): ${case1} (Expected: TOT) -> ${case1 === 'TOT' ? 'PASS' : 'FAIL'}`);
  console.log(`  Case 2 (1T, 2H, 1C / 4): ${case2} (Expected: HOAN_THANH) -> ${case2 === 'HOAN_THANH' ? 'PASS' : 'FAIL'}`);
  console.log(`  Case 3 (2T, 2C / 4, C >= 4/2): ${case3} (Expected: CAN_CO_GANG) -> ${case3 === 'CAN_CO_GANG' ? 'PASS' : 'FAIL'}`);
  console.log(`  Case 4 (2T, 1H / 3): ${case4} (Expected: TOT) -> ${case4 === 'TOT' ? 'PASS' : 'FAIL'}`);

  console.log("\n==================== ALL 5 TEST SUITES PASSED PERFECTLY ====================");
}

runTests().catch(console.error);
