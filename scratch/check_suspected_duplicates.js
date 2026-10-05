const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = (process.env.TURSO_DATABASE_URL || '').trim().replace(/^libsql:\/\//, 'https://');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const client = createClient({ url, authToken });

async function checkSubjectAllRelations(code) {
  const subRes = await client.execute(`SELECT * FROM Subject WHERE subjectCode = '${code}'`);
  if (subRes.rows.length === 0) return console.log(`Not found ${code}`);
  const s = subRes.rows[0];
  console.log(`\n=== CHECKING SUBJECT [${s.subjectCode}] "${s.subjectName}" (id: ${s.id}) ===`);
  const tables = [
    ['SubjectQuota', 'subjectId'],
    ['TeachingAssignment', 'subjectId'],
    ['SubjectGradeEntry', 'subjectId'],
    ['StudentTermScore', 'subjectId'],
    ['SubjectGradeConfig', 'subjectId'],
    ['SubjectCompetency', 'subjectId'],
    ['SubjectAlias', 'subjectId'],
    ['LearningSupportAssignment', 'subjectId'],
    ['Teacher', 'mainSubjectId'],
    ['Subject', 'parentId']
  ];
  for (const [tbl, col] of tables) {
    try {
      const res = await client.execute(`SELECT COUNT(*) as c FROM ${tbl} WHERE ${col} = '${s.id}'`);
      if (res.rows[0].c > 0) {
        console.log(`  -> ${tbl}.${col}: ${res.rows[0].c} records`);
      }
    } catch (e) {
      // Table or column might not exist
    }
  }
}

async function main() {
  const codesToCheck = ['TAV', 'TAv', 'TAvd', 'MI_THUAT', 'AM_NHAC', 'MATHS_CAMBRIDGE', 'ICT', 'ESA', 'CD_CXXH', 'STEM'];
  for (const code of codesToCheck) {
    await checkSubjectAllRelations(code);
  }
}

main().catch(console.error);
