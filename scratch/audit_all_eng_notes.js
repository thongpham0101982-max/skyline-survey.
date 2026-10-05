const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const url = process.env.TURSO_DATABASE_URL || ('file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/'));
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

async function run() {
  const res = await client.execute(`
    SELECT s.grade, s.studentCode, s.fullName, sub.name as subName, sub.code as subCode, sas.scores, sas.comments
    FROM StudentAssessmentScore sas
    JOIN InputAssessmentStudent s ON sas.studentId = s.id
    JOIN AssessmentSubject sub ON sas.subjectId = sub.id
    WHERE sub.name LIKE '%Anh%' OR sub.code LIKE '%TAv%' OR sub.code LIKE '%EPT%'
  `);
  console.log('Total English records:', res.rows.length);

  // Group by studentCode
  const byStudent = {};
  for (const r of res.rows) {
    if (!byStudent[r.studentCode]) byStudent[r.studentCode] = { grade: r.grade, name: r.fullName, items: [] };
    byStudent[r.studentCode].items.push(r);
  }

  // Check how many students have note like X/Y in comments
  let noteMatches = 0;
  for (const [code, st] of Object.entries(byStudent)) {
    const lines = [];
    st.items.forEach(it => {
      let cmt = '';
      try {
        const p = JSON.parse(it.comments);
        cmt = Array.isArray(p) ? p.join(' ') : String(p || '');
      } catch { cmt = it.comments || ''; }
      const match = cmt.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
      if (match) {
        noteMatches++;
        lines.push(`${it.subCode}: score=${it.scores} | noteMatch=${match[0]}`);
      }
    });
    if (lines.length > 0) {
      console.log(`[Grade ${st.grade}] ${code} (${st.name}):`, lines.join('; '));
    }
  }
  console.log(`Total students with note matching X/Y: ${noteMatches}`);
}
run().catch(console.error);
