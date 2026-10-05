const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const TURSO_URL = process.env.TURSO_DATABASE_URL || "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || "";

console.log('Connecting to Turso Cloud:', TURSO_URL);

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN
});

async function main() {
  // 1. Check all periods to see the survey periods
  const periods = await client.execute(`SELECT id, name, code, academicYearId, status, createdAt FROM InputAssessmentPeriod ORDER BY createdAt DESC`);
  console.log('\n--- Periods Count:', periods.rows.length);
  periods.rows.slice(0, 10).forEach(p => console.log('  ', p.id, '|', p.code, '|', p.name, '| Status:', p.status));

  // 2. Count total students in InputAssessmentStudent
  const totalStudents = await client.execute(`SELECT count(*) as cnt FROM InputAssessmentStudent`);
  console.log('\n--- Total InputAssessmentStudent rows:', totalStudents.rows[0].cnt);

  // 3. Count total scores in StudentAssessmentScore
  const totalScores = await client.execute(`SELECT count(*) as cnt FROM StudentAssessmentScore`);
  console.log('--- Total StudentAssessmentScore rows:', totalScores.rows[0].cnt);

  // 4. Check completed admission students (CKDV completed)
  const completedCkdv = await client.execute(`
    SELECT count(*) as cnt 
    FROM InputAssessmentStudent 
    WHERE admissionResult = 'Đạt cam kết' 
      AND (admissionStatus = 'COMPLETED' OR admissionStatus = 'Completed' OR admissionStatus IS NULL)
  `);
  console.log('--- Total Đạt cam kết students:', completedCkdv.rows[0].cnt);

  // 5. Let's check 76 students specifically to see if any scores changed
  const currentCkdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));
  console.log('\n--- Checking 76 CKDV students in Turso:');

  let updatedStudents = 0;
  for (const st of currentCkdv) {
    let q = `SELECT id, studentCode, fullName, admissionCampus, grade, className, 
                    mathScore, writtenEnglishScore, oralEnglishScore, literatureScore, psychologyScore,
                    admissionCriteria, admissionResult, directorNote, admissionStatus, createdAt
             FROM InputAssessmentStudent 
             WHERE id = ?`;
    let args = [st.id];
    if (st.studentCode && st.studentCode !== '' && st.studentCode !== '—') {
      q += ` OR studentCode = ?`;
      args.push(st.studentCode);
    }
    q += ` ORDER BY createdAt DESC`;

    const res = await client.execute({ sql: q, args });
    if (res.rows.length > 0) {
      const latest = res.rows[0];
      // Check className
      if (latest.className && latest.className !== st.className) {
        console.log(`Class change for ${st.fullName}: ${st.className} -> ${latest.className}`);
        st.className = latest.className;
        updatedStudents++;
      }
    }
  }
  console.log(`Total students with class changes: ${updatedStudents}`);
}

main().catch(console.error);
