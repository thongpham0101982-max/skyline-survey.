const { createClient } = require('@libsql/client');
const client = createClient({
  url: 'https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw'
});

async function main() {
  const clsId = 'cmrekxqs90047hy95i2liymbu';
  const ayId = 'cmnseevbh0000wjbmoigji2zd';
  
  const sts = await client.execute({
    sql: 'SELECT id, studentCode, studentName FROM Student WHERE classId = ?',
    args: [clsId]
  });
  console.log('Students in class:', sts.rows.length);
  const sIds = sts.rows.map(s => s.id);
  const placeholders = sIds.map(() => '?').join(',');

  const res = await client.execute({
    sql: `SELECT * FROM StudentGoalAdjustmentRequest WHERE studentId IN (${placeholders}) AND (academicYearId = ? OR ? = '') ORDER BY createdAt DESC`,
    args: [...sIds, ayId, ayId]
  });
  console.log('Adjustment requests count:', res.rows.length);
  console.log('Adjustment requests:', res.rows);
}
main().catch(console.error);
