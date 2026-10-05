const { createClient } = require('@libsql/client');
require('dotenv').config();
const client = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

async function findExact83() {
  const allRes = await client.execute(`SELECT * FROM InputAssessmentStudent`);
  console.log('Total InputAssessmentStudent:', allRes.rows.length);

  // Check different conditions
  const r1 = allRes.rows.filter(r => {
    const t = `${r.admissionResult || ''} ${r.directorNote || ''}`.toLowerCase();
    return t.includes('cam kết') || t.includes('cam ket');
  });
  console.log('r1 (admissionResult or directorNote has cam ket):', r1.length);

  const r2 = allRes.rows.filter(r => {
    const t = `${r.admissionResult || ''} ${r.directorNote || ''} ${r.admissionCriteria || ''}`.toLowerCase();
    return t.includes('cam kết') || t.includes('cam ket');
  });
  console.log('r2 (+ admissionCriteria):', r2.length);

  const r3 = allRes.rows.filter(r => {
    const t = `${r.admissionResult || ''} ${r.directorNote || ''} ${r.targetType || ''}`.toLowerCase();
    return t.includes('cam kết') || t.includes('cam ket');
  });
  console.log('r3 (+ targetType):', r3.length);

  // Exclude test accounts
  const r4 = r1.filter(r => !r.fullName.includes('Nguyen B') && r.fullName.trim() !== '');
  console.log('r4 (r1 without test):', r4.length);

  // What about in Student table or ClassStudent?
  // Let's check TeacherStudentSupport or LearningCommitment or similar tables
  const tables = await client.execute(`SELECT name FROM sqlite_master WHERE type='table'`);
  console.log('Tables:', tables.rows.map(t => t.name).join(', '));
}

findExact83().catch(console.error);
