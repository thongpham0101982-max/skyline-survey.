const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const url = process.env.TURSO_DATABASE_URL || ('file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/'));
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

async function run() {
  const sas = await client.execute(`
    SELECT sas.studentId, sub.name as subName, sub.code as subCode, sas.scores
    FROM StudentAssessmentScore sas
    JOIN AssessmentSubject sub ON sas.subjectId = sub.id
    WHERE sub.name LIKE '%Anh%' OR sub.code LIKE '%TAv%'
  `);
  
  const ias = await client.execute(`
    SELECT id, studentCode, fullName, grade, oralEnglishScore, writtenEnglishScore
    FROM InputAssessmentStudent
  `);
  const iasMap = {};
  ias.rows.forEach(r => iasMap[r.id] = r);

  const missingInIas = [];
  for (const r of sas.rows) {
    const st = iasMap[r.studentId];
    if (!st) continue;
    let val = null;
    try {
      const p = JSON.parse(r.scores);
      val = Array.isArray(p) ? p.find(x => x !== "" && x != null) : p;
    } catch { val = r.scores; }

    if (val !== undefined && val !== null && val !== "") {
      const isOral = (r.subName || '').toLowerCase().includes('vấn đáp') || (r.subCode || '').toLowerCase().includes('tavd');
      const isWritten = (r.subName || '').toLowerCase().includes('viết') || (r.subCode || '').toLowerCase() === 'tav';
      if (isOral && (st.oralEnglishScore === null || st.oralEnglishScore === undefined)) {
        missingInIas.push({ id: st.id, code: st.studentCode, name: st.fullName, type: 'oral', score: val });
      }
      if (isWritten && (st.writtenEnglishScore === null || st.writtenEnglishScore === undefined)) {
        missingInIas.push({ id: st.id, code: st.studentCode, name: st.fullName, type: 'written', score: val });
      }
    }
  }

  console.log(`Found ${missingInIas.length} missing English scores in InputAssessmentStudent:`);
  missingInIas.forEach(m => console.log(`  - [${m.code}] ${m.name} (${m.type}): sasScore=${m.score}`));
}
run().catch(console.error);
