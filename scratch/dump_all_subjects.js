const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = (process.env.TURSO_DATABASE_URL || '').trim().replace(/^libsql:\/\//, 'https://');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const client = createClient({ url, authToken });

async function main() {
  const res = await client.execute(`
    SELECT s.id, s.subjectCode, s.subjectName, s.category, s.evaluationType, s.level, s.studyPrograms, s.parentId,
      (SELECT COUNT(*) FROM SubjectQuota sq WHERE sq.subjectId = s.id) as quotaCount,
      (SELECT COUNT(*) FROM TeachingAssignment ta WHERE ta.subjectId = s.id) as assignCount,
      (SELECT COUNT(*) FROM SubjectGradeEntry sge WHERE sge.subjectId = s.id) as gradeCount,
      (SELECT COUNT(*) FROM StudentTermScore sts WHERE sts.subjectId = s.id) as termScoreCount,
      (SELECT COUNT(*) FROM SubjectGradeConfig sgc WHERE sgc.subjectId = s.id) as configCount,
      (SELECT COUNT(*) FROM SubjectCompetency sc WHERE sc.subjectId = s.id) as compCount
    FROM Subject s
    ORDER BY s.category ASC, s.subjectName ASC
  `);

  console.log(JSON.stringify(res.rows, null, 2));
}

main().catch(console.error);
