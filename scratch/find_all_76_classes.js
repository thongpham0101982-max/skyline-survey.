const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  const ckdv = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

  console.log('Finding classes for all 76 students...');

  const results = [];

  for (let i = 0; i < ckdv.length; i++) {
    const st = ckdv[i];

    // 1. Check InputAssessmentStudent record directly
    const iasRes = await client.execute({
      sql: `SELECT ias.id, ias.studentCode, ias.fullName, ias.className as iasClassName, 
                   ias.enrollmentClassId, ias.enrollmentCode, ias.grade as iasGrade,
                   c.className as enrollmentClassName, c.classCode as enrollmentClassCode
            FROM InputAssessmentStudent ias
            LEFT JOIN Class c ON ias.enrollmentClassId = c.id
            WHERE ias.id = ?`,
      args: [st.id]
    });
    const ias = iasRes.rows[0] || {};

    // 2. Search Student table by studentCode or studentName
    const sRes = await client.execute({
      sql: `SELECT s.id, s.studentCode, s.studentName, s.classId, c.className, c.classCode, c.grade
            FROM Student s
            LEFT JOIN Class c ON s.classId = c.id
            WHERE s.studentName LIKE ? OR (s.studentCode = ? AND s.studentCode != '' AND s.studentCode != 'HS101')`,
      args: ['%' + st.fullName.trim() + '%', st.studentCode || '']
    });

    results.push({
      stt: i + 1,
      id: st.id,
      fullName: st.fullName,
      campus: st.campus,
      currentClass: st.className,
      currentGrade: st.grade,
      ias: {
        className: ias.iasClassName,
        enrollmentClassId: ias.enrollmentClassId,
        enrollmentClassName: ias.enrollmentClassName,
        enrollmentClassCode: ias.enrollmentClassCode,
        enrollmentCode: ias.enrollmentCode
      },
      studentTableMatches: sRes.rows.map(r => ({
        code: r.studentCode,
        name: r.studentName,
        className: r.className,
        classCode: r.classCode,
        grade: r.grade
      }))
    });
  }

  fs.writeFileSync(path.join(__dirname, 'found_classes_76.json'), JSON.stringify(results, null, 2), 'utf8');

  // Print summary of students whose currentClass was 'Chưa rõ' or null
  console.log('\n=== STUDENTS CURRENTLY WITH "Chưa rõ" OR NULL CLASS ===\n');
  const unknownList = results.filter(r => !r.currentClass || r.currentClass === 'Chưa rõ');
  console.log(`Total currently unknown: ${unknownList.length} students`);
  unknownList.forEach(r => {
    console.log(`[STT ${r.stt}] ${r.fullName} (${r.campus}, Khối ${r.currentGrade}):`);
    console.log(`  IAS enrollmentClass: ${r.ias.enrollmentClassName || r.ias.enrollmentClassCode || 'none'}`);
    console.log(`  IAS className: ${r.ias.className || 'none'}`);
    console.log(`  Student table matches:`, r.studentTableMatches);
    console.log('----------------------------------------------------');
  });
}

main().catch(console.error);
