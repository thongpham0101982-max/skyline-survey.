const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('--- Checking 76 CKDV students in Turso Cloud ---');
  const ckdvList = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

  // Query all KSĐN entries in Turso
  const entriesRes = await client.execute(`
    SELECT 
      sge.id,
      sge.studentId,
      sge.subjectId,
      sge.compositeScore,
      sge.updatedAt,
      c.className,
      c.grade,
      s.subjectName,
      st.studentCode,
      st.studentName
    FROM SubjectGradeEntry sge
    JOIN Class c ON sge.classId = c.id
    JOIN Subject s ON sge.subjectId = s.id
    JOIN Student st ON sge.studentId = st.id
    WHERE sge.evaluationPeriod = 'KSĐN'
  `);

  console.log(`Total Turso KSĐN entries: ${entriesRes.rows.length}`);

  // Build lookup by studentCode and by studentName (normalized)
  const byCode = {};
  const byName = {};
  for (const r of entriesRes.rows) {
    if (r.studentCode) {
      const c = r.studentCode.trim().toUpperCase();
      if (!byCode[c]) byCode[c] = [];
      byCode[c].push(r);
    }
    if (r.studentName) {
      const n = r.studentName.trim().toLowerCase();
      if (!byName[n]) byName[n] = [];
      byName[n].push(r);
    }
  }

  let matchedCkdvCount = 0;
  let differencesFound = 0;

  for (const st of ckdvList) {
    const code = (st.studentCode || '').trim().toUpperCase();
    const nameNorm = (st.fullName || '').trim().toLowerCase();

    let matchedEntries = [];
    if (code && byCode[code]) {
      matchedEntries = byCode[code];
    } else if (nameNorm && byName[nameNorm]) {
      matchedEntries = byName[nameNorm];
    }

    if (matchedEntries.length > 0) {
      matchedCkdvCount++;
      // Compare scores for committed subjects
      for (const sub of st.committedSubjects) {
        let normSub = sub;
        if (normSub === 'Ngữ văn') normSub = 'Ngữ Văn';

        // Find entry for this subject
        const found = matchedEntries.find(e => {
          const sName = e.subjectName;
          if (normSub === 'Toán' && (sName.includes('Toán') || sName.includes('Math'))) return true;
          if (normSub === 'Tiếng Việt' && sName.includes('Tiếng Việt')) return true;
          if (normSub === 'Ngữ Văn' && (sName.includes('Ngữ văn') || sName.includes('Ngữ Văn') || sName.includes('Văn'))) return true;
          if (normSub === 'Tiếng Anh' && (sName.includes('Tiếng Anh') || sName.includes('English') || sName.includes('ESL'))) return true;
          return false;
        });

        if (found) {
          const currentRecordedScore = st.ksdnScores ? st.ksdnScores[sub] : undefined;
          const tursoScore = Number(found.compositeScore);
          if (currentRecordedScore !== tursoScore) {
            console.log(`[DIFF] ${st.fullName} (${st.className}) - Môn ${sub}: recorded=${currentRecordedScore} vs Turso=${tursoScore} (updatedAt: ${found.updatedAt})`);
            differencesFound++;
          }
        } else {
          if (st.ksdnScores && st.ksdnScores[sub] !== undefined && st.ksdnScores[sub] !== null && st.ksdnScores[sub] !== '—') {
            console.log(`[EXTRA RECORDED] ${st.fullName} has recorded ${sub}=${st.ksdnScores[sub]}, but not found in Turso`);
          }
        }
      }
    } else {
      console.log(`[NO KSĐN ENTRIES] ${st.fullName} (${st.studentCode})`);
    }
  }

  console.log(`Matched CKĐV students: ${matchedCkdvCount}/76`);
  console.log(`Score differences found: ${differencesFound}`);
}

main().catch(console.error);
