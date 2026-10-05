const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

function clean(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
}

async function main() {
  console.log("=== RÀ SOÁT ĐẢM BẢO 100% KẾT QUẢ CKĐV VÀ KSĐN CỦA 76 HỌC SINH ===");
  const students = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));

  // Lấy toàn bộ bài thi KSĐN
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

  // Tra cứu từng học sinh trong 76 học sinh
  let countKsdnFound = 0;
  let countKsdnNotFound = 0;

  console.log(`\nKiểm tra đối soát KSĐN:`);
  for (const st of students) {
    const code = (st.studentCode || '').trim().toUpperCase();
    const nameNorm = clean(st.fullName);
    let matched = [];
    if (code && ksdnByCode[code]) matched = ksdnByCode[code];
    else if (nameNorm && ksdnByName[nameNorm]) matched = ksdnByName[nameNorm];

    if (matched.length > 0) {
      countKsdnFound++;
      // Liệu có môn nào trong DB mà trong exact_commitment_table.json đang bị null không?
      for (const m of matched) {
        const sname = (m.subjectName || '').toLowerCase();
        const scode = (m.subjectCode || '').toUpperCase();
        if ((scode === 'TOA' || sname.includes('toán')) && st.ksdnMath == null && m.compositeScore != null) {
          console.log(`[BỔ SUNG KSĐN TOÁN] ${st.fullName}: DB có ${m.compositeScore} nhưng json null!`);
        }
        if ((scode === 'TVI' || sname.includes('tiếng việt')) && st.ksdnViet == null && m.compositeScore != null) {
          console.log(`[BỔ SUNG KSĐN TIẾNG VIỆT] ${st.fullName}: DB có ${m.compositeScore} nhưng json null!`);
        }
        if ((scode === 'NVA' || sname.includes('ngữ văn') || (sname.includes('văn') && !sname.includes('tiếng việt'))) && st.ksdnVan == null && m.compositeScore != null) {
          console.log(`[BỔ SUNG KSĐN NGỮ VĂN] ${st.fullName}: DB có ${m.compositeScore} nhưng json null!`);
        }
        if ((scode === 'TA' || scode === 'ESL' || sname.includes('anh')) && st.ksdnEng == null && m.compositeScore != null) {
          console.log(`[BỔ SUNG KSĐN TIẾNG ANH] ${st.fullName}: DB có ${m.compositeScore} nhưng json null!`);
        }
      }
    } else {
      countKsdnNotFound++;
      if (st.grade > 1 && !st.isPsychology) {
        console.log(`[KHÔNG CÓ BÀI THI KSĐN TRÊN HỆ THỐNG] Khối ${st.grade} - ${st.fullName} (${st.className})`);
      }
    }
  }

  console.log(`\nKết quả tra cứu KSĐN: ${countKsdnFound} HS có bài thi KSĐN, ${countKsdnNotFound} HS không có bài thi KSĐN trên hệ thống.`);
}

main().catch(console.error);
