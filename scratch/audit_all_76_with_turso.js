const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
  console.log('--- Fetching all Student and SubjectGradeEntry data from Turso Cloud ---');

  // 2. All SubjectGradeEntry for KSĐN
  const sgeRes = await client.execute(`
    SELECT 
      sge.id, sge.studentId, sge.subjectId, sge.compositeScore, sge.updatedAt,
      s.subjectName, s.subjectCode,
      c.className, c.grade, cmp.campusCode,
      st.studentCode, st.studentName
    FROM SubjectGradeEntry sge
    JOIN Subject s ON sge.subjectId = s.id
    JOIN Student st ON sge.studentId = st.id
    JOIN Class c ON sge.classId = c.id
    JOIN Campus cmp ON c.campusId = cmp.id
    WHERE sge.evaluationPeriod = 'KSĐN'
  `);
  console.log(`Total KSĐN entries in DB: ${sgeRes.rows.length}`);

  const ckdvList = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

  // Group KSĐN by studentId and also by normalized studentName
  const ksdnByStudentId = {};
  const ksdnByNameAndClass = {};
  const ksdnByName = {};

  for (const row of sgeRes.rows) {
    if (!ksdnByStudentId[row.studentId]) ksdnByStudentId[row.studentId] = [];
    ksdnByStudentId[row.studentId].push(row);

    const normName = row.studentName.trim().toLowerCase();
    const key = `${normName}_${(row.className || '').trim().toLowerCase()}`;
    if (!ksdnByNameAndClass[key]) ksdnByNameAndClass[key] = [];
    ksdnByNameAndClass[key].push(row);

    if (!ksdnByName[normName]) ksdnByName[normName] = [];
    ksdnByName[normName].push(row);
  }

  // Audit each of 76 CKĐV students
  let updatesCount = 0;
  for (const st of ckdvList) {
    const normName = st.fullName.trim().toLowerCase();
    const clsNorm = (st.className || '').trim().toLowerCase();
    const key = `${normName}_${clsNorm}`;

    let matchedEntries = ksdnByNameAndClass[key];
    if (!matchedEntries || matchedEntries.length === 0) {
      matchedEntries = ksdnByName[normName];
    }

    if (matchedEntries && matchedEntries.length > 0) {
      // Find actual student record
      const sample = matchedEntries[0];
      if (sample.studentCode && sample.studentCode !== st.studentCode) {
        console.log(`[CODE UPDATE] ${st.fullName}: oldCode=${st.studentCode} -> correctCode=${sample.studentCode} (class: ${sample.className})`);
        st.studentCode = sample.studentCode;
      }
      if (sample.className && sample.className !== st.className) {
        console.log(`[CLASS UPDATE] ${st.fullName}: oldClass=${st.className} -> correctClass=${sample.className}`);
        st.className = sample.className;
      }

      // Check each subject
      for (const entry of matchedEntries) {
        const subName = entry.subjectName;
        const score = Number(entry.compositeScore);

        if (subName.includes('Toán') || subName.includes('Math')) {
          if (st.ksdnMath !== score) {
            console.log(`[SCORE UPDATE] ${st.fullName} (${st.className}) - Toán: ${st.ksdnMath} -> ${score}`);
            st.ksdnMath = score;
            updatesCount++;
          }
        }
        if (subName.includes('Tiếng Việt')) {
          if (st.ksdnViet !== score) {
            console.log(`[SCORE UPDATE] ${st.fullName} (${st.className}) - Tiếng Việt: ${st.ksdnViet} -> ${score}`);
            st.ksdnViet = score;
            updatesCount++;
          }
        }
        if (subName.includes('Ngữ văn') || subName.includes('Ngữ Văn') || subName.includes('Văn')) {
          if (st.ksdnVan !== score) {
            console.log(`[SCORE UPDATE] ${st.fullName} (${st.className}) - Ngữ Văn: ${st.ksdnVan} -> ${score}`);
            st.ksdnVan = score;
            updatesCount++;
          }
        }
        if (subName.includes('Tiếng Anh') || subName.includes('English') || subName.includes('ESL')) {
          if (st.ksdnEng !== score) {
            console.log(`[SCORE UPDATE] ${st.fullName} (${st.className}) - Tiếng Anh: ${st.ksdnEng} -> ${score}`);
            st.ksdnEng = score;
            updatesCount++;
          }
        }
      }
    } else {
      console.log(`[NO KSĐN FOUND] ${st.fullName} (Lớp: ${st.className}, Mã: ${st.studentCode})`);
    }
  }

  console.log(`Total score updates applied to 76 CKĐV: ${updatesCount}`);

  // Save updated exact_commitment_table.json
  fs.writeFileSync(path.join(__dirname, 'exact_commitment_table.json'), JSON.stringify(ckdvList, null, 2), 'utf8');
  console.log('Saved updated exact_commitment_table.json!');
}

main().catch(console.error);
