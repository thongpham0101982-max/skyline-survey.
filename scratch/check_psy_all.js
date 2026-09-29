const { createClient } = require('@libsql/client');
const path = require('path');

const dbFile = path.resolve(__dirname, '../local.db');
const client = createClient({
  url: 'file:' + dbFile.replace(/\\/g, '/')
});

async function main() {
  const inputRes = await client.execute(`SELECT * FROM InputAssessmentStudent`);
  
  console.log('=== DANH SÁCH TẤT CẢ HỌC SINH CÓ LIÊN QUAN TÂM LÝ / TẬP TRUNG / HÀNH VI ===');
  inputRes.rows.forEach(st => {
    const text = `${st.fullName} ${st.admissionResult || ''} ${st.directorNote || ''} ${st.admissionCriteria || ''} ${st.targetType || ''}`.toLowerCase();
    if (text.includes('tâm lý') || text.includes('tam ly') || text.includes('tập trung') || text.includes('hành vi') || text.includes('psychology') || (st.psychologyScore && Number(st.psychologyScore) > 0)) {
      console.log(`- Mã: ${st.studentCode || st.enrollmentCode || 'N/A'} | Tên: ${st.fullName} | Khối: ${st.grade} | Lớp: ${st.className} | Trạng thái: ${st.enrollmentStatus}`);
      console.log(`  KQ: ${st.admissionResult}`);
      console.log(`  Điểm tâm lý: ${st.psychologyScore}`);
      console.log(`  Ghi chú: ${st.directorNote}`);
      console.log('--------------------------------------------------');
    }
  });
}

main().catch(console.error);
