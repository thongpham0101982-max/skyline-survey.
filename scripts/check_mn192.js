const { createClient } = require('@libsql/client');
require('dotenv').config();

const url = (process.env.TURSO_DATABASE_URL || '').replace(/^libsql:\/\//, 'https://');
const authToken = process.env.TURSO_AUTH_TOKEN || '';

const client = createClient({ url, authToken });

async function main() {
  const res = await client.execute({
    sql: "SELECT * FROM PreschoolInputAssessmentStudent WHERE studentCode = 'MN192'",
    args: []
  });
  console.log('STUDENT ROW:', JSON.stringify(res.rows[0], null, 2));

  // Check examiners / assessors
  const student = res.rows[0];
  const sessions = await client.execute({
    sql: `SELECT s.*, sess.name as sessionName, sess.sessionDate, sess.startTime, sess.endTime
          FROM PreschoolInputAssessmentStudentSession s
          JOIN PreschoolInputAssessmentSession sess ON s.sessionId = sess.id
          WHERE s.studentId = ?`,
    args: [student.id]
  });
  console.log('SESSIONS:', JSON.stringify(sessions.rows, null, 2));
}
main().catch(console.error);
