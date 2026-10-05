const fs = require('fs');
const path = require('path');

// Load data
const reportData = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_report_data.json'), 'utf8'));
const ckdvData = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));
const dataByLevel = reportData.dataByLevel;

function pct(num, den) {
  if (!den || den === 0) return '0.0%';
  return ((num / den) * 100).toFixed(1) + '%';
}

const subjectPriority = {
  'Toán học': 1, 'Maths': 2, 'Tiếng Việt': 3, 'Ngữ Văn': 4, 'Tiếng Anh': 5, 'ESL': 6,
  'Vật lí': 7, 'Hóa học': 8, 'Sinh học': 9, 'Lịch sử': 10, 'Địa lí': 11, 'GD Kinh tế & Pháp luật': 12, 'Tin học / ICT': 13
};

function sortRows(rows) {
  return rows.sort((a, b) => {
    const pA = subjectPriority[a.subject] || 99;
    const pB = subjectPriority[b.subject] || 99;
    if (pA !== pB) return pA - pB;
    const gA = parseInt(a.grade.replace(/\D/g, '')) || 0;
    const gB = parseInt(b.grade.replace(/\D/g, '')) || 0;
    return gA - gB;
  });
}

// Prepare 76 CKDV data
const campusOrder = { 'CS1': 1, 'CS2': 2, 'CS3': 3, 'CS4': 4, 'CS5': 5 };
ckdvData.sort((a, b) => (campusOrder[a.campus] || 9) - (campusOrder[b.campus] || 9));

// Filter missing or incomplete KSĐV students
const missingKsdvStudents = ckdvData.filter(s => s.ksdvStatus !== 'Đủ điểm');

// Helper rendering badges & synchronized color-coded scores
function renderCommittedBadges(subs) {
  if (!subs || subs.length === 0) return '—';
  const arr = Array.isArray(subs) ? subs : [subs];
  return arr.map(sub => {
    const s = sub.trim();
    if (s.includes('Anh')) return `<span class="badge-sub badge-eng">Tiếng Anh</span>`;
    if (s.includes('Toán')) return `<span class="badge-sub badge-math">Toán</span>`;
    if (s.includes('Tiếng Việt')) return `<span class="badge-sub badge-viet">Tiếng Việt</span>`;
    if (s.includes('Văn')) return `<span class="badge-sub badge-van">Ngữ Văn</span>`;
    if (s.includes('Tâm lý')) return `<span class="badge-sub badge-psy">Tâm lý</span>`;
    return `<span class="badge-sub badge-other">${s}</span>`;
  }).join(' ');
}

function renderScoreKsdv(st) {
  const comms = st.committedSubjects || [];
  const parts = [];

  const hasMath = comms.some(c => c.includes('Toán'));
  const hasViet = comms.some(c => c.includes('Tiếng Việt'));
  const hasVan = comms.some(c => c.includes('Văn'));
  const hasEng = comms.some(c => c.includes('Anh'));

  if (hasMath) {
    if (st.ksdvMath != null) parts.push(`<span class="score-highlight score-math">Toán: ${st.ksdvMath}</span>`);
    else parts.push(`<span class="missing-text">Toán: Chưa có điểm</span>`);
  }
  if (hasViet) {
    if (st.ksdvViet != null) parts.push(`<span class="score-highlight score-viet">Tiếng Việt: ${st.ksdvViet}</span>`);
    else parts.push(`<span class="missing-text">Tiếng Việt: Chưa có điểm</span>`);
  }
  if (hasVan) {
    if (st.ksdvVan != null) parts.push(`<span class="score-highlight score-van">Ngữ Văn: ${st.ksdvVan}</span>`);
    else parts.push(`<span class="missing-text">Ngữ Văn: Chưa có điểm</span>`);
  }
  if (hasEng) {
    if (st.ksdvEngScale10 != null) parts.push(`<span class="score-highlight score-eng">Tiếng Anh: ${st.ksdvEngScale10.toFixed(1)}</span>`);
    else parts.push(`<span class="missing-text">Tiếng Anh: Chưa có điểm</span>`);
  }


  if (st.isPsychology) {
    if (parts.length > 0) {
      return parts.join(' ') + ` <span class="score-highlight score-psy">Theo dõi tâm lý</span>`;
    }
    return `<span class="score-highlight score-psy">Theo dõi tâm lý lứa tuổi</span>`;
  }

  if (st.ksdvStatus === 'Chưa có điểm KSĐV' && parts.length === 0) {
    return `<span class="badge badge-warning">Chưa có điểm KSĐV</span>`;
  }

  if (parts.length === 0) return '—';
  return parts.join(' ');
}

function renderScoreKsdn(st) {
  const comms = st.committedSubjects || [];
  const parts = [];

  const hasMath = comms.some(c => c.includes('Toán'));
  const hasViet = comms.some(c => c.includes('Tiếng Việt'));
  const hasVan = comms.some(c => c.includes('Văn'));
  const hasEng = comms.some(c => c.includes('Anh'));

  if (hasMath) {
    if (st.ksdnMath != null) parts.push(`<span class="score-highlight score-math">Toán: ${st.ksdnMath}</span>`);
    else parts.push(`<span class="missing-text">Toán: Chưa thi</span>`);
  }
  if (hasViet) {
    if (st.ksdnViet != null) parts.push(`<span class="score-highlight score-viet">Tiếng Việt: ${st.ksdnViet}</span>`);
    else parts.push(`<span class="missing-text">Tiếng Việt: Chưa thi</span>`);
  }
  if (hasVan) {
    if (st.ksdnVan != null) parts.push(`<span class="score-highlight score-van">Ngữ Văn: ${st.ksdnVan}</span>`);
    else parts.push(`<span class="missing-text">Ngữ Văn: Chưa thi</span>`);
  }
  if (hasEng) {
    if (st.ksdnEng != null) parts.push(`<span class="score-highlight score-eng">Tiếng Anh: ${st.ksdnEng}</span>`);
    else parts.push(`<span class="missing-text">Tiếng Anh: Chưa thi</span>`);
  }

  // Riêng học sinh diện Tâm lý nếu không cam kết môn cụ thể
  if (st.isPsychology && parts.length === 0) {
    const psyKsdn = [];
    if (st.ksdnMath != null) psyKsdn.push(`Toán: ${st.ksdnMath}`);
    if (st.ksdnViet != null) psyKsdn.push(`Tiếng Việt: ${st.ksdnViet}`);
    if (st.ksdnVan != null) psyKsdn.push(`Ngữ Văn: ${st.ksdnVan}`);
    if (st.ksdnEng != null) psyKsdn.push(`Tiếng Anh: ${st.ksdnEng}`);
    if (psyKsdn.length > 0) return psyKsdn.map(s => `<span class="score-dim">${s}</span>`).join(' ');
    return `<span style="color: #64748b; font-style: italic; font-size: 12px;">Chưa có bài KSĐN (Khối ${st.grade || '1'})</span>`;
  }

  if (parts.length > 0) {
    return parts.join(' ');
  }

  if (st.grade === '1' || st.grade === 1) {
    return `<span style="color: #64748b; font-style: italic; font-size: 12px;">Chưa có bài KSĐN (Khối 1)</span>`;
  }
  return `<span style="color: #94a3b8; font-style: italic; font-size: 12px;">Chưa có bài KSĐN</span>`;
}

function evalSubjectStatus(score, grade) {
  if (score == null) return null;
  const val = Number(score);
  const g = parseInt(grade, 10);
  if (g <= 5) {
    // Tiểu học: Chuẩn Đạt >= 7.0
    if (val < 5.0) return 'Dưới TB';
    if (val < 7.0) return 'TB';
    return 'Đạt chuẩn';
  } else {
    // THCS & THPT: Dưới TB (< 5.0), TB (5.0 - 6.4), Đạt chuẩn (>= 6.5)
    if (val < 5.0) return 'Dưới TB';
    if (val < 6.5) return 'TB';
    return 'Đạt chuẩn';
  }
}

function renderStudentStatusBadge(st) {
  const comms = st.committedSubjects || [];
  const grade = parseInt(st.grade, 10);

  if (st.isPsychology && !comms.some(c => c.includes('Toán') || c.includes('Việt') || c.includes('Văn') || c.includes('Anh'))) {
    if (st.ksdnMath != null || st.ksdnVan != null || st.ksdnEng != null) {
      return `<span class="badge badge-success">Đạt chuẩn</span>`;
    }
    return `<span class="badge badge-psychology">Theo dõi tâm lý</span>`;
  }

  const results = [];
  if (comms.some(c => c.includes('Toán'))) {
    const stt = evalSubjectStatus(st.ksdnMath, grade);
    if (stt) results.push({ sub: 'Toán', status: stt });
  }
  if (comms.some(c => c.includes('Tiếng Việt'))) {
    const stt = evalSubjectStatus(st.ksdnViet, grade);
    if (stt) results.push({ sub: 'Tiếng Việt', status: stt });
  }
  if (comms.some(c => c.includes('Văn'))) {
    const stt = evalSubjectStatus(st.ksdnVan, grade);
    if (stt) results.push({ sub: 'Ngữ Văn', status: stt });
  }
  if (comms.some(c => c.includes('Anh'))) {
    const stt = evalSubjectStatus(st.ksdnEng, grade);
    if (stt) results.push({ sub: 'Tiếng Anh', status: stt });
  }

  if (results.length === 0) {
    if (grade === 1) return `<span class="badge badge-dim">Chưa KSĐN (Khối 1)</span>`;
    if (st.missingReason && st.missingReason.includes('Tuyển thẳng')) return `<span class="badge badge-warning">Tuyển thẳng</span>`;
    return `<span class="badge badge-dim">Chưa có bài KSĐN</span>`;
  }

  const badgeMap = {
    'Đạt chuẩn': 'badge-success',
    'TB': 'badge-warning',
    'Dưới TB': 'badge-danger'
  };

  if (results.length === 1) {
    const r = results[0];
    return `<span class="badge ${badgeMap[r.status]}">${r.status}</span>`;
  }

  const uniqueStatuses = Array.from(new Set(results.map(r => r.status)));
  if (uniqueStatuses.length === 1) {
    return `<span class="badge ${badgeMap[uniqueStatuses[0]]}">${uniqueStatuses[0]}</span>`;
  }

  return results.map(r => `<span class="badge ${badgeMap[r.status]}">${r.sub}: ${r.status}</span>`).join(' ');
}

const { getPreparedCkdvData, computeCampusSummary } = require('./calculate_ckdv_progress_table.js');
const ckdvByCampus = getPreparedCkdvData();

function renderSubBadge(sub) {
  const s = (sub || '').trim();
  if (s.includes('Anh')) return `<span class="badge-sub badge-eng">Tiếng Anh</span>`;
  if (s.includes('Toán')) return `<span class="badge-sub badge-math">Toán</span>`;
  if (s.includes('Tiếng Việt')) return `<span class="badge-sub badge-viet">Tiếng Việt</span>`;
  if (s.includes('Văn')) return `<span class="badge-sub badge-van">Ngữ Văn</span>`;
  if (s.includes('Tâm lý')) return `<span class="badge-sub badge-psy">Tâm lý</span>`;
  return `<span class="badge-sub badge-other">${s}</span>`;
}

function renderScoreCell(scoreStr, sub) {
  const s = (sub || '').trim();
  let cls = 'score-dim';
  if (s.includes('Anh')) cls = 'score-eng';
  else if (s.includes('Toán')) cls = 'score-math';
  else if (s.includes('Tiếng Việt')) cls = 'score-viet';
  else if (s.includes('Văn')) cls = 'score-van';
  else if (s.includes('Tâm lý')) cls = 'score-psy';

  if (!scoreStr || scoreStr.includes('Chưa') || scoreStr === '—') {
    return `<span class="missing-text">${scoreStr || '—'}</span>`;
  }
  return `<span class="score-highlight ${cls}">${scoreStr}</span>`;
}

// Build HTML content
let htmlBody = `
    <!-- Top KPI Grid -->
    <section class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-label">Tổng Học Sinh Khảo Sát</div>
        <div class="kpi-number">1.699</div>
        <div class="kpi-subtext">Khối 2 - 12 (5 cơ sở trường)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Tổng Lượt Bài Thi Đã Chấm</div>
        <div class="kpi-number">5.227</div>
        <div class="kpi-subtext">Toán, Tiếng Việt, Văn, Anh, ESL...</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-label">Đạt Chuẩn Tiểu Học (≥ 7.0)</div>
        <div class="kpi-number">89.0%</div>
        <div class="kpi-subtext">2.335 / 2.624 lượt (Giỏi: 76.3%)</div>
      </div>
      <div class="kpi-card kpi-success">
        <div class="kpi-label">Đạt Chuẩn THCS (≥ 5.0)</div>
        <div class="kpi-number">85.2%</div>
        <div class="kpi-subtext">1.785 / 2.095 lượt (Giỏi: 40.0%)</div>
      </div>
      <div class="kpi-card kpi-warning">
        <div class="kpi-label">Đạt Chuẩn THPT (≥ 5.0)</div>
        <div class="kpi-number">65.7%</div>
        <div class="kpi-subtext">334 / 508 lượt (Dưới TB: 34.3%)</div>
      </div>
      <div class="kpi-card kpi-purple">
        <div class="kpi-label">Học Sinh CKĐV Đã Nhập Học</div>
        <div class="kpi-number">76</div>
        <div class="kpi-subtext">Đã nhập học hoàn tất (Completed)</div>
      </div>
    </section>

    <!-- PHẦN I: TỔNG QUAN 3 BẬC HỌC -->
    <section class="report-section" id="sec-tong-quan">
      <div class="section-header">
        <span class="section-badge">PHẦN I</span>
        <h2 class="section-title">BÁO CÁO TỔNG QUAN KỲ KHẢO SÁT ĐẦU NĂM TOÀN HỆ THỐNG</h2>
      </div>

      <div class="table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 50px;">STT</th>
              <th>Bậc học</th>
              <th>Khối lớp</th>
              <th>Chuẩn Đạt điểm</th>
              <th>Tổng số HS</th>
              <th>Tổng lượt bài</th>
              <th>Số bài Đạt chuẩn</th>
              <th>Tỷ lệ Đạt chuẩn</th>
              <th>Số bài Dưới TB</th>
              <th>Tỷ lệ Dưới TB</th>
              <th>Số bài Giỏi (8-10)</th>
              <th>Tỷ lệ Giỏi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><strong>Tiểu học</strong></td>
              <td>Khối 2 - 5</td>
              <td><span class="badge badge-success">Điểm ≥ 7.0</span></td>
              <td>878</td>
              <td>2.624</td>
              <td><strong>2.335</strong></td>
              <td><span class="badge badge-success">89.0%</span></td>
              <td>49</td>
              <td>1.9%</td>
              <td><strong>2.002</strong></td>
              <td><span class="badge badge-growth">76.3%</span></td>
            </tr>
            <tr>
              <td>2</td>
              <td><strong>THCS</strong></td>
              <td>Khối 6 - 9</td>
              <td><span class="badge badge-success">Điểm ≥ 5.0</span></td>
              <td>673</td>
              <td>2.095</td>
              <td><strong>1.785</strong></td>
              <td><span class="badge badge-success">85.2%</span></td>
              <td>243</td>
              <td>11.6%</td>
              <td><strong>838</strong></td>
              <td><span class="badge badge-growth">40.0%</span></td>
            </tr>
            <tr>
              <td>3</td>
              <td><strong>THPT</strong></td>
              <td>Khối 10 - 12</td>
              <td><span class="badge badge-warning">Điểm ≥ 5.0</span></td>
              <td>148</td>
              <td>508</td>
              <td><strong>334</strong></td>
              <td><span class="badge badge-warning">65.7%</span></td>
              <td>172</td>
              <td>33.9%</td>
              <td><strong>76</strong></td>
              <td><span class="badge badge-growth">15.0%</span></td>
            </tr>
            <tr class="total-row">
              <td>-</td>
              <td><strong>TOÀN TRƯỜNG</strong></td>
              <td><strong>Khối 2 - 12</strong></td>
              <td><strong>Theo bậc học</strong></td>
              <td><strong>1.699</strong></td>
              <td><strong>5.227</strong></td>
              <td><strong>4.454</strong></td>
              <td><strong>85.2%</strong></td>
              <td><strong>464</strong></td>
              <td><strong>8.9%</strong></td>
              <td><strong>2.916</strong></td>
              <td><strong>55.8%</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
`;

// Helper for Section II, III, IV
function renderLevelSection(lvlName, secId, secNum, benchDesc) {
  const lvlData = dataByLevel[lvlName] || {};
  const campusMap = {};
  for (const sub of Object.keys(lvlData)) {
    for (const grade of Object.keys(lvlData[sub])) {
      for (const campus of Object.keys(lvlData[sub][grade])) {
        if (!campusMap[campus]) campusMap[campus] = [];
        const item = lvlData[sub][grade][campus];
        campusMap[campus].push({
          subject: sub,
          grade: grade,
          total: item.total,
          belowAvg: item.belowAvg,
          atBenchmark: item.atBenchmark,
          good: item.good
        });
      }
    }
  }

  htmlBody += `
    <!-- ${secNum}: BẬC ${lvlName.toUpperCase()} -->
    <section class="report-section" id="${secId}">
      <div class="section-header">
        <span class="section-badge">${secNum}</span>
        <h2 class="section-title">THỐNG KÊ CHI TIẾT BẬC ${lvlName.toUpperCase()} THEO TỪNG CƠ SỞ</h2>
      </div>

      <div class="alert alert-note">
        • <strong>Quy định Chuẩn đạt điểm Bậc ${lvlName}:</strong> Điểm đạt chuẩn là <code>${benchDesc}</code>. Điểm dưới trung bình là <code>&lt; 5.0</code>. Điểm Giỏi là <code>8.0 - 10.0</code>.<br>
        • <strong>Cấu trúc bảng:</strong> Tách riêng từng cơ sở từ CS1 đến CS5; từng môn theo khối; có hàng <strong>Tổng cơ sở</strong> và hàng <strong>Tổng toàn bậc học</strong>.
      </div>
  `;

  let grandTotal = 0, grandBelow = 0, grandBench = 0, grandGood = 0;
  const sortedCampuses = Object.keys(campusMap).sort();

  sortedCampuses.forEach(cmp => {
    const cRows = sortRows(campusMap[cmp]);
    const cmpTotal = cRows.reduce((s, r) => s + r.total, 0);
    const cmpBelow = cRows.reduce((s, r) => s + r.belowAvg, 0);
    const cmpBench = cRows.reduce((s, r) => s + r.atBenchmark, 0);
    const cmpGood = cRows.reduce((s, r) => s + r.good, 0);

    grandTotal += cmpTotal;
    grandBelow += cmpBelow;
    grandBench += cmpBench;
    grandGood += cmpGood;

    htmlBody += `
      <h3 class="campus-title">CƠ SỞ: ${cmp} - BẬC ${lvlName.toUpperCase()}</h3>
      <div class="table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 50px;">STT</th>
              <th>Môn học</th>
              <th>Khối lớp</th>
              <th>Số HS khảo sát</th>
              <th>Điểm dưới TB (&lt; 5.0)</th>
              <th>Tỷ lệ &lt; 5.0</th>
              <th>Điểm Chuẩn (${benchDesc})</th>
              <th>Tỷ lệ Đạt chuẩn</th>
              <th>Điểm 8 - 10 (Giỏi)</th>
              <th>Tỷ lệ Giỏi</th>
            </tr>
          </thead>
          <tbody>
    `;

    cRows.forEach((r, idx) => {
      htmlBody += `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${r.subject}</strong></td>
              <td>${r.grade}</td>
              <td><strong>${r.total}</strong></td>
              <td>${r.belowAvg}</td>
              <td>${r.belowAvg > 0 ? `<span class="badge badge-danger">${pct(r.belowAvg, r.total)}</span>` : '0.0%'}</td>
              <td><strong>${r.atBenchmark}</strong></td>
              <td><span class="badge badge-success">${pct(r.atBenchmark, r.total)}</span></td>
              <td><strong>${r.good}</strong></td>
              <td><span class="badge badge-growth">${pct(r.good, r.total)}</span></td>
            </tr>
      `;
    });

    htmlBody += `
            <tr class="subtotal-row">
              <td>-</td>
              <td><strong>TỔNG CƠ SỞ ${cmp}</strong></td>
              <td><strong>Các khối</strong></td>
              <td><strong>${cmpTotal}</strong></td>
              <td><strong>${cmpBelow}</strong></td>
              <td><strong>${pct(cmpBelow, cmpTotal)}</strong></td>
              <td><strong>${cmpBench}</strong></td>
              <td><strong>${pct(cmpBench, cmpTotal)}</strong></td>
              <td><strong>${cmpGood}</strong></td>
              <td><strong>${pct(cmpGood, cmpTotal)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  });

  htmlBody += `
      <div class="table-container" style="margin-top: 20px;">
        <table class="report-table">
          <tbody>
            <tr class="total-row" style="font-size: 14.5px;">
              <td style="width: 50px;">-</td>
              <td><strong>TỔNG TOÀN BẬC ${lvlName.toUpperCase()} (TẤT CẢ CƠ SỞ)</strong></td>
              <td><strong>Khối thuộc bậc</strong></td>
              <td><strong>${grandTotal}</strong> lượt</td>
              <td><strong>${grandBelow}</strong></td>
              <td><span class="badge badge-danger">${pct(grandBelow, grandTotal)}</span></td>
              <td><strong>${grandBench}</strong></td>
              <td><span class="badge badge-success">${pct(grandBench, grandTotal)}</span></td>
              <td><strong>${grandGood}</strong></td>
              <td><span class="badge badge-growth">${pct(grandGood, grandTotal)}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  `;
}

renderLevelSection('Tiểu học', 'sec-tiểu học', 'PHẦN II', '≥ 7.0');
renderLevelSection('THCS', 'sec-thcs', 'PHẦN III', '≥ 5.0');
renderLevelSection('THPT', 'sec-thpt', 'PHẦN IV', '≥ 5.0');

// PHẦN V: HỌC SINH CAM KẾT ĐẦU VÀO ĐÃ NHẬP HỌC (76 HS)
htmlBody += `
    <!-- PHẦN V: MAP KẾT QUẢ 76 HỌC SINH CKĐV ĐÃ NHẬP HỌC -->
    <section class="report-section" id="sec-ckdv">
      <div class="section-header">
        <span class="section-badge">PHẦN V</span>
        <h2 class="section-title">ĐỐI SÁNH KẾT QUẢ KHẢO SÁT ĐẦU VÀO (KSĐV) VỚI KHẢO SÁT ĐẦU NĂM (KSĐN)<br>CỦA 76 HỌC SINH DIỆN CAM KẾT ĐẦU VÀO ĐÃ NHẬP HỌC (COMPLETED)</h2>
      </div>

      <!-- KPI Status Cards for Entrance Scores -->
      <div class="kpi-grid" style="margin-bottom: 24px;">
        <div class="kpi-card kpi-indigo">
          <div class="kpi-label">Tổng HS CKĐV & Theo Dõi Nhập Học</div>
          <div class="kpi-number">76</div>
          <div class="kpi-subtext">100.0% (Hoàn tất nhập học theo phê duyệt BGH)</div>
        </div>
        <div class="kpi-card kpi-success">
          <div class="kpi-label">HS Có Môn Cam Kết Học Thuật</div>
          <div class="kpi-number">70</div>
          <div class="kpi-subtext">92.1% (Thống kê đối sánh chi tiết tại Mục 2)</div>
        </div>
        <div class="kpi-card kpi-purple">
          <div class="kpi-label">HS Diện Theo Dõi Chung & Giao Lưu</div>
          <div class="kpi-number">6</div>
          <div class="kpi-subtext">7.9% (Thống kê chuyên đề riêng tại Mục 3)</div>
        </div>
        <div class="kpi-card kpi-growth">
          <div class="kpi-label">Đủ Điểm KSĐV Môn Cam Kết</div>
          <div class="kpi-number">62</div>
          <div class="kpi-subtext">88.6% / 70 HS (Đầy đủ điểm KSĐV môn cam kết)</div>
        </div>
      </div>

      <!-- Bảng 1: Phân bổ 76 HS CKĐV theo cơ sở -->
      <h3 class="sub-section-title">1. Phân bổ Học sinh Cam kết đầu vào đã Nhập học theo Cơ sở trường</h3>
      <div class="table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 50px;">STT</th>
              <th>Cơ sở trường</th>
              <th>Tổng số HS Tuyển mới Nhập học</th>
              <th>Số HS CKĐV ĐÃ NHẬP HỌC</th>
              <th>Tỷ lệ CKĐV / Nhập học</th>
              <th>Môn cam kết chủ đạo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><strong>CS1</strong></td>
              <td>90</td>
              <td><strong>32</strong></td>
              <td><span class="badge badge-growth">35.6%</span></td>
              <td>Tiếng Anh, Toán, Ngữ Văn, Tâm lý</td>
            </tr>
            <tr>
              <td>2</td>
              <td><strong>CS2</strong></td>
              <td>36</td>
              <td><strong>7</strong></td>
              <td><span class="badge badge-growth">19.4%</span></td>
              <td>Tiếng Việt, Tâm lý, Theo dõi tập trung/ngôn ngữ</td>
            </tr>
            <tr>
              <td>3</td>
              <td><strong>CS3</strong></td>
              <td>65</td>
              <td><strong>13</strong></td>
              <td><span class="badge badge-growth">20.0%</span></td>
              <td>Tiếng Việt, Tiếng Anh (ESL), Toán</td>
            </tr>
            <tr>
              <td>4</td>
              <td><strong>CS4</strong></td>
              <td>14</td>
              <td><strong>13</strong></td>
              <td><span class="badge badge-growth">92.9%</span></td>
              <td>Tiếng Anh, Toán, Ngữ Văn</td>
            </tr>
            <tr>
              <td>5</td>
              <td><strong>CS5</strong></td>
              <td>62</td>
              <td><strong>11</strong></td>
              <td><span class="badge badge-growth">17.7%</span></td>
              <td>Tiếng Anh, Toán, Thỏa thuận giao lưu</td>
            </tr>
            <tr class="total-row">
              <td>-</td>
              <td><strong>TỔNG TOÀN HỆ THỐNG</strong></td>
              <td><strong>267</strong></td>
              <td><strong>76</strong></td>
              <td><strong>28.5%</strong></td>
              <td><strong>Toán, Tiếng Việt, Tiếng Anh, Ngữ Văn, Tâm lý</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Bảng chi tiết 76 học sinh -->
      <h3 class="sub-section-title" style="margin-top: 36px;">2. Danh sách Chi tiết 76 Học sinh CKĐV Nhập học - Map Điểm KSĐV vs KSĐN theo Từng Cơ sở</h3>
      
      <div class="alert alert-note">
        • <strong>Quy ước màu sắc nhận diện đồng bộ (Visual Color-Coding):</strong> Học sinh cam kết môn nào thì <strong>bôi màu môn đó, và đồng màu với các môn KSĐV và KSĐN để nhận biết tức thì</strong>:<br>
        &nbsp;&nbsp;&nbsp;&nbsp;• <span class="badge-sub badge-math">Môn Toán</span>: Đồng bộ sắc Xanh Ngọc (Emerald)<br>
        &nbsp;&nbsp;&nbsp;&nbsp;• <span class="badge-sub badge-viet">Tiếng Việt</span>: Đồng bộ sắc Cam (Amber)<br>
        &nbsp;&nbsp;&nbsp;&nbsp;• <span class="badge-sub badge-van">Ngữ Văn</span>: Đồng bộ sắc Đỏ Hồng (Rose)<br>
        &nbsp;&nbsp;&nbsp;&nbsp;• <span class="badge-sub badge-eng">Tiếng Anh</span>: Đồng bộ sắc Xanh Dương (Blue)<br>
        &nbsp;&nbsp;&nbsp;&nbsp;• <span class="badge-sub badge-psy">Tâm lý</span>: Đồng bộ sắc Tím (Purple)<br>
        &nbsp;&nbsp;&nbsp;&nbsp;• <em>Các môn khảo sát khác (không cam kết):</em> Hiển thị màu trung tính nhạt để người đọc tập trung tối đa vào môn cam kết.<br>
        • <strong>Điểm Tiếng Anh KSĐV:</strong> Được lấy trực tiếp từ Cột Tổng điểm và <strong>quy đổi chuẩn xác về Thang 10 (Scale 10)</strong> theo công thức: <code>Scale 10 = Tổng điểm / 10</code> (ví dụ: <code>Tiếng Anh: 4.1</code>).<br>
        • <strong>Học sinh diện Cam kết Tâm lý:</strong> Hiển thị đầy đủ điểm KSĐN thực tế của học sinh (nếu có tham gia kỳ khảo sát) để theo dõi sát sao sự tiến bộ toàn diện.<br>
        • <strong>Học sinh chưa có điểm / thiếu điểm môn cam kết:</strong> Được chú thích cụ thể lý do (tuyển thẳng, học sinh nước ngoài, chờ cập nhật bài thi...).
      </div>

      <!-- Ghi chú làm rõ về môn Cam kết / Chung theo dõi -->
      <div class="alert alert-info" style="margin-top: 14px; margin-bottom: 20px; background: #f0f9ff; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 8px; color: #0369a1; font-size: 13px;">
        <strong>Lưu ý về chuẩn hóa Môn Cam Kết:</strong><br>
        • Bảng chỉ hiển thị các học sinh có <strong>môn cam kết cụ thể</strong> (Toán, Tiếng Việt, Ngữ Văn, Tiếng Anh, Tâm lý) đúng theo mục xét duyệt <em>Môn Cam Kết (đã chọn)</em> trên hệ thống.<br>
        • <strong>6 học sinh diện Chung / Theo dõi không có môn cam kết cụ thể</strong> không hiển thị trong bảng đối sánh môn cam kết (gồm 3 HS Lớp 1 CS2 diện theo dõi tập trung/ngôn ngữ; 1 HS CS1 diện theo dõi tâm lý; 2 HS CS5 diện học sinh Homeschooling ký thỏa thuận học giao lưu chung).
      </div>

      <!-- Filter bar for CKDV students -->
      <div class="filter-bar">
        <div class="filter-tabs">
          <button class="filter-tab active" onclick="filterCampus('all', this)">Tất cả (${Object.values(ckdvByCampus).reduce((s, l) => s + l.length, 0)} HS)</button>
          <button class="filter-tab" onclick="filterCampus('CS1', this)">CS1 (${(ckdvByCampus['CS1'] || []).length})</button>
          <button class="filter-tab" onclick="filterCampus('CS2', this)">CS2 (${(ckdvByCampus['CS2'] || []).length})</button>
          <button class="filter-tab" onclick="filterCampus('CS3', this)">CS3 (${(ckdvByCampus['CS3'] || []).length})</button>
          <button class="filter-tab" onclick="filterCampus('CS4', this)">CS4 (${(ckdvByCampus['CS4'] || []).length})</button>
          <button class="filter-tab" onclick="filterCampus('CS5', this)">CS5 (${(ckdvByCampus['CS5'] || []).length})</button>
        </div>
        <div class="search-box">
          <input type="text" id="ckdvSearchInput" placeholder="Tìm tên học sinh, lớp, môn CKĐV..." onkeyup="searchStudent()">
        </div>
      </div>
`;

// Render students by campus
const campusTitles = {
  'CS1': `CƠ SỞ CS1 (${(ckdvByCampus['CS1'] || []).length} học sinh)`,
  'CS2': `CƠ SỞ CS2 (${(ckdvByCampus['CS2'] || []).length} học sinh)`,
  'CS3': `CƠ SỞ CS3 (${(ckdvByCampus['CS3'] || []).length} học sinh)`,
  'CS4': `CƠ SỞ CS4 (${(ckdvByCampus['CS4'] || []).length} học sinh)`,
  'CS5': `CƠ SỞ CS5 (${(ckdvByCampus['CS5'] || []).length} học sinh)`
};

Object.keys(ckdvByCampus).sort().forEach(cmp => {
  const students = ckdvByCampus[cmp];
  const summary = computeCampusSummary(students);

  const subList = Object.entries(summary.subCounts)
    .filter(([k, v]) => v > 0)
    .map(([k, v]) => `<strong>${k}:</strong> ${v} HS`)
    .join(' &nbsp;|&nbsp; ');

  htmlBody += `
      <div class="ckdv-campus-section" data-campus="${cmp}">
        <h4 class="campus-title">${campusTitles[cmp] || `CƠ SỞ ${cmp} (${students.length} học sinh)`}</h4>
        <div class="table-container">
          <table class="report-table ckdv-table">
            <thead>
              <tr>
                <th style="width: 45px;">STT</th>
                <th>Họ và tên</th>
                <th style="width: 90px;">Lớp</th>
                <th style="width: 75px;">Khối</th>
                <th style="width: 110px;">Môn CKĐV</th>
                <th style="width: 130px;">Điểm KSĐV</th>
                <th style="width: 120px;">Điểm KSĐN</th>
                <th style="width: 130px;">Tiến bộ</th>
                <th style="width: 110px;">Đạt chuẩn</th>
              </tr>
            </thead>
            <tbody>
  `;

  students.forEach((st, idx) => {
    const rows = st.subjectRows || [];
    rows.forEach((row, rIdx) => {
      const subBadge = renderSubBadge(row.subjectName);
      const ksdvCell = renderScoreCell(row.ksdvStr, row.subjectName);
      const ksdnCell = renderScoreCell(row.ksdnStr, row.subjectName);

      if (rIdx === 0) {
        htmlBody += `
              <tr>
                <td rowspan="${rows.length}" style="text-align: center; vertical-align: middle;">${idx + 1}</td>
                <td rowspan="${rows.length}" style="vertical-align: middle;"><strong>${st.fullName}</strong></td>
                <td rowspan="${rows.length}" style="text-align: center; vertical-align: middle;"><code>${st.className || 'Chưa rõ'}</code></td>
                <td rowspan="${rows.length}" style="text-align: center; vertical-align: middle;">Khối ${st.grade || ''}</td>
                <td>${subBadge}</td>
                <td>${ksdvCell}</td>
                <td>${ksdnCell}</td>
                <td><span class="badge ${row.progressBadgeClass}">${row.progressText}</span></td>
                <td><span class="badge ${row.benchmarkBadgeClass}">${row.benchmarkText}</span></td>
              </tr>
        `;
      } else {
        htmlBody += `
              <tr>
                <td>${subBadge}</td>
                <td>${ksdvCell}</td>
                <td>${ksdnCell}</td>
                <td><span class="badge ${row.progressBadgeClass}">${row.progressText}</span></td>
                <td><span class="badge ${row.benchmarkBadgeClass}">${row.benchmarkText}</span></td>
              </tr>
        `;
      }
    });
  });

  htmlBody += `
            </tbody>
            <tfoot>
              <tr class="summary-sub-row" style="background: #f8fafc; font-size: 12.5px;">
                <td colspan="4" style="font-weight: 700; color: #1e293b; text-align: right;">HS Cam kết theo môn:</td>
                <td colspan="5" style="color: #334155; font-weight: 500;">${subList}</td>
              </tr>
              <tr class="summary-progress-row" style="background: #f0fdf4; font-size: 12.5px;">
                <td colspan="4" style="font-weight: 700; color: #166534; text-align: right;">Tổng số môn Tiến bộ:</td>
                <td colspan="5" style="font-weight: 700; color: #15803d;">
                  ${summary.totalProgress} / ${summary.totalEvaluated} lượt môn (${summary.progressRate})
                </td>
              </tr>
              <tr class="summary-benchmark-row" style="background: #eff6ff; font-size: 12.5px;">
                <td colspan="4" style="font-weight: 700; color: #1e40af; text-align: right;">Tổng số môn Đạt chuẩn:</td>
                <td colspan="5" style="font-weight: 700; color: #1d4ed8;">
                  ${summary.totalBenchmark} / ${summary.totalEvaluated} lượt môn (${summary.benchmarkRate})
                  <span style="font-weight: 400; color: #64748b; font-size: 11.5px; margin-left: 8px;">(Đạt chuẩn: ${summary.totalBenchmark} | Trung bình: ${summary.totalAverage} | Dưới TB: ${summary.totalBelowAvg})</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
  `;
});

// Mục riêng thống kê 6 học sinh diện Theo dõi chung & Thỏa thuận giao lưu
htmlBody += `
      <!-- 3. DANH SÁCH THỐNG KÊ 6 HỌC SINH DIỆN THEO DÕI CHUNG & THỎA THUẬN GIAO LƯU -->
      <h3 class="sub-section-title" style="margin-top: 48px; color: #0f172a; border-left: 4px solid #8b5cf6; padding-left: 12px;">
        3. Danh sách Thống kê 6 Học sinh Thuộc Diện Theo Dõi Chung & Thỏa Thuận Giao Lưu (Đảm bảo đủ 76 HS nhập học)
      </h3>

      <div class="alert alert-note" style="margin-top: 14px; margin-bottom: 20px; background: #fdf4ff; border-left: 4px solid #a855f7; padding: 14px 18px; border-radius: 8px; color: #7e22ce; font-size: 13px; line-height: 1.6;">
        • <strong>Mục đích tách riêng:</strong> Nhóm 6 học sinh này không có môn cam kết học thuật cụ thể (không chọn môn trong mục xét duyệt <em>Môn Cam Kết</em> trên hệ thống) nên không đưa vào bảng đối sánh điểm theo môn ở Mục 2. Việc lập bảng mục riêng này nhằm <strong>bảo đảm thống kê đầy đủ, minh bạch đúng 76 học sinh</strong> diện cam kết / theo dõi / thỏa thuận đã nhập học được BGH và GĐCS phê duyệt.<br>
        • <strong>Cơ cấu 6 học sinh:</strong> Gồm <strong>3 HS Lớp 1 (CS2)</strong> diện theo dõi tập trung chú ý & phát triển ngôn ngữ lứa tuổi; <strong>1 HS Khối 8 (CS1)</strong> diện theo dõi tư vấn tâm lý học đường; <strong>2 HS Khối 3 và Khối 5 (CS5)</strong> diện học sinh Homeschooling ký thỏa thuận học giao lưu chung.
      </div>

      <div class="table-container" style="box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">STT</th>
              <th>Họ và tên</th>
              <th style="width: 85px; text-align: center;">Lớp</th>
              <th style="width: 65px; text-align: center;">Khối</th>
              <th style="width: 65px; text-align: center;">Cơ sở</th>
              <th style="min-width: 190px;">Diện hồ sơ & Ghi chú xét duyệt</th>
              <th style="min-width: 170px;">Điểm KSĐV</th>
              <th style="min-width: 170px;">Điểm KSĐN</th>
              <th style="min-width: 250px;">Tình trạng thực tế & Định hướng theo dõi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="text-align: center; font-weight: bold;">1</td>
              <td><strong>Nguyễn Đặng Bảo Trâm</strong></td>
              <td style="text-align: center;"><code>8.2_CS1</code></td>
              <td style="text-align: center;">Khối 8</td>
              <td style="text-align: center;"><span class="badge badge-dim">CS1</span></td>
              <td><span class="badge-sub badge-psy">Tư vấn tâm lý</span><br><small style="color: #64748b;">"Bảo Trâm đạt, có thể theo dõi tư vấn tâm lí"</small></td>
              <td>Toán: <strong>7.0</strong>; Văn: <strong>6.5</strong><br>Anh: <strong>4.8</strong>; Tâm lý: <strong>6</strong></td>
              <td>Toán: <strong>3.0</strong>; Văn: <strong>6.5</strong><br>Anh: <strong>4.0</strong></td>
              <td>Nhập học diện Đạt. BGH lưu ý GVCN và phòng tâm lý hỗ trợ tư vấn tâm lý học đường, không cam kết môn văn hóa.</td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: bold;">2</td>
              <td><strong>Nguyễn Thanh Phúc</strong></td>
              <td style="text-align: center;"><code>1.2INT_CS2</code></td>
              <td style="text-align: center;">Khối 1</td>
              <td style="text-align: center;"><span class="badge badge-dim">CS2</span></td>
              <td><span class="badge-sub" style="background: #e0f2fe; color: #0369a1; border-color: #bae6fd;">Tập trung chú ý</span><br><small style="color: #64748b;">"Không cần cam kết, GVTA tương tác kỹ với PH"</small></td>
              <td>Anh: <strong>5.0</strong> (Vấn đáp: 5/30)<br>Tâm lý: <strong>2</strong></td>
              <td><em>Khối 1 (Chưa thi KSĐN)</em></td>
              <td>Học sinh Lớp 1 diện Đạt, kết quả xét duyệt ghi rõ "Không cần cam kết", GVCN và GVTA phối hợp PH tương tác sát sao trong năm học.</td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: bold;">3</td>
              <td><strong>ĐỖ NGUYỄN AN KHÔI</strong></td>
              <td style="text-align: center;"><code>1.3_CS2</code></td>
              <td style="text-align: center;">Khối 1</td>
              <td style="text-align: center;"><span class="badge badge-dim">CS2</span></td>
              <td><span class="badge-sub" style="background: #e0f2fe; color: #0369a1; border-color: #bae6fd;">Tập trung chú ý</span><br><small style="color: #64748b;">"(cần theo dõi mức độ tập trung chú ý)"</small></td>
              <td>Anh: <strong>7.0</strong> (Vấn đáp: 7/30)<br>Tâm lý: <strong>1</strong></td>
              <td><em>Khối 1 (Chưa thi KSĐN)</em></td>
              <td>Học sinh Lớp 1 diện Đạt, GVCN theo dõi rèn luyện nền nếp và sự tập trung trong các hoạt động học tập đầu năm.</td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: bold;">4</td>
              <td><strong>Phan Hải Đăng</strong></td>
              <td style="text-align: center;"><code>1.3_CS2</code></td>
              <td style="text-align: center;">Khối 1</td>
              <td style="text-align: center;"><span class="badge badge-dim">CS2</span></td>
              <td><span class="badge-sub badge-viet">Phát triển ngôn ngữ</span><br><small style="color: #64748b;">"theo dõi thêm khả năng phát triển ngôn ngữ"</small></td>
              <td>Tâm lý: <strong>-1</strong></td>
              <td><em>Khối 1 (Chưa thi KSĐN)</em></td>
              <td>Học sinh Lớp 1 diện Đạt, GVCN hỗ trợ rèn luyện phát triển ngôn ngữ Tiếng Việt trong sinh hoạt và học tập.</td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: bold;">5</td>
              <td><strong>Nguyễn Hoàng Đạt</strong></td>
              <td style="text-align: center;"><code>3.2INT_CS5</code></td>
              <td style="text-align: center;">Khối 3</td>
              <td style="text-align: center;"><span class="badge badge-dim">CS5</span></td>
              <td><span class="badge-sub" style="background: #fef3c7; color: #b45309; border-color: #fde68a;">Thỏa thuận Giao lưu</span><br><small style="color: #64748b;">"Ký thoả thuận cam kết như các HS đã từng học giao lưu"</small></td>
              <td>Toán: <strong>2.0</strong>; TV: <strong>1.0</strong><br>Anh: <strong>6.6</strong> (Tổng 66)</td>
              <td>Toán: <strong>6.0</strong>; TV: <strong>2.0</strong><br>Anh: <strong>7.8</strong></td>
              <td>Học sinh từ KLIS Academy (Homeschooling TP.HCM) học diện giao lưu tại CS5, ký thỏa thuận giao lưu chung. KSĐN có tiến bộ tốt (Toán 6.0, Anh 7.8).</td>
            </tr>
            <tr>
              <td style="text-align: center; font-weight: bold;">6</td>
              <td><strong>Nguyễn Hoàng Phúc</strong></td>
              <td style="text-align: center;"><code>5.2INT_CS5</code></td>
              <td style="text-align: center;">Khối 5</td>
              <td style="text-align: center;"><span class="badge badge-dim">CS5</span></td>
              <td><span class="badge-sub" style="background: #fef3c7; color: #b45309; border-color: #fde68a;">Thỏa thuận Giao lưu</span><br><small style="color: #64748b;">"Ký thoả thuận cam kết như các HS đã từng học giao lưu"</small></td>
              <td>Toán: <strong>1.0</strong>; TV: <strong>1.0</strong><br>Anh: <strong>7.2</strong> (Tổng 72)</td>
              <td>Toán: <strong>3.0</strong>; TV: <strong>1.0</strong><br>Anh: <strong>9.2</strong></td>
              <td>Học sinh Homeschooling học diện giao lưu tại CS5, ký thỏa thuận học giao lưu chung. Điểm KSĐN môn Tiếng Anh đạt xuất sắc 9.2.</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row" style="background: #f8fafc; font-weight: bold;">
              <td colspan="5" style="text-align: right; color: #0f172a;">TỔNG CỘNG MỤC 3:</td>
              <td colspan="4" style="color: #0f172a;">
                <strong>6 Học sinh diện Theo dõi chung & Thỏa thuận giao lưu</strong> 
                (CS1: 1 HS | CS2: 3 HS | CS5: 2 HS) ➔ Cộng cùng 70 HS có Môn CKĐV tại Mục 2 = <strong style="color: #2563eb; text-decoration: underline;">ĐỦ 76 HỌC SINH NHẬP HỌC (100%)</strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
`;

// Standalone CSS and template
const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Thống Kê Khảo Sát Đầu Năm & Map Kết Quả CKĐV 2026-2027 | Skyline School</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1e3a8a;
      --primary-dark: #0f172a;
      --primary-light: #2563eb;
      --accent: #0ea5e9;
      --success: #059669;
      --success-bg: #ecfdf5;
      --warning: #d97706;
      --warning-bg: #fffbeb;
      --danger: #dc2626;
      --danger-bg: #fef2f2;
      --purple: #7c3aed;
      --purple-bg: #f5f3ff;
      --gray-50: #f8fafc;
      --gray-100: #f1f5f9;
      --gray-200: #e2e8f0;
      --gray-300: #cbd5e1;
      --gray-600: #475569;
      --gray-800: #1e293b;
      --gray-900: #0f172a;
      --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #f8fafc;
      color: var(--gray-800);
      line-height: 1.5;
      font-size: 14px;
    }

    h1, h2, h3, h4, .brand-title, .kpi-number { font-family: 'Outfit', sans-serif; }

    /* Top Sticky Header */
    .top-navbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      background: rgba(15, 23, 42, 0.96);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      color: #fff;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .brand-section { display: flex; align-items: center; gap: 14px; }
    .brand-logo-badge {
      background: linear-gradient(135deg, #2563eb, #38bdf8);
      color: white;
      font-weight: 800;
      font-size: 16px;
      padding: 6px 12px;
      border-radius: 8px;
    }
    .brand-title { font-size: 16px; font-weight: 700; }
    .brand-subtitle { font-size: 12px; color: #94a3b8; }

    .action-buttons { display: flex; gap: 10px; align-items: center; }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      font-size: 13.5px;
      font-weight: 600;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
    }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-outline { background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.2); }
    .btn-outline:hover { background: rgba(255,255,255,0.2); }

    /* Quick Anchors Navigation */
    .quick-nav {
      background: white;
      border-bottom: 1px solid var(--gray-200);
      padding: 10px 24px;
      display: flex;
      gap: 12px;
      overflow-x: auto;
      white-space: nowrap;
    }
    .nav-chip {
      color: var(--gray-600);
      text-decoration: none;
      font-size: 13px;
      font-weight: 600;
      padding: 6px 14px;
      border-radius: 20px;
      background: var(--gray-100);
      transition: all 0.2s;
    }
    .nav-chip:hover {
      background: var(--primary-light);
      color: white;
    }

    /* Container */
    .report-wrapper {
      max-width: 1360px;
      margin: 0 auto;
      padding: 24px;
    }

    /* Hero Banner */
    .hero-banner {
      background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
      color: white;
      padding: 32px 36px;
      border-radius: 14px;
      margin-bottom: 24px;
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.2);
    }
    .hero-tag {
      display: inline-block;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(4px);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.5px;
      margin-bottom: 12px;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }
    .hero-title { font-size: 26px; font-weight: 800; line-height: 1.3; margin-bottom: 10px; }
    .hero-subtitle { font-size: 14px; color: #cbd5e1; max-width: 900px; line-height: 1.6; }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .kpi-card {
      background: white;
      border-radius: 12px;
      padding: 18px 20px;
      box-shadow: var(--card-shadow);
      border: 1px solid var(--gray-200);
      position: relative;
      overflow: hidden;
    }
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 4px;
      background: var(--primary-light);
    }
    .kpi-card.kpi-success::before { background: var(--success); }
    .kpi-card.kpi-warning::before { background: var(--warning); }
    .kpi-card.kpi-danger::before { background: var(--danger); }
    .kpi-card.kpi-purple::before { background: var(--purple); }

    .kpi-label { font-size: 12px; font-weight: 600; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
    .kpi-number { font-size: 28px; font-weight: 800; color: var(--gray-900); line-height: 1; margin-bottom: 6px; }
    .kpi-subtext { font-size: 11.5px; color: var(--gray-600); }

    /* Section Styling */
    .report-section {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 28px;
      box-shadow: var(--card-shadow);
      border: 1px solid var(--gray-200);
    }
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      border-bottom: 2px solid var(--gray-100);
      padding-bottom: 12px;
    }
    .section-badge {
      background: var(--primary);
      color: white;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 8px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .section-title { font-size: 18px; font-weight: 700; color: var(--gray-900); }
    .sub-section-title { font-size: 15px; font-weight: 700; color: var(--primary-dark); margin: 24px 0 12px 0; }
    .campus-title { font-size: 14.5px; font-weight: 700; color: #1e3a8a; margin: 20px 0 10px 0; display: flex; align-items: center; gap: 8px; }

    /* Alert / Callout */
    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
      line-height: 1.6;
    }
    .alert-note { background: #eff6ff; border-left: 4px solid var(--primary-light); color: #1e40af; }

    /* Tables */
    .table-container {
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--gray-200);
      margin-bottom: 14px;
    }
    .report-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
      white-space: nowrap;
    }
    .report-table th {
      background-color: #f1f5f9;
      color: var(--gray-800);
      font-weight: 700;
      padding: 10px 14px;
      border-bottom: 2px solid var(--gray-300);
      font-size: 12.5px;
    }
    .report-table td {
      padding: 9px 14px;
      border-bottom: 1px solid var(--gray-200);
      color: var(--gray-800);
    }
    .report-table tbody tr:hover { background-color: #f8fafc; }

    /* Subtotal & Total Rows */
    .subtotal-row {
      background-color: #f8fafc !important;
      font-weight: 700;
      border-top: 1.5px solid var(--gray-300);
      border-bottom: 1.5px solid var(--gray-300);
    }
    .subtotal-row td { color: #1e3a8a; }

    .total-row {
      background-color: #e0f2fe !important;
      font-weight: 800;
      border-top: 2px solid #0284c7;
      border-bottom: 2px solid #0284c7;
    }
    .total-row td { color: #0369a1; font-size: 13.5px; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 600;
    }
    .badge-success { background-color: var(--success-bg); color: var(--success); border: 1px solid #a7f3d0; }
    .badge-warning { background-color: var(--warning-bg); color: var(--warning); border: 1px solid #fde68a; }
    .badge-danger { background-color: var(--danger-bg); color: var(--danger); border: 1px solid #fecaca; }
    .badge-growth { background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-psychology { background-color: var(--purple-bg); color: var(--purple); border: 1px solid #ddd6fe; font-weight: 700; }

    /* Color coding for committed subjects & synchronized scores */
    .badge-sub {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 11.5px;
      margin: 2px 3px 2px 0;
      white-space: nowrap;
    }
    .score-highlight {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 12.5px;
      margin: 2px 3px 2px 0;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .score-dim {
      display: inline-block;
      padding: 2px 6px;
      color: #64748b;
      font-weight: 500;
      font-size: 11.5px;
      margin: 2px 2px;
      white-space: nowrap;
      background: #f1f5f9;
      border-radius: 4px;
    }

    /* Tiếng Anh: Blue Theme */
    .badge-eng, .score-eng {
      background: #eff6ff !important;
      color: #1d4ed8 !important;
      border: 1.5px solid #93c5fd !important;
    }

    /* Toán: Emerald Theme */
    .badge-math, .score-math {
      background: #ecfdf5 !important;
      color: #047857 !important;
      border: 1.5px solid #86efac !important;
    }

    /* Tiếng Việt: Orange Theme */
    .badge-viet, .score-viet {
      background: #fff7ed !important;
      color: #c2410c !important;
      border: 1.5px solid #fdba74 !important;
    }

    /* Ngữ Văn: Rose Theme */
    .badge-van, .score-van {
      background: #fff1f2 !important;
      color: #be123c !important;
      border: 1.5px solid #fecdd3 !important;
    }

    /* Tâm lý: Purple Theme */
    .badge-psy, .score-psy {
      background: #faf5ff !important;
      color: #7e22ce !important;
      border: 1.5px solid #d8b4fe !important;
    }

    .badge-other {
      background: #f1f5f9 !important;
      color: #475569 !important;
      border: 1px solid #cbd5e1 !important;
    }
    .missing-text {
      color: #b45309;
      font-size: 11px;
      font-style: italic;
      display: inline-block;
      margin-left: 4px;
    }

    /* Filter Bar */
    .filter-bar {
      background: white; border-radius: 10px; padding: 12px 16px; border: 1px solid var(--gray-200);
      margin-bottom: 16px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px;
    }
    .filter-tabs { display: flex; gap: 6px; }
    .filter-tab {
      padding: 6px 14px; font-size: 12.5px; font-weight: 600; border-radius: 6px;
      border: 1px solid var(--gray-300); background: white; color: var(--gray-600); cursor: pointer; transition: all 0.2s;
    }
    .filter-tab:hover, .filter-tab.active { background: var(--primary); color: white; border-color: var(--primary); }

    .search-box {
      display: flex; align-items: center; background: var(--gray-50); border: 1px solid var(--gray-300);
      border-radius: 6px; padding: 5px 12px; min-width: 280px;
    }
    .search-box input { border: none; background: transparent; outline: none; width: 100%; font-size: 13px; }

    code { background: #f1f5f9; color: #0f172a; padding: 2px 5px; border-radius: 4px; font-size: 12px; }

    /* Footer */
    .report-footer {
      text-align: center; padding: 30px 0 20px 0; color: var(--gray-600); font-size: 12.5px;
      border-top: 1px solid var(--gray-200); margin-top: 40px;
    }

    /* Print Styles */
    @media print {
      body { background: white !important; font-size: 10pt !important; color: black !important; }
      .top-navbar, .quick-nav, .action-buttons, .filter-bar, .btn { display: none !important; }
      .report-wrapper { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
      .hero-banner { background: #0f172a !important; color: white !important; padding: 15px !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .table-container { box-shadow: none !important; border: 1px solid #cbd5e1 !important; break-inside: avoid; }
      .report-table th { background: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .total-row { background-color: #e2e8f0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .section-title { break-after: avoid; margin-top: 18pt !important; }
    }
  </style>
</head>
<body>

  <!-- Top Sticky Navigation -->
  <header class="top-navbar">
    <div class="brand-section">
      <div class="brand-logo-badge">SKYLINE</div>
      <div>
        <div class="brand-title">HỆ THỐNG GIÁO DỤC SKYLINE</div>
        <div class="brand-subtitle">Ban Kiểm Tra & Đảm Bảo Chất Lượng Giáo Dục</div>
      </div>
    </div>
    <div class="action-buttons">
      <button class="btn btn-outline" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">Lên đầu trang</button>
      <button class="btn btn-primary" onclick="window.print()">In Báo Cáo / Xuất PDF</button>
    </div>
  </header>

  <!-- Quick Anchors Nav -->
  <nav class="quick-nav">
    <a href="#sec-tong-quan" class="nav-chip">I. Tổng quan 3 Bậc</a>
    <a href="#sec-tiểu học" class="nav-chip">II. Bậc Tiểu học</a>
    <a href="#sec-thcs" class="nav-chip">III. Bậc THCS</a>
    <a href="#sec-thpt" class="nav-chip">IV. Bậc THPT</a>
    <a href="#sec-ckdv" class="nav-chip">V. Map 76 HS CKĐV & Thống kê thiếu điểm</a>
  </nav>

  <main class="report-wrapper">

    <!-- Hero Banner -->
    <section class="hero-banner">
      <span class="hero-tag">CSDL CHUẨN XÁC HỆ THỐNG SSM • NĂM HỌC 2026 - 2027</span>
      <h1 class="hero-title">BÁO CÁO THỐNG KÊ KỲ KHẢO SÁT ĐẦU NĂM (KSĐN)<br>& MAP ĐIỂM 76 HỌC SINH CAM KẾT ĐẦU VÀO ĐÃ NHẬP HỌC</h1>
      <p class="hero-subtitle">
        Thống kê chi tiết kết quả khảo sát từ Khối 2 đến Khối 12 phân tách theo từng Bậc học và Cơ sở (Bậc THPT bao gồm cả 3 môn chung và 7 môn tự chọn Khối 12); đối sánh kết quả Khảo sát đầu vào (KSĐV) với Khảo sát đầu năm (KSĐN) của 76 học sinh diện Cam kết đầu vào đã nhập học; phân tích chi tiết nhóm học sinh chưa có điểm hoặc thiếu điểm môn cam kết.
      </p>
    </section>

    <!-- Content Sections -->
    ${htmlBody}

    <!-- Footer -->
    <footer class="report-footer">
      <p><strong>HỆ THỐNG GIÁO DỤC SKYLINE • BAN KIỂM TRA & ĐẢM BẢO CHẤT LƯỢNG (KT&ĐBCL)</strong></p>
      <p style="margin-top: 4px; color: #94a3b8;">Hệ thống Quản lý Khảo sát SSM • Dữ liệu trích xuất ngày 29/09/2026</p>
    </footer>

  </main>

  <script>
    function filterCampus(campus, btn) {
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const sections = document.querySelectorAll('.ckdv-campus-section');
      sections.forEach(sec => {
        const c = sec.getAttribute('data-campus');
        if (campus === 'all' || c === campus) {
          sec.style.display = '';
        } else {
          sec.style.display = 'none';
        }
      });
    }

    function searchStudent() {
      const query = document.getElementById('ckdvSearchInput').value.toLowerCase();
      const tables = document.querySelectorAll('.ckdv-table');
      tables.forEach(table => {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          if (text.includes(query)) {
            row.style.display = '';
          } else {
            row.style.display = query === '' ? '' : 'none';
          }
        });
      });
    }
  </script>
</body>
</html>`;

// Save files
const htmlOutWorkspace = 'd:\\SSM\\skyline-survey\\bao_cao_ksdn_va_ckdv_2026.html';
const htmlOutDownloads = 'C:\\Users\\thongpn\\Downloads\\Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.html';
const htmlOutDesktop = 'C:\\Users\\thongpn\\Desktop\\Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.html';

const htmlOutArtifact = 'C:\\Users\\thongpn\\.gemini\\antigravity-ide\\brain\\bde4b516-a7ae-4e5a-ba06-cca3b42b7b51\\bao_cao_ksdn_va_ckdv_2026.html';

fs.writeFileSync(htmlOutWorkspace, fullHtml, 'utf8');
fs.writeFileSync(htmlOutDownloads, fullHtml, 'utf8');
fs.writeFileSync(htmlOutDesktop, fullHtml, 'utf8');
fs.writeFileSync(htmlOutArtifact, fullHtml, 'utf8');

console.log("Successfully generated Tables-Only HTML report with verified English scores and missing entrance scores table!");
