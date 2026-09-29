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

const ckdvByCampus = {};
ckdvData.forEach(st => {
  const cmp = st.campus || 'CS1';
  if (!ckdvByCampus[cmp]) ckdvByCampus[cmp] = [];

  let note = '';
  let ksdvStr = '';
  let ksdnStr = '';

  if (st.isPsychology) {
    ksdvStr = '<span class="badge badge-psychology">HS Cam kết tâm lý</span>';
    ksdnStr = '—';
    note = 'Theo dõi phát triển tâm lý lứa tuổi';
  } else {
    const ksdvParts = [];
    const ksdnParts = [];

    if (st.ksdvMath != null) ksdvParts.push(`Toán: ${st.ksdvMath}`);
    if (st.ksdnMath != null) ksdnParts.push(`Toán: ${st.ksdnMath}`);

    if (st.ksdvViet != null) ksdvParts.push(`Tiếng Việt: ${st.ksdvViet}`);
    if (st.ksdnViet != null) ksdnParts.push(`Tiếng Việt: ${st.ksdnViet}`);

    if (st.ksdvVan != null) ksdvParts.push(`Ngữ Văn: ${st.ksdvVan}`);
    if (st.ksdnVan != null) ksdnParts.push(`Ngữ Văn: ${st.ksdnVan}`);

    // English: Show both Scale 10 and raw Total Score
    if (st.ksdvEngScale10 != null && st.ksdvEngTotal != null) {
      ksdvParts.push(`Tiếng Anh: ${st.ksdvEngScale10.toFixed(1)} (Tổng: ${st.ksdvEngTotal})`);
    } else if (st.ksdvEngScale10 != null) {
      ksdvParts.push(`Tiếng Anh: ${st.ksdvEngScale10.toFixed(1)}`);
    }

    if (st.ksdnEng != null) ksdnParts.push(`Tiếng Anh: ${st.ksdnEng}`);

    // If completely missing
    if (st.ksdvStatus === 'Chưa có điểm KSĐV') {
      ksdvStr = `<span class="badge badge-warning">Chưa có điểm KSĐV</span>`;
      if (st.missingReason.includes('Tuyển thẳng')) {
        note = `Tuyển thẳng (KSĐN: Đạt xuất sắc)`;
      } else if (st.missingReason.includes('ngôn ngữ')) {
        note = `Theo dõi ngôn ngữ Khối 1`;
      } else {
        note = `Chờ cập nhật điểm bài thi KSĐV`;
      }
    } else {
      ksdvStr = ksdvParts.join('; ');
      if (st.missingCommitted && st.missingCommitted.length > 0) {
        ksdvStr += ` <span style="color: #b45309; font-size: 11px;">(${st.missingCommitted.join(', ')}: Chưa có điểm)</span>`;
      }
    }

    ksdnStr = ksdnParts.join('; ') || 'Chưa có bài KSĐN';

    if (st.ksdvStatus !== 'Chưa có điểm KSĐV') {
      if (st.ksdnEng != null && st.ksdvEngScale10 != null) {
        const diff = +(st.ksdnEng - st.ksdvEngScale10).toFixed(1);
        if (diff >= 3.0) note = `Bứt phá ngoạn mục (+${diff})`;
        else if (diff >= 1.0) note = `Tiến bộ rõ rệt (+${diff})`;
        else if (st.ksdnEng < 5.0 && st.grade >= 6) note = `Dưới TB môn Anh (${st.ksdnEng})`;
        else if (st.ksdnEng < 7.0 && st.grade <= 5) note = `Chưa đạt chuẩn Tiểu học (${st.ksdnEng})`;
        else note = `Đạt chuẩn môn Anh (${st.ksdnEng})`;
      } else if (st.ksdnMath != null && st.ksdvMath != null) {
        const diff = +(st.ksdnMath - st.ksdvMath).toFixed(1);
        if (diff >= 2.0) note = `Tiến bộ tốt môn Toán (+${diff})`;
        else if (st.ksdnMath < 5.0 && st.grade >= 6) note = `Dưới TB môn Toán (${st.ksdnMath})`;
        else note = `Đạt chuẩn môn Toán (${st.ksdnMath})`;
      } else if (st.missingReason) {
        note = st.missingReason;
      }
    }
  }

  ckdvByCampus[cmp].push({
    ...st,
    ksdvStr,
    ksdnStr,
    note
  });
});

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
              <td>53</td>
              <td>2.0%</td>
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
              <td>310</td>
              <td>14.8%</td>
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
              <td>174</td>
              <td>34.3%</td>
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
              <td><strong>537</strong></td>
              <td><strong>10.3%</strong></td>
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
      <h3 class="campus-title">🏫 CƠ SỞ: ${cmp} - BẬC ${lvlName.toUpperCase()}</h3>
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
              <td style="width: 50px;">★</td>
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

// Bổ sung Phần Chuyên đề THPT (7 môn tự chọn Khối 12)
htmlBody += `
    <!-- BẢNG CHUYÊN ĐỀ: 7 MÔN TỰ CHỌN THPT (KHỐI 12) -->
    <section class="report-section" id="sec-thpt-electives" style="margin-top: 15px;">
      <div class="section-header">
        <span class="section-badge">CHUYÊN ĐỀ THPT</span>
        <h2 class="section-title">THỐNG KÊ CHI TIẾT 7 MÔN TỰ CHỌN KHỐI 12 THEO CƠ SỞ (NGOÀI TOÁN - VĂN - ANH)</h2>
      </div>

      <div class="alert alert-note">
        • <strong>Đối tượng khảo sát:</strong> Học sinh Khối 12 tham gia làm bài khảo sát định hướng tốt nghiệp THPT theo tổ hợp môn tự chọn (Khoa học Tự nhiên & Khoa học Xã hội).<br>
        • <strong>Các môn khảo sát:</strong> Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, GD Kinh tế & Pháp luật (GDKT&PL), Tin học.<br>
        • <strong>Chuẩn đạt điểm:</strong> Điểm Đạt chuẩn là <code>≥ 5.0</code>. Điểm Dưới trung bình là <code>&lt; 5.0</code>. Điểm Giỏi là <code>8.0 - 10.0</code>.
      </div>

      <div class="table-container">
        <table class="report-table">
          <thead>
            <tr>
              <th style="width: 50px;">STT</th>
              <th>Cơ sở</th>
              <th>Môn học tự chọn</th>
              <th>Khối lớp</th>
              <th>Số HS khảo sát</th>
              <th>Điểm dưới TB (&lt; 5.0)</th>
              <th>Tỷ lệ &lt; 5.0</th>
              <th>Điểm Chuẩn (≥ 5.0)</th>
              <th>Tỷ lệ Đạt chuẩn</th>
              <th>Điểm 8 - 10 (Giỏi)</th>
              <th>Tỷ lệ Giỏi</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td><strong>CS1</strong></td>
              <td>Vật lí</td>
              <td>Khối 12</td>
              <td>13</td>
              <td>2</td>
              <td><span class="badge badge-danger">15.4%</span></td>
              <td><strong>11</strong></td>
              <td><span class="badge badge-success">84.6%</span></td>
              <td>2</td>
              <td><span class="badge badge-growth">15.4%</span></td>
            </tr>
            <tr>
              <td>2</td>
              <td><strong>CS1</strong></td>
              <td>Hóa học</td>
              <td>Khối 12</td>
              <td>11</td>
              <td>4</td>
              <td><span class="badge badge-danger">36.4%</span></td>
              <td><strong>7</strong></td>
              <td><span class="badge badge-warning">63.6%</span></td>
              <td>2</td>
              <td><span class="badge badge-growth">18.2%</span></td>
            </tr>
            <tr>
              <td>3</td>
              <td><strong>CS1</strong></td>
              <td>Sinh học</td>
              <td>Khối 12</td>
              <td>10</td>
              <td>0</td>
              <td>0.0%</td>
              <td><strong>10</strong></td>
              <td><span class="badge badge-success">100.0%</span></td>
              <td>3</td>
              <td><span class="badge badge-growth">30.0%</span></td>
            </tr>
            <tr>
              <td>4</td>
              <td><strong>CS1</strong></td>
              <td>Lịch sử</td>
              <td>Khối 12</td>
              <td>11</td>
              <td>5</td>
              <td><span class="badge badge-danger">45.5%</span></td>
              <td><strong>6</strong></td>
              <td><span class="badge badge-warning">54.5%</span></td>
              <td>0</td>
              <td>0.0%</td>
            </tr>
            <tr>
              <td>5</td>
              <td><strong>CS1</strong></td>
              <td>Địa lí</td>
              <td>Khối 12</td>
              <td>11</td>
              <td>0</td>
              <td>0.0%</td>
              <td><strong>11</strong></td>
              <td><span class="badge badge-success">100.0%</span></td>
              <td>2</td>
              <td><span class="badge badge-growth">18.2%</span></td>
            </tr>
            <tr>
              <td>6</td>
              <td><strong>CS1</strong></td>
              <td>GD Kinh tế & Pháp luật</td>
              <td>Khối 12</td>
              <td>11</td>
              <td>0</td>
              <td>0.0%</td>
              <td><strong>11</strong></td>
              <td><span class="badge badge-success">100.0%</span></td>
              <td>3</td>
              <td><span class="badge badge-growth">27.3%</span></td>
            </tr>
            <tr>
              <td>7</td>
              <td><strong>CS1</strong></td>
              <td>Tin học / ICT</td>
              <td>Khối 12</td>
              <td>4</td>
              <td>1</td>
              <td><span class="badge badge-danger">25.0%</span></td>
              <td><strong>3</strong></td>
              <td><span class="badge badge-warning">75.0%</span></td>
              <td>0</td>
              <td>0.0%</td>
            </tr>
            <tr class="subtotal-row">
              <td>-</td>
              <td colspan="3"><strong>TỔNG 7 MÔN TỰ CHỌN KHỐI 12 TẠI CS1</strong></td>
              <td><strong>71</strong></td>
              <td><strong>12</strong></td>
              <td><span class="badge badge-danger">16.9%</span></td>
              <td><strong>59</strong></td>
              <td><span class="badge badge-success">83.1%</span></td>
              <td><strong>12</strong></td>
              <td><span class="badge badge-growth">16.9%</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
`;

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
        <div class="kpi-card kpi-success">
          <div class="kpi-label">Đủ Điểm Tất Cả Môn CKĐV</div>
          <div class="kpi-number">58</div>
          <div class="kpi-subtext">76.3% (Có đầy đủ điểm KSĐV & KSĐN)</div>
        </div>
        <div class="kpi-card kpi-warning">
          <div class="kpi-label">Thiếu Điểm Môn Cam Kết</div>
          <div class="kpi-number">11</div>
          <div class="kpi-subtext">14.5% (HS quốc tế/ngoại ngữ/chưa nhập Anh)</div>
        </div>
        <div class="kpi-card kpi-danger">
          <div class="kpi-label">Chưa Có Điểm KSĐV</div>
          <div class="kpi-number">3</div>
          <div class="kpi-subtext">3.9% (Tuyển thẳng 1, Lớp 1 theo dõi 1, Chưa nhập 1)</div>
        </div>
        <div class="kpi-card kpi-purple">
          <div class="kpi-label">Cam Kết Tâm Lý Lứa Tuổi</div>
          <div class="kpi-number">4</div>
          <div class="kpi-subtext">5.3% (Chỉ theo dõi tâm lý, không khảo sát VH)</div>
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
              <td><strong>36</strong></td>
              <td><span class="badge badge-growth">40.0%</span></td>
              <td>Tiếng Anh, Toán, Ngữ Văn, Tâm lý</td>
            </tr>
            <tr>
              <td>2</td>
              <td><strong>CS2</strong></td>
              <td>36</td>
              <td><strong>8</strong></td>
              <td><span class="badge badge-growth">22.2%</span></td>
              <td>Tiếng Anh, Tiếng Việt, Tâm lý</td>
            </tr>
            <tr>
              <td>3</td>
              <td><strong>CS3</strong></td>
              <td>65</td>
              <td><strong>8</strong></td>
              <td><span class="badge badge-growth">12.3%</span></td>
              <td>Tiếng Việt, Tiếng Anh (ESL), Toán</td>
            </tr>
            <tr>
              <td>4</td>
              <td><strong>CS4</strong></td>
              <td>14</td>
              <td><strong>12</strong></td>
              <td><span class="badge badge-growth">85.7%</span></td>
              <td>Tiếng Anh, Toán, Ngữ Văn</td>
            </tr>
            <tr>
              <td>5</td>
              <td><strong>CS5</strong></td>
              <td>62</td>
              <td><strong>12</strong></td>
              <td><span class="badge badge-growth">19.4%</span></td>
              <td>Tiếng Anh, Toán</td>
            </tr>
            <tr class="total-row">
              <td>-</td>
              <td><strong>TỔNG TOÀN HỆ THỐNG</strong></td>
              <td><strong>292</strong></td>
              <td><strong>76</strong></td>
              <td><strong>26.0%</strong></td>
              <td><strong>Toán, Tiếng Việt, Tiếng Anh, Ngữ Văn, Tâm lý</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- BẢNG CHUYÊN ĐỀ MỚI: THỐNG KÊ HỌC SINH CHƯA CÓ / THIẾU ĐIỂM KSĐV -->
      <h3 class="sub-section-title" style="margin-top: 36px; color: #b45309;">2. Bảng Thống kê Chi tiết Học sinh Chưa có Điểm KSĐV & Thiếu Điểm Môn Cam Kết (${missingKsdvStudents.length} học sinh)</h3>
      
      <div class="alert alert-note" style="border-left-color: #d97706; background-color: #fffbeb;">
        <strong>Phân loại nguyên nhân hồ sơ khảo sát đầu vào:</strong><br>
        • <strong>Hoàn toàn chưa có điểm KSĐV (3 HS):</strong> Gồm 01 HS diện Tuyển thẳng (Lê Nguyên Khang - KSĐN đạt loại Giỏi: Toán 9.0, Tiếng Việt 8.0, Tiếng Anh 7.9); 01 HS Khối 1 cam kết theo dõi phát triển ngôn ngữ (Phan Hải Đăng); và 01 HS chưa cập nhật điểm bài thi Tiếng Anh trên hệ thống (Nguyễn Thanh Thảo).<br>
        • <strong>Thiếu môn cam kết đầu vào (11 HS):</strong> Gồm 05 HS quốc tịch nước ngoài / song ngữ nhập học cần bồi dưỡng Tiếng Việt (chưa qua thi khảo sát Tiếng Việt đầu vào); 04 HS chưa nhập điểm môn Tiếng Anh trên hệ thống (đã có điểm Toán, Văn); 01 HS hệ Quốc tế chỉ thi bài EPT (Phan Anh Quân); 01 HS diện bảo lưu/miễn thi Toán (Mai Huy Thắng).<br>
        • <strong>Cam kết Tâm lý (4 HS):</strong> Học sinh chỉ cam kết theo dõi tâm lý lứa tuổi, không thuộc diện cam kết văn hóa.
      </div>

      <div class="table-container">
        <table class="report-table">
          <thead>
            <tr style="background: #fef3c7;">
              <th style="width: 45px;">STT</th>
              <th>Cơ sở</th>
              <th>Họ và tên</th>
              <th>Lớp & Khối</th>
              <th>Môn Cam Kết</th>
              <th>Phân loại Tình trạng</th>
              <th>Điểm KSĐV Hiện Có</th>
              <th>Điểm KSĐN Thực Tế</th>
              <th>Nguyên nhân / Căn cứ Hồ sơ Tuyển sinh</th>
            </tr>
          </thead>
          <tbody>
`;

missingKsdvStudents.forEach((st, idx) => {
  let statusBadge = '';
  if (st.ksdvStatus === 'Chưa có điểm KSĐV') {
    statusBadge = `<span class="badge badge-danger">Chưa có điểm KSĐV</span>`;
  } else if (st.ksdvStatus === 'Thiếu môn CKĐV') {
    statusBadge = `<span class="badge badge-warning">Thiếu môn CKĐV</span>`;
  } else if (st.ksdvStatus === 'Cam kết Tâm lý') {
    statusBadge = `<span class="badge badge-psychology">Cam kết Tâm lý</span>`;
  }

  // ksdv parts
  const ksdvP = [];
  if (st.ksdvMath != null) ksdvP.push(`Toán: ${st.ksdvMath}`);
  if (st.ksdvViet != null) ksdvP.push(`Tiếng Việt: ${st.ksdvViet}`);
  if (st.ksdvVan != null) ksdvP.push(`Ngữ Văn: ${st.ksdvVan}`);
  if (st.ksdvEngScale10 != null) ksdvP.push(`Anh: ${st.ksdvEngScale10.toFixed(1)} (Tổng: ${st.ksdvEngTotal})`);
  const currentKsdvText = ksdvP.length > 0 ? ksdvP.join('; ') : '—';

  // ksdn parts
  const ksdnP = [];
  if (st.ksdnMath != null) ksdnP.push(`Toán: ${st.ksdnMath}`);
  if (st.ksdnViet != null) ksdnP.push(`Tiếng Việt: ${st.ksdnViet}`);
  if (st.ksdnVan != null) ksdnP.push(`Ngữ Văn: ${st.ksdnVan}`);
  if (st.ksdnEng != null) ksdnP.push(`Anh: ${st.ksdnEng}`);
  const currentKsdnText = ksdnP.length > 0 ? ksdnP.join('; ') : '—';

  const commText = Array.isArray(st.committedSubjects) ? st.committedSubjects.join(', ') : (st.committedSubjects || '');

  htmlBody += `
            <tr>
              <td>${idx + 1}</td>
              <td><strong>${st.campus}</strong></td>
              <td><strong>${st.fullName}</strong></td>
              <td><code>${st.className || 'Chưa rõ'}</code> (${st.grade ? `Khối ${st.grade}` : ''})</td>
              <td>${commText}</td>
              <td>${statusBadge}</td>
              <td><strong>${currentKsdvText}</strong></td>
              <td><strong style="color: #1e3a8a;">${currentKsdnText}</strong></td>
              <td>${st.missingReason || '—'}</td>
            </tr>
  `;
});

htmlBody += `
          </tbody>
        </table>
      </div>

      <!-- Bảng chi tiết 76 học sinh -->
      <h3 class="sub-section-title" style="margin-top: 36px;">3. Danh sách Chi tiết 76 Học sinh CKĐV Nhập học - Map Điểm KSĐV vs KSĐN theo Từng Cơ sở</h3>
      
      <div class="alert alert-note">
        • <strong>Điểm Tiếng Anh KSĐV:</strong> Được lấy trực tiếp từ <strong>Cột Tổng điểm</strong> (Thang 100) và <strong>quy đổi chuẩn xác về Thang 10 (Scale 10)</strong> theo công thức: <code>Scale 10 = Tổng điểm / 10</code> (hiển thị cả Scale 10 và Cột Tổng điểm gốc, ví dụ: <code>Tiếng Anh: 4.1 (Tổng: 41)</code>).<br>
        • <strong>Học sinh diện Cam kết Tâm lý:</strong> Cột điểm hiển thị rõ diện theo dõi tâm lý lứa tuổi.<br>
        • <strong>Học sinh chưa có điểm / thiếu điểm môn cam kết:</strong> Được chú thích cụ thể lý do (tuyển thẳng, học sinh nước ngoài, chờ cập nhật bài thi...).
      </div>

      <!-- Filter bar for 76 students -->
      <div class="filter-bar">
        <div class="filter-tabs">
          <button class="filter-tab active" onclick="filterCampus('all', this)">Tất cả (76 HS)</button>
          <button class="filter-tab" onclick="filterCampus('CS1', this)">CS1 (36)</button>
          <button class="filter-tab" onclick="filterCampus('CS2', this)">CS2 (8)</button>
          <button class="filter-tab" onclick="filterCampus('CS3', this)">CS3 (8)</button>
          <button class="filter-tab" onclick="filterCampus('CS4', this)">CS4 (12)</button>
          <button class="filter-tab" onclick="filterCampus('CS5', this)">CS5 (12)</button>
        </div>
        <div class="search-box">
          <span>🔍&nbsp;</span>
          <input type="text" id="ckdvSearchInput" placeholder="Tìm tên học sinh, lớp, môn CKĐV..." onkeyup="searchStudent()">
        </div>
      </div>
`;

// Render 76 students by campus
const campusTitles = {
  'CS1': 'CƠ SỞ CS1 (36 học sinh)',
  'CS2': 'CƠ SỞ CS2 (8 học sinh)',
  'CS3': 'CƠ SỞ CS3 (8 học sinh)',
  'CS4': 'CƠ SỞ CS4 (12 học sinh)',
  'CS5': 'CƠ SỞ CS5 (12 học sinh)'
};

Object.keys(ckdvByCampus).sort().forEach(cmp => {
  const students = ckdvByCampus[cmp];
  htmlBody += `
      <div class="ckdv-campus-section" data-campus="${cmp}">
        <h4 class="campus-title">🏫 ${campusTitles[cmp] || `CƠ SỞ ${cmp} (${students.length} học sinh)`}</h4>
        <div class="table-container">
          <table class="report-table ckdv-table">
            <thead>
              <tr>
                <th style="width: 50px;">STT</th>
                <th>Họ và tên</th>
                <th>Lớp</th>
                <th>Khối</th>
                <th>Môn CKĐV</th>
                <th>Điểm KSĐV Môn Cam Kết (Thang 10 & Cột Tổng điểm)</th>
                <th>Điểm KSĐN Môn Tương Ứng</th>
                <th>Ghi chú & Trạng thái</th>
              </tr>
            </thead>
            <tbody>
  `;

  students.forEach((st, idx) => {
    let noteBadge = st.note;
    if (st.isPsychology) {
      noteBadge = `<span class="badge badge-psychology">🧠 HS Cam kết tâm lý</span>`;
    } else if (st.note.includes('Bứt phá') || st.note.includes('Tiến bộ')) {
      noteBadge = `<span class="badge badge-growth">${st.note}</span>`;
    } else if (st.note.includes('Dưới TB') || st.note.includes('Chưa đạt')) {
      noteBadge = `<span class="badge badge-danger">${st.note}</span>`;
    } else if (st.note.includes('Đạt chuẩn') || st.note.includes('Đạt xuất sắc')) {
      noteBadge = `<span class="badge badge-success">${st.note}</span>`;
    } else if (st.note.includes('Tuyển thẳng') || st.note.includes('nước ngoài') || st.note.includes('Hệ Quốc tế')) {
      noteBadge = `<span class="badge badge-warning">${st.note}</span>`;
    }

    const subjectsStr = Array.isArray(st.committedSubjects) ? st.committedSubjects.join(', ') : (st.committedSubjects || '');

    htmlBody += `
              <tr>
                <td>${idx + 1}</td>
                <td><strong>${st.fullName}</strong></td>
                <td><code>${st.className || 'Chưa rõ'}</code></td>
                <td>Khối ${st.grade || ''}</td>
                <td>${subjectsStr}</td>
                <td><strong>${st.ksdvStr}</strong></td>
                <td><strong>${st.ksdnStr}</strong></td>
                <td>${noteBadge}</td>
              </tr>
    `;
  });

  htmlBody += `
            </tbody>
          </table>
        </div>
      </div>
  `;
});

htmlBody += `
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
      <button class="btn btn-outline" onclick="window.scrollTo({top: 0, behavior: 'smooth'})">⬆ Đầu trang</button>
      <button class="btn btn-primary" onclick="window.print()">🖨 In Báo Cáo / Xuất PDF</button>
    </div>
  </header>

  <!-- Quick Anchors Nav -->
  <nav class="quick-nav">
    <a href="#sec-tong-quan" class="nav-chip">I. Tổng quan 3 Bậc</a>
    <a href="#sec-tiểu học" class="nav-chip">II. Bậc Tiểu học</a>
    <a href="#sec-thcs" class="nav-chip">III. Bậc THCS</a>
    <a href="#sec-thpt" class="nav-chip">IV. Bậc THPT</a>
    <a href="#sec-thpt-electives" class="nav-chip">Chuyên đề 7 Môn K12</a>
    <a href="#sec-ckdv" class="nav-chip">V. Map 76 HS CKĐV & Thống kê thiếu điểm</a>
  </nav>

  <main class="report-wrapper">

    <!-- Hero Banner -->
    <section class="hero-banner">
      <span class="hero-tag">CSDL CHUẨN XÁC HỆ THỐNG SSM • NĂM HỌC 2026 - 2027</span>
      <h1 class="hero-title">BÁO CÁO THỐNG KÊ KỲ KHẢO SÁT ĐẦU NĂM (KSĐN)<br>& MAP ĐIỂM 76 HỌC SINH CAM KẾT ĐẦU VÀO ĐÃ NHẬP HỌC</h1>
      <p class="hero-subtitle">
        Thống kê chi tiết kết quả khảo sát từ Khối 2 đến Khối 12 phân tách theo từng Bậc học và Cơ sở; bổ sung chuyên đề 7 môn tự chọn Khối 12; đối sánh kết quả Khảo sát đầu vào (KSĐV) với Khảo sát đầu năm (KSĐN) của 76 học sinh diện Cam kết đầu vào đã nhập học; phân tích chi tiết nhóm học sinh chưa có điểm hoặc thiếu điểm môn cam kết.
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

fs.writeFileSync(htmlOutWorkspace, fullHtml, 'utf8');
fs.writeFileSync(htmlOutDownloads, fullHtml, 'utf8');
fs.writeFileSync(htmlOutDesktop, fullHtml, 'utf8');

console.log("Successfully generated Tables-Only HTML report with verified English scores and missing entrance scores table!");
