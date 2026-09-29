const { createClient } = require('@libsql/client');
const path = require('path');
const client = createClient({ url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/') });

async function main() {
  const res = await client.execute(`
    SELECT c.level, COUNT(*) as count 
    FROM SubjectGradeEntry sge 
    JOIN Class c ON sge.classId = c.id 
    WHERE sge.evaluationPeriod = 'KSĐN' 
      AND (sge.compositeScore IS NULL OR sge.compositeScore = '' OR sge.compositeScore = 'null')
    GROUP BY c.level
  `);
  console.log('Null/empty scores by level:');
  console.log(res.rows);
}
main().catch(console.error);
