const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const client = createClient({
  url: 'file:' + path.resolve(__dirname, '../local.db').replace(/\\/g, '/')
});

async function main() {
  // 1. Fetch AssessmentSubjects
  const asubRes = await client.execute("SELECT * FROM AssessmentSubject");
  const asubMap = {};
  asubRes.rows.forEach(s => asubMap[s.id] = s);

  // 2. Fetch StudentAssessmentScore
  const sasRes = await client.execute("SELECT * FROM StudentAssessmentScore");
  const sasByStudent = {};
  for (const r of sasRes.rows) {
    if (!sasByStudent[r.studentId]) sasByStudent[r.studentId] = [];
    const sub = asubMap[r.subjectId];
    let scoreVal = null;
    try {
      const parsed = JSON.parse(r.scores);
      if (Array.isArray(parsed)) {
        scoreVal = parsed.find(x => x !== undefined && x !== '' && x !== null);
      } else {
        scoreVal = parsed;
      }
    } catch {
      scoreVal = r.scores;
    }
    sasByStudent[r.studentId].push({
      subjectId: r.subjectId,
      subjectCode: sub?.code,
      subjectName: sub?.name,
      scoreVal: scoreVal !== null && !isNaN(Number(scoreVal)) ? Number(scoreVal) : scoreVal
    });
  }

  // 3. Load commitments
  const commTable = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'exact_commitment_table.json'), 'utf8'));

  for (const st of commTable) {
    const sasList = sasByStudent[st.id] || [];
    let w = null, o = null, ept = null;
    for (const sc of sasList) {
      const code = (sc.subjectCode || '').toUpperCase();
      const sname = (sc.subjectName || '').toLowerCase();
      if (code === 'EPT' || sname.includes('ept')) {
        if (!isNaN(parseFloat(sc.scoreVal))) ept = parseFloat(sc.scoreVal);
      } else if (code === 'TAV' || sname.includes('viết')) {
        if (!isNaN(parseFloat(sc.scoreVal))) w = parseFloat(sc.scoreVal);
      } else if (code === 'TAVD' || sname.includes('vấn đáp') || sname.includes('nói')) {
        if (!isNaN(parseFloat(sc.scoreVal))) o = parseFloat(sc.scoreVal);
      }
    }

    let scale10 = null;
    let rawTotal = null;

    if (ept !== null && ept > 0) {
      rawTotal = ept;
      scale10 = Math.round((ept / 10) * 10) / 10;
    } else if (w !== null && o !== null) {
      rawTotal = w + o;
      scale10 = rawTotal > 10 ? Math.round((rawTotal / 10) * 10) / 10 : rawTotal;
    } else if (w !== null) {
      rawTotal = w;
      scale10 = rawTotal > 10 ? Math.round((rawTotal / 10) * 10) / 10 : rawTotal;
    } else if (o !== null) {
      rawTotal = o;
      // If only oral is taken, and oral is on scale 30:
      if (o <= 30 && o > 10) {
        scale10 = Math.round((o / 30) * 10 * 10) / 10;
      } else if (o > 30) {
        scale10 = Math.round((o / 10) * 10) / 10;
      } else {
        // o <= 10
        // check if this is oral /30 (e.g. 10/30 = 3.3) or direct scale 10
        // In SSM, oral is max 30. If oral is 10/30, scale 10 is 3.3. But if raw is already scale 10, keep it.
        // Let's check: if oral is out of 30: (o / 30) * 10:
        scale10 = Math.round((o / 30) * 10 * 10) / 10;
      }
    }

    // Direct fallback from st.ksdvEng if SAS not available
    if (scale10 === null && st.ksdvEng !== null && st.ksdvEng !== undefined) {
      const val = parseFloat(st.ksdvEng);
      if (!isNaN(val)) {
        if (val > 10) {
          scale10 = Math.round((val / 10) * 10) / 10;
        } else {
          // Check if val was oral /30
          scale10 = Math.round(val * 10) / 10;
        }
      }
    }

    st.ksdvEngTotalScale10 = scale10;
  }

  // Format the table by Campus
  const byCampus = {};
  for (const st of commTable) {
    const cmp = st.campus || 'Khác';
    if (!byCampus[cmp]) byCampus[cmp] = [];
    byCampus[cmp].push(st);
  }

  let md = `### DANH SÁCH HỌC SINH CÓ CAM KẾT ĐẦU VÀO (CKĐV) NHẬP HỌC THEO CƠ SỞ\n`;
  md += `*(Điểm Tiếng Anh KSĐV lấy cột Tổng điểm và đã quy đổi đồng nhất về Thang điểm 10)*\n\n`;

  for (const cmp of Object.keys(byCampus).sort()) {
    md += `#### Cơ sở: ${cmp} (${byCampus[cmp].length} học sinh)\n\n`;
    md += `| STT | Họ và tên | Lớp | Môn CKĐV | Điểm KSĐV Môn Cam Kết (Thang 10) | Điểm KSĐN Môn Tương Ứng | Ghi chú & Trạng thái |\n`;
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
          partsKSĐV.push(`Toán: ${s.ksdvMath !== null && s.ksdvMath !== undefined ? s.ksdvMath : 'N/A'}`);
          partsKSĐN.push(`Toán: ${s.ksdnMath !== null && s.ksdnMath !== undefined ? s.ksdnMath : 'N/A'}`);
        }
        if (s.committedSubjects.includes('Tiếng Việt')) {
          partsKSĐV.push(`Tiếng Việt: ${s.ksdvViet !== null && s.ksdvViet !== undefined ? s.ksdvViet : 'N/A'}`);
          partsKSĐN.push(`Tiếng Việt: ${s.ksdnViet !== null && s.ksdnViet !== undefined ? s.ksdnViet : 'N/A'}`);
        }
        if (s.committedSubjects.includes('Ngữ Văn')) {
          partsKSĐV.push(`Ngữ Văn: ${s.ksdvVan !== null && s.ksdvVan !== undefined ? s.ksdvVan : 'N/A'}`);
          partsKSĐN.push(`Ngữ Văn: ${s.ksdnVan !== null && s.ksdnVan !== undefined ? s.ksdnVan : 'N/A'}`);
        }
        if (s.committedSubjects.includes('Tiếng Anh')) {
          const engVal = s.ksdvEngTotalScale10 !== null && s.ksdvEngTotalScale10 !== undefined ? s.ksdvEngTotalScale10 : (s.ksdvEng || 'N/A');
          partsKSĐV.push(`Tiếng Anh: ${engVal}`);
          partsKSĐN.push(`Tiếng Anh: ${s.ksdnEng !== null && s.ksdnEng !== undefined ? s.ksdnEng : 'N/A'}`);
        }
        ksdvStr = partsKSĐV.length > 0 ? partsKSĐV.join('; ') : '-';
        ksdnStr = partsKSĐN.length > 0 ? partsKSĐN.join('; ') : '-';
      }

      let note = '';
      if (isPsy) {
        note = '**HS Cam kết tâm lý**';
      } else if (s.directorNote) {
        note = s.directorNote.replace(/[\r\n]+/g, ' ').substring(0, 45);
      } else {
        note = 'Theo dõi chuyên môn';
      }

      md += `| ${idx + 1} | ${s.fullName} | ${s.className} | ${monCK} | ${ksdvStr} | ${ksdnStr} | ${note} |\n`;
    });

    md += '\n';
  }

  fs.writeFileSync(path.resolve(__dirname, 'exact_commitment_scale10_tables.md'), md);
  console.log('Saved exact_commitment_scale10_tables.md');
}

main().catch(console.error);
