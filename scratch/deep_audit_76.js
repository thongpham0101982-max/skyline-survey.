const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

  const report = [];

  for (let i = 0; i < ckdv.length; i++) {
    const st = ckdv[i];
    // Find all records for this student by fullName or id
    const res = await client.execute({
      sql: `SELECT id, studentCode, fullName, admissionCampus, grade, className, 
                   mathScore, writtenEnglishScore, oralEnglishScore, literatureScore, psychologyScore,
                   admissionCriteria, admissionResult, directorNote, isAbsent
            FROM InputAssessmentStudent 
            WHERE id = ? OR (fullName = ? AND admissionCampus = ?)`,
      args: [st.id, st.fullName, st.campus]
    });

    const studentRecords = [];
    for (const r of res.rows) {
      const sas = await client.execute({
        sql: `SELECT sub.code, sub.name, sas.scores 
              FROM StudentAssessmentScore sas 
              JOIN AssessmentSubject sub ON sas.subjectId = sub.id 
              WHERE sas.studentId = ?`,
        args: [r.id]
      });

      const parsedScores = {};
      sas.rows.forEach(s => {
        let val = null;
        try {
          const p = JSON.parse(s.scores);
          if (Array.isArray(p)) {
            val = p.length > 0 ? p[0] : null;
          } else {
            val = p;
          }
        } catch (e) {
          val = s.scores;
        }
        if (val !== '' && val !== null && val !== undefined) {
          parsedScores[s.code] = { name: s.name, val };
        }
      });

      studentRecords.push({
        id: r.id,
        isOriginalId: r.id === st.id,
        studentCode: r.studentCode,
        grade: r.grade,
        className: r.className,
        criteria: r.admissionCriteria,
        result: r.admissionResult,
        note: r.directorNote,
        isAbsent: r.isAbsent,
        directScores: {
          math: r.mathScore,
          engW: r.writtenEnglishScore,
          engO: r.oralEnglishScore,
          lit: r.literatureScore,
          psy: r.psychologyScore
        },
        sasScores: parsedScores
      });
    }

    report.push({
      stt: i + 1,
      id: st.id,
      name: st.fullName,
      campus: st.campus,
      grade: st.grade,
      className: st.className,
      committed: st.committedSubjects,
      isPsychology: st.isPsychology,
      records: studentRecords
    });
  }

  fs.writeFileSync(path.join(__dirname, 'all_76_deep_entrance_audit.json'), JSON.stringify(report, null, 2), 'utf8');
  console.log('Saved deep entrance audit to all_76_deep_entrance_audit.json');
}

main().catch(console.error);
