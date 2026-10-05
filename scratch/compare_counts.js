require('dotenv').config();
const { createClient } = require('@libsql/client');
const cloud = createClient({
  url: process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://'),
  authToken: process.env.TURSO_AUTH_TOKEN
});
const local = createClient({ url: 'file:local.db' });
async function check() {
  const tables = ['ObservationSlot', 'ObservationRegistration', 'ObservationEvaluation', 'TeacherAcademicYearTarget', 'Teacher', 'Department', 'Campus'];
  for (const t of tables) {
    try {
      const cRes = await cloud.execute(`SELECT COUNT(*) as count FROM ${t}`);
      const lRes = await local.execute(`SELECT COUNT(*) as count FROM ${t}`);
      console.log(`${t.padEnd(28)}: Cloud = ${cRes.rows[0].count} | Local = ${lRes.rows[0].count}`);
    } catch (e) {
      console.log(`${t}: Error ${e.message}`);
    }
  }
}
check();
