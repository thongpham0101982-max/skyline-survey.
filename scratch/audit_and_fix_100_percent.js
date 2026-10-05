const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

function clean(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, '');
}

async function main() {
  console.log("=== BẮT ĐẦU AUDIT VÀ FIX 100% ĐIỂM CHO 76 HỌC SINH CKĐV ===");
  const students = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

  // 1. Lấy toàn bộ bài thi KSĐN từ SubjectGradeEntry
  const ksdnRes = await client.execute(`
    SELECT 
      sge.id,
      sge.studentId,
      sge.subjectId,
      sge.compositeScore,
      s.subjectCode,
      s.subjectName,
      st.studentCode,
      st.studentName,
      c.className,
      c.grade
    FROM SubjectGradeEntry sge
    JOIN Subject s ON sge.subjectId = s.id
    JOIN Student st ON sge.studentId = st.id
    JOIN Class c ON sge.classId = c.id
    WHERE sge.evaluationPeriod = 'KSĐN'
  `);

  console.log(`Tổng số bản ghi điểm KSĐN: ${ksdnRes.rows.length}`);

  // Build maps
  const ksdnByCode = {};
  const ksdnByName = {};
  for (const row of ksdnRes.rows) {
    if (row.studentCode) {
      const c = row.studentCode.trim().toUpperCase();
      if (!ksdnByCode[c]) ksdnByCode[c] = [];
      ksdnByCode[c].push(row);
    }
    if (row.studentName) {
      const n = clean(row.studentName);
      if (!ksdnByName[n]) ksdnByName[n] = [];
      ksdnByName[n].push(row);
    }
  }

  // Tra cứu cụ thể các trường hợp đặc biệt
  console.log("\n--- Kiểm tra Lê Đình Sĩ Phú / Lê Đình Sỹ Phú ---");
  const siPhuScores = ksdnByCode['0601012380'] || ksdnByName[clean('Lê Đình Sỹ Phú')] || [];
  console.log("Lê Đình Sỹ Phú scores:", siPhuScores.map(s => `${s.subjectName}: ${s.compositeScore}`));

  console.log("\n--- Kiểm tra Ngô Huỳnh Anh Minh ---");
  const stAnhMinh = await client.execute("SELECT id, studentCode, studentName, classId FROM Student WHERE LOWER(studentName) LIKE '%anh minh%'");
  console.log("Students named Anh Minh:", stAnhMinh.rows);
  for (const s of stAnhMinh.rows) {
    const sc = ksdnByCode[s.studentCode] || [];
    console.log(`   ${s.studentName} (${s.studentCode}):`, sc.map(x => `${x.subjectName}: ${x.compositeScore}`));
  }

  // Cập nhật cho 76 học sinh
  let updatedCount = 0;
  for (const st of students) {
    let matched = [];
    const code = (st.studentCode || '').trim().toUpperCase();
    const nameNorm = clean(st.fullName);

    if (code && ksdnByCode[code]) matched = ksdnByCode[code];
    else if (nameNorm && ksdnByName[nameNorm]) matched = ksdnByName[nameNorm];

    // Xử lý alias tên
    if (matched.length === 0) {
      if (st.fullName === 'LÊ ĐÌNH SĨ PHÚ' && ksdnByCode['0601012380']) {
        matched = ksdnByCode['0601012380'];
        st.studentCode = '0601012380';
        st.fullName = 'Lê Đình Sĩ Phú';
      }
    }

    if (matched.length > 0) {
      for (const m of matched) {
        const sname = (m.subjectName || '').toLowerCase();
        const scode = (m.subjectCode || '').toUpperCase();

        if (scode === 'TOA' || sname.includes('toán')) {
          if (st.ksdnMath !== m.compositeScore) {
            console.log(`Cập nhật KSĐN Toán cho ${st.fullName}: ${st.ksdnMath} -> ${m.compositeScore}`);
            st.ksdnMath = m.compositeScore;
            updatedCount++;
          }
        }
        if (scode === 'TVI' || sname.includes('tiếng việt')) {
          if (st.ksdnViet !== m.compositeScore) {
            console.log(`Cập nhật KSĐN Tiếng Việt cho ${st.fullName}: ${st.ksdnViet} -> ${m.compositeScore}`);
            st.ksdnViet = m.compositeScore;
            updatedCount++;
          }
        }
        if (scode === 'NVA' || sname.includes('ngữ văn') || (sname.includes('văn') && !sname.includes('tiếng việt'))) {
          if (st.ksdnVan !== m.compositeScore) {
            console.log(`Cập nhật KSĐN Ngữ Văn cho ${st.fullName}: ${st.ksdnVan} -> ${m.compositeScore}`);
            st.ksdnVan = m.compositeScore;
            updatedCount++;
          }
        }
        if (scode === 'TA' || scode === 'ESL' || sname.includes('anh')) {
          if (st.ksdnEng !== m.compositeScore) {
            console.log(`Cập nhật KSĐN Tiếng Anh cho ${st.fullName}: ${st.ksdnEng} -> ${m.compositeScore}`);
            st.ksdnEng = m.compositeScore;
            updatedCount++;
          }
        }
      }
    }
  }

  console.log(`\nTổng số trường điểm KSĐN được cập nhật bổ sung: ${updatedCount}`);
  fs.writeFileSync(path.join(__dirname, 'exact_commitment_table.json'), JSON.stringify(students, null, 2));
  console.log("Đã lưu lại exact_commitment_table.json");
}

main().catch(console.error);
