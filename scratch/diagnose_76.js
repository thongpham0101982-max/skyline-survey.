const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function run() {
  const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));
  const results = [];

  for (const st of ckdv) {
    const iasRes = await client.execute({
      sql: 'SELECT * FROM InputAssessmentStudent WHERE id = ?',
      args: [st.id]
    });
    const ias = iasRes.rows[0] || {};

    const sasRes = await client.execute({
      sql: 'SELECT sub.code, sub.name, sas.scores FROM StudentAssessmentScore sas JOIN AssessmentSubject sub ON sas.subjectId = sub.id WHERE sas.studentId = ?',
      args: [st.id]
    });

    results.push({
      id: st.id,
      name: st.fullName,
      studentCode: st.studentCode,
      campus: st.campus,
      grade: st.grade,
      className: st.className,
      committed: st.committedSubjects,
      isPsychology: st.isPsychology,
      currentKsdv: {
        math: st.ksdvMath,
        viet: st.ksdvViet,
        van: st.ksdvVan,
        engScale10: st.ksdvEngScale10,
        engTotal: st.ksdvEngTotal
      },
      iasFields: {
        mathScore: ias.mathScore,
        writtenEnglishScore: ias.writtenEnglishScore,
        oralEnglishScore: ias.oralEnglishScore,
        literatureScore: ias.literatureScore,
        admissionCriteria: ias.admissionCriteria,
        admissionResult: ias.admissionResult,
        directorNote: ias.directorNote
      },
      sasScores: sasRes.rows.map(r => ({
        code: r.code,
        name: r.name,
        scores: r.scores
      }))
    });
  }

  fs.writeFileSync(path.join(__dirname, 'diagnose_76_ksdv_full.json'), JSON.stringify(results, null, 2), 'utf8');
  console.log('Saved scratch/diagnose_76_ksdv_full.json successfully!');
}

run().catch(console.error);
