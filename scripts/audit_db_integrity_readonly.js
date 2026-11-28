/**
 * Read-Only Database Integrity & Reconciliation Audit Script
 * Strictly adheres to GEMINI.md Rule #1: 100% READ-ONLY (SELECT only, zero writes/mutations).
 * Output contains ZERO PII (only aggregate counts, integrity metrics, and index status).
 */
const path = require("path");
const { createClient } = require("@libsql/client");

async function runReadOnlyAudit() {
  const dbPath = path.resolve(process.cwd(), "local.db").replace(/\\/g, "/");
  const client = createClient({ url: `file:${dbPath}` });

  const tables = [
    "AcademicYear",
    "Campus",
    "Class",
    "Student",
    "Teacher",
    "Parent",
    "ParentStudentLink",
    "User",
    "Role",
    "Permission",
    "Subject",
    "TeachingAssignment",
    "SubjectGradeEntry",
    "StudentTermScore",
    "StudentCompetencyAssessment",
    "InputAssessmentPeriod",
    "InputAssessmentBatch",
    "InputAssessmentStudent",
    "PreschoolInputAssessmentStudent",
    "StudentAssessmentScore",
    "SurveyPeriod",
    "SurveyForm",
    "AuditLog"
  ];

  const counts = {};
  for (const t of tables) {
    try {
      const res = await client.execute(`SELECT COUNT(*) AS cnt FROM "${t}"`);
      counts[t] = Number(res.rows[0]?.cnt ?? 0);
    } catch {
      counts[t] = -1;
    }
  }

  // Check duplicate keys & orphan foreign keys (Read-only SELECT)
  const integrityChecks = {};

  const queries = {
    duplicateStudentCodePerYear: `
      SELECT COUNT(*) AS cnt FROM (
        SELECT "studentCode", "academicYearId", COUNT(*) AS c
        FROM "Student"
        GROUP BY "studentCode", "academicYearId"
        HAVING c > 1
      )
    `,
    orphanStudentsMissingClass: `
      SELECT COUNT(*) AS cnt FROM "Student" s
      LEFT JOIN "Class" c ON c."id" = s."classId"
      WHERE c."id" IS NULL
    `,
    orphanStudentsMissingCampus: `
      SELECT COUNT(*) AS cnt FROM "Student" s
      LEFT JOIN "Campus" cp ON cp."id" = s."campusId"
      WHERE cp."id" IS NULL
    `,
    orphanParentLinks: `
      SELECT COUNT(*) AS cnt FROM "ParentStudentLink" psl
      LEFT JOIN "Student" s ON s."id" = psl."studentId"
      LEFT JOIN "Parent" p ON p."id" = psl."parentId"
      WHERE s."id" IS NULL OR p."id" IS NULL
    `,
    orphanGradeEntriesMissingStudent: `
      SELECT COUNT(*) AS cnt FROM "SubjectGradeEntry" g
      LEFT JOIN "Student" s ON s."id" = g."studentId"
      WHERE s."id" IS NULL
    `,
    orphanInputStudentsMissingPeriod: `
      SELECT COUNT(*) AS cnt FROM "InputAssessmentStudent" ias
      LEFT JOIN "InputAssessmentPeriod" p ON p."id" = ias."periodId"
      WHERE p."id" IS NULL
    `,
    approvedK12InputStudents: `
      SELECT COUNT(*) AS cnt FROM "InputAssessmentStudent"
      WHERE "admissionResult" IS NOT NULL AND TRIM("admissionResult") != ''
    `,
    totalCompositeScoreEntries: `
      SELECT COUNT(*) AS cnt, ROUND(AVG("compositeScore"), 2) AS avgScore
      FROM "SubjectGradeEntry"
      WHERE "compositeScore" IS NOT NULL
    `
  };

  for (const [key, sql] of Object.entries(queries)) {
    try {
      const res = await client.execute(sql);
      integrityChecks[key] = res.rows[0];
    } catch (e) {
      integrityChecks[key] = { error: e.message };
    }
  }

  const indexRes = await client.execute(
    `SELECT COUNT(*) AS cnt FROM sqlite_master WHERE type = 'index'`
  );

  const report = {
    generatedAt: new Date().toISOString(),
    mode: "READ_ONLY_VERIFICATION",
    tableCounts: counts,
    integrityChecks,
    totalSqliteIndexes: Number(indexRes.rows[0]?.cnt ?? 0)
  };

  console.log(JSON.stringify(report, null, 2));
}

runReadOnlyAudit().catch((err) => {
  console.error("Audit error:", err);
  process.exit(1);
});
