const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = (process.env.TURSO_DATABASE_URL || '').trim().replace(/^libsql:\/\//, 'https://');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const client = createClient({ url, authToken });

async function main() {
  console.log('=== 1. AssessmentSubject (KSĐV - Khảo sát đầu vào) ===');
  const asRes = await client.execute('SELECT id, code, name, subjectType, sortOrder, status FROM AssessmentSubject ORDER BY sortOrder ASC, code ASC');
  console.log(JSON.stringify(asRes.rows, null, 2));

  console.log('\n=== 2. StudentAssessmentScore distinct subject codes or subjects ===');
  const sasRes = await client.execute(`
    SELECT DISTINCT asub.code, asub.name, COUNT(*) as scoreCount
    FROM StudentAssessmentScore sas
    JOIN AssessmentSubject asub ON sas.subjectId = asub.id
    GROUP BY asub.code, asub.name
  `);
  console.log(JSON.stringify(sasRes.rows, null, 2));

  console.log('\n=== 3. SubjectAlias (Mapping alias from KQHT / imports) ===');
  const aliasRes = await client.execute(`
    SELECT sa.id, sa.aliasPattern, sa.normalizedKey, s.subjectCode, s.subjectName
    FROM SubjectAlias sa
    JOIN Subject s ON sa.subjectId = s.id
    ORDER BY s.subjectCode ASC
  `);
  console.log(JSON.stringify(aliasRes.rows, null, 2));

  console.log('\n=== 4. Check Subject parent-child hierarchy ===');
  const parentRes = await client.execute(`
    SELECT child.id, child.subjectCode as childCode, child.subjectName as childName, child.parentId,
           parent.subjectCode as parentCode, parent.subjectName as parentName
    FROM Subject child
    LEFT JOIN Subject parent ON child.parentId = parent.id
    WHERE child.parentId IS NOT NULL
  `);
  console.log(JSON.stringify(parentRes.rows, null, 2));

  console.log('\n=== 5. Check TA, TAV, TAv, TAvd detail in Subject ===');
  const taRes = await client.execute(`
    SELECT id, subjectCode, subjectName, category, evaluationType, level, studyPrograms, parentId
    FROM Subject
    WHERE subjectCode IN ('TA', 'TAV', 'TAv', 'TAvd') OR subjectName LIKE '%Tiếng Anh%'
  `);
  console.log(JSON.stringify(taRes.rows, null, 2));
}

main().catch(console.error);
