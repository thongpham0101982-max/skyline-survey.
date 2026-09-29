const fs = require('fs');
const path = require('path');

const reportData = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'exact_report_data.json'), 'utf8'));
const commitments = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'exact_commitment_table.json'), 'utf8'));

// 1. Generate tables for each Level
function generateLevelMarkdown(levelName) {
  const subs = reportData.dataByLevel[levelName];
  let md = `### BẬC ${levelName.toUpperCase()}\n\n`;
  md += `| STT | Môn | Khối | Cơ sở | Số HS khảo sát | Số HS < 5.0 (Dưới TB) | Tỷ lệ < 5.0 | Số HS Đạt chuẩn | Tỷ lệ Đạt chuẩn | Số HS Giỏi (8-10) | Tỷ lệ Giỏi |\n`;
  md += `| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  let stt = 1;
  let levelTotal = 0, levelBelow = 0, levelBench = 0, levelGood = 0;

  for (const subName of Object.keys(subs)) {
    let subTotal = 0, subBelow = 0, subBench = 0, subGood = 0;

    for (const gradeStr of Object.keys(subs[subName])) {
      const campuses = subs[subName][gradeStr];
      for (const cmp of Object.keys(campuses)) {
        const s = campuses[cmp];
        subTotal += s.total;
        subBelow += s.belowAvg;
        subBench += s.atBenchmark;
        subGood += s.good;

        const belowPct = s.total > 0 ? ((s.belowAvg / s.total) * 100).toFixed(1) + '%' : '0.0%';
        const benchPct = s.total > 0 ? ((s.atBenchmark / s.total) * 100).toFixed(1) + '%' : '0.0%';
        const goodPct = s.total > 0 ? ((s.good / s.total) * 100).toFixed(1) + '%' : '0.0%';

        md += `| ${stt++} | ${subName} | ${gradeStr} | ${cmp} | ${s.total} | ${s.belowAvg} | ${belowPct} | ${s.atBenchmark} | ${benchPct} | ${s.good} | ${goodPct} |\n`;
      }
    }

    levelTotal += subTotal;
    levelBelow += subBelow;
    levelBench += subBench;
    levelGood += subGood;

    const subBelowPct = subTotal > 0 ? ((subBelow / subTotal) * 100).toFixed(1) + '%' : '0.0%';
    const subBenchPct = subTotal > 0 ? ((subBench / subTotal) * 100).toFixed(1) + '%' : '0.0%';
    const subGoodPct = subTotal > 0 ? ((subGood / subTotal) * 100).toFixed(1) + '%' : '0.0%';

    md += `| **-** | **${subName}** | **Toàn khối** | **TỔNG CƠ SỞ** | **${subTotal}** | **${subBelow}** | **${subBelowPct}** | **${subBench}** | **${subBenchPct}** | **${subGood}** | **${subGoodPct}** |\n`;
  }

  const levBelowPct = levelTotal > 0 ? ((levelBelow / levelTotal) * 100).toFixed(1) + '%' : '0.0%';
  const levBenchPct = levelTotal > 0 ? ((levelBench / levelTotal) * 100).toFixed(1) + '%' : '0.0%';
  const levGoodPct = levelTotal > 0 ? ((levelGood / levelTotal) * 100).toFixed(1) + '%' : '0.0%';

  md += `| **TỔNG** | **BẬC ${levelName.toUpperCase()}** | **TOÀN BẬC** | **TỔNG HỆ THỐNG** | **${levelTotal}** | **${levelBelow}** | **${levBelowPct}** | **${levelBench}** | **${levBenchPct}** | **${levelGood}** | **${levGoodPct}** |\n\n`;

  return md;
}

// 2. Generate Commitment Tables by Campus
function generateCommitmentMarkdown() {
  const byCampus = {};
  for (const st of commitments) {
    const cmp = st.campus || 'Khác';
    if (!byCampus[cmp]) byCampus[cmp] = [];
    byCampus[cmp].push(st);
  }

  let md = `### DANH SÁCH HỌC SINH CÓ CAM KẾT ĐẦU VÀO (CKĐV) NHẬP HỌC THEO CƠ SỞ\n\n`;

  for (const cmp of Object.keys(byCampus).sort()) {
    md += `#### Cơ sở: ${cmp} (${byCampus[cmp].length} học sinh)\n\n`;
    md += `| STT | Họ và tên | Lớp | Môn CKĐV | Điểm KSĐV Môn Cam Kết | Điểm KSĐN Môn Tương Ứng | Ghi chú & Trạng thái |\n`;
    md += `| :---: | :--- | :---: | :--- | :--- | :--- | :--- |\n`;

    byCampus[cmp].forEach((s, idx) => {
      const isPsy = s.isPsychology || s.committedSubjects.includes('Tâm lý');
      const monCK = s.committedSubjects.join(', ');

      let ksdvStr = '';
      let ksdnStr = '';

      if (isPsy && s.committedSubjects.length === 1) {
        ksdvStr = '-';
        ksdnStr = '-';
      } else {
        const partsKSĐV = [];
        const partsKSĐN = [];
        if (s.committedSubjects.includes('Toán')) {
          partsKSĐV.push(`Toán: ${s.ksdvMath ?? 'N/A'}`);
          partsKSĐN.push(`Toán: ${s.ksdnMath ?? 'N/A'}`);
        }
        if (s.committedSubjects.includes('Tiếng Việt')) {
          partsKSĐV.push(`Tiếng Việt: ${s.ksdvViet ?? 'N/A'}`);
          partsKSĐN.push(`Tiếng Việt: ${s.ksdnViet ?? 'N/A'}`);
        }
        if (s.committedSubjects.includes('Ngữ Văn')) {
          partsKSĐV.push(`Ngữ Văn: ${s.ksdvVan ?? 'N/A'}`);
          partsKSĐN.push(`Ngữ Văn: ${s.ksdnVan ?? 'N/A'}`);
        }
        if (s.committedSubjects.includes('Tiếng Anh')) {
          partsKSĐV.push(`Tiếng Anh: ${s.ksdvEng ?? 'N/A'}`);
          partsKSĐN.push(`Tiếng Anh: ${s.ksdnEng ?? 'N/A'}`);
        }
        ksdvStr = partsKSĐV.length > 0 ? partsKSĐV.join('; ') : '-';
        ksdnStr = partsKSĐN.length > 0 ? partsKSĐN.join('; ') : '-';
      }

      let note = '';
      if (isPsy) {
        note = '**HS Cam kết tâm lý**';
      } else if (s.directorNote) {
        note = s.directorNote.substring(0, 45);
      } else {
        note = 'Theo dõi chuyên môn';
      }

      md += `| ${idx + 1} | ${s.fullName} | ${s.className} | ${monCK} | ${ksdvStr} | ${ksdnStr} | ${note} |\n`;
    });

    md += '\n';
  }

  return md;
}

const outMd = `
# DỮ LIỆU THỰC TẾ TRÍCH XUẤT TỪ HỆ THỐNG SSM

${generateLevelMarkdown('Tiểu học')}

${generateLevelMarkdown('THCS')}

${generateLevelMarkdown('THPT')}

${generateCommitmentMarkdown()}
`;

fs.writeFileSync(path.resolve(__dirname, 'exact_report_snippet.md'), outMd);
console.log('Saved exact_report_snippet.md');
