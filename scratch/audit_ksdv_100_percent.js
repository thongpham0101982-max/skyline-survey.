const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  console.log("=== KIỂM TRA TOÀN DIỆN ĐIỂM KSĐV CỦA 76 HỌC SINH ===");
  const students = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

  // 1. Fetch all AssessmentSubjects
  const asubRes = await client.execute("SELECT * FROM AssessmentSubject");
  const asubMap = {};
  asubRes.rows.forEach(s => asubMap[s.id] = s);

  // 2. Fetch all StudentAssessmentScore for these 76 students
  for (const st of students) {
    const scoresRes = await client.execute({
      sql: "SELECT sas.scores, sub.code, sub.name FROM StudentAssessmentScore sas JOIN AssessmentSubject sub ON sas.subjectId = sub.id WHERE sas.studentId = ?",
      args: [st.id]
    });
    
    // In ra nếu st.ksdvStatus !== 'Đủ điểm'
    if (st.ksdvStatus !== 'Đủ điểm') {
      console.log(`[${st.campus}] ${st.fullName} (Lớp: ${st.className}, K${st.grade}) - Status: ${st.ksdvStatus} - Cam kết: ${(st.committedSubjects||[]).join(', ')}`);
      console.log(`   Hiện có: Math=${st.ksdvMath}, Viet=${st.ksdvViet}, Van=${st.ksdvVan}, Eng=${st.ksdvEngScale10}`);
      console.log(`   Raw scores in DB (${scoresRes.rows.length} rows):`, scoresRes.rows.map(r => `${r.name} (${r.code}): ${r.scores}`));
      
      // Kiểm tra trong InputAssessmentStudent
      const inpRes = await client.execute({
        sql: "SELECT * FROM InputAssessmentStudent WHERE id = ?",
        args: [st.id]
      });
      if (inpRes.rows.length > 0) {
        const inp = inpRes.rows[0];
        console.log(`   InputAssessmentStudent: Math=${inp.mathScore}, Lit=${inp.literatureScore}, EngW=${inp.writtenEnglishScore}, EngO=${inp.oralEnglishScore}, Psy=${inp.psychologyScore}, Note=${inp.directorNote || inp.admissionResult}`);
      }
    }
  }
}

main().catch(console.error);
