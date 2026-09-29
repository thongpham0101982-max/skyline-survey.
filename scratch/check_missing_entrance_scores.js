const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

  console.log("=== CHECKING ALL 76 STUDENTS FOR MISSING KSDV SCORES ===");

  const missingList = [];
  const validList = [];

  for (const st of ckdv) {
    if (st.isPsychology) {
      validList.push({ name: st.fullName, type: 'Tâm lý' });
      continue;
    }

    // Query InputAssessmentStudent directly for all fields
    const iasRes = await client.execute({
      sql: `SELECT * FROM InputAssessmentStudent WHERE id = ?`,
      args: [st.id]
    });
    const ias = iasRes.rows[0];

    // Query StudentAssessmentScore
    const sasRes = await client.execute({
      sql: `
        SELECT sub.code, sub.name, sas.scores 
        FROM StudentAssessmentScore sas
        JOIN AssessmentSubject sub ON sas.subjectId = sub.id
        WHERE sas.studentId = ?
      `,
      args: [st.id]
    });

    const scoresObj = {};
    sasRes.rows.forEach(r => {
      let p = null;
      try { p = JSON.parse(r.scores); } catch (e) {}
      scoresObj[r.code] = { name: r.name, scores: p, raw: r.scores };
    });

    // Check committed subjects
    const committed = Array.isArray(st.committedSubjects) ? st.committedSubjects.join(', ') : (st.committedSubjects || '');
    
    // Check if any committed subject has score
    const hasMath = (scoresObj['TOA'] && scoresObj['TOA'].scores && scoresObj['TOA'].scores[0]) || (ias && ias.mathScore != null);
    const hasViet = (scoresObj['TVI'] && scoresObj['TVI'].scores && scoresObj['TVI'].scores[0]);
    const hasVan = (scoresObj['NVA'] && scoresObj['NVA'].scores && scoresObj['NVA'].scores[0]) || (ias && ias.literatureScore != null);
    const hasEng = (scoresObj['TAv'] && scoresObj['TAv'].scores && scoresObj['TAv'].scores[0]) || 
                   (scoresObj['TAvd'] && scoresObj['TAvd'].scores && scoresObj['TAvd'].scores[0]) ||
                   (scoresObj['EPT'] && scoresObj['EPT'].scores && scoresObj['EPT'].scores[0]) ||
                   (ias && (ias.writtenEnglishScore != null || ias.oralEnglishScore != null));

    const missingSubs = [];
    if (committed.includes('Toán') && !hasMath) missingSubs.push('Toán');
    if (committed.includes('Tiếng Việt') && !hasViet) missingSubs.push('Tiếng Việt');
    if (committed.includes('Ngữ Văn') && !hasVan) missingSubs.push('Ngữ Văn');
    if (committed.includes('Tiếng Anh') && !hasEng) missingSubs.push('Tiếng Anh');

    const totalScoresCount = sasRes.rows.length;

    if (totalScoresCount === 0 || missingSubs.length > 0) {
      missingList.push({
        id: st.id,
        fullName: st.fullName,
        studentCode: st.studentCode,
        campus: st.campus,
        className: st.className,
        grade: st.grade,
        committedSubjects: committed,
        missingSubs,
        totalScoresCount,
        iasData: {
          mathScore: ias?.mathScore,
          literatureScore: ias?.literatureScore,
          writtenEnglishScore: ias?.writtenEnglishScore,
          oralEnglishScore: ias?.oralEnglishScore,
          admissionCriteria: ias?.admissionCriteria,
          admissionResult: ias?.admissionResult,
          directorNote: ias?.directorNote
        },
        sasKeys: Object.keys(scoresObj)
      });
    } else {
      validList.push({
        fullName: st.fullName,
        committed
      });
    }
  }

  console.log(`\nValid / Has all scores: ${validList.length} HS`);
  console.log(`Missing KSĐV scores: ${missingList.length} HS\n`);

  missingList.forEach((m, idx) => {
    console.log(`${idx + 1}. [${m.campus}] ${m.fullName} (${m.className}, Khối ${m.grade}):`);
    console.log(`   Môn cam kết: ${m.committedSubjects}`);
    console.log(`   Môn bị thiếu điểm KSĐV: ${m.missingSubs.join(', ') || 'Không có bản ghi điểm nào'}`);
    console.log(`   SAS keys:`, m.sasKeys);
    console.log(`   IAS Data:`, m.iasData);
    console.log('');
  });
}

main().catch(console.error);
