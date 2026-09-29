const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

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

// 76 CKDV data
const campusOrder = { 'CS1': 1, 'CS2': 2, 'CS3': 3, 'CS4': 4, 'CS5': 5 };
ckdvData.sort((a, b) => (campusOrder[a.campus] || 9) - (campusOrder[b.campus] || 9));

const ckdvByCampus = {};
ckdvData.forEach(st => {
  const cmp = st.campus || 'CS1';
  if (!ckdvByCampus[cmp]) ckdvByCampus[cmp] = [];

  let note = '';
  let ksdvStr = '';
  let ksdnStr = '';

  if (st.isPsychology) {
    ksdvStr = '-';
    ksdnStr = '-';
    note = 'HS Cam kết tâm lý';
  } else {
    const ksdvParts = [];
    const ksdnParts = [];

    if (st.ksdvMath != null) ksdvParts.push(`Toán: ${st.ksdvMath}`);
    if (st.ksdnMath != null) ksdnParts.push(`Toán: ${st.ksdnMath}`);

    if (st.ksdvViet != null) ksdvParts.push(`Tiếng Việt: ${st.ksdvViet}`);
    if (st.ksdnViet != null) ksdnParts.push(`Tiếng Việt: ${st.ksdnViet}`);

    if (st.ksdvVan != null) ksdvParts.push(`Ngữ Văn: ${st.ksdvVan}`);
    if (st.ksdnVan != null) ksdnParts.push(`Ngữ Văn: ${st.ksdnVan}`);

    if (st.ksdvEngScale10 != null && st.ksdvEngTotal != null) {
      ksdvParts.push(`Tiếng Anh: ${st.ksdvEngScale10.toFixed(1)} (Tổng: ${st.ksdvEngTotal})`);
    } else if (st.ksdvEngScale10 != null) {
      ksdvParts.push(`Tiếng Anh: ${st.ksdvEngScale10.toFixed(1)}`);
    }

    if (st.ksdnEng != null) ksdnParts.push(`Tiếng Anh: ${st.ksdnEng}`);

    ksdvStr = ksdvParts.join('; ') || 'N/A';
    ksdnStr = ksdnParts.join('; ') || 'N/A';

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
    }
  }

  ckdvByCampus[cmp].push({
    ...st,
    ksdvStr,
    ksdnStr,
    note
  });
});

// THPT Elective Subjects data
const thptElectives = [
  { stt: 1, subject: 'Vật lí', grade: 'Khối 12', campus: 'CS1', total: 13, below: 6, bench: 7, good: 3 },
  { stt: 2, subject: 'Vật lí', grade: 'Khối 12', campus: 'CS3', total: 2, below: 1, bench: 1, good: 1 },
  { isSubTotal: true, subject: 'Vật lí (Toàn khối)', grade: 'Khối 12', campus: 'TỔNG CƠ SỞ', total: 15, below: 7, bench: 8, good: 4 },

  { stt: 3, subject: 'Hóa học', grade: 'Khối 12', campus: 'CS1', total: 2, below: 1, bench: 1, good: 1 },
  { stt: 4, subject: 'Hóa học', grade: 'Khối 12', campus: 'CS3', total: 1, below: 0, bench: 1, good: 0 },
  { stt: 5, subject: 'Hóa học', grade: 'Khối 12', campus: 'CS4', total: 2, below: 1, bench: 1, good: 0 },
  { isSubTotal: true, subject: 'Hóa học (Toàn khối)', grade: 'Khối 12', campus: 'TỔNG CƠ SỞ', total: 5, below: 2, bench: 3, good: 1 },

  { stt: 6, subject: 'Sinh học', grade: 'Khối 12', campus: 'CS1', total: 2, below: 0, bench: 2, good: 2 },
  { isSubTotal: true, subject: 'Sinh học (Toàn khối)', grade: 'Khối 12', campus: 'TỔNG CƠ SỞ', total: 2, below: 0, bench: 2, good: 2 },

  { stt: 7, subject: 'Lịch sử', grade: 'Khối 12', campus: 'CS1', total: 6, below: 1, bench: 5, good: 0 },
  { stt: 8, subject: 'Lịch sử', grade: 'Khối 12', campus: 'CS3', total: 2, below: 0, bench: 2, good: 0 },
  { stt: 9, subject: 'Lịch sử', grade: 'Khối 12', campus: 'CS4', total: 4, below: 1, bench: 3, good: 0 },
  { isSubTotal: true, subject: 'Lịch sử (Toàn khối)', grade: 'Khối 12', campus: 'TỔNG CƠ SỞ', total: 12, below: 2, bench: 10, good: 0 },

  { stt: 10, subject: 'Địa lí', grade: 'Khối 12', campus: 'CS1', total: 5, below: 2, bench: 3, good: 0 },
  { isSubTotal: true, subject: 'Địa lí (Toàn khối)', grade: 'Khối 12', campus: 'TỔNG CƠ SỞ', total: 5, below: 2, bench: 3, good: 0 },

  { stt: 11, subject: 'GD Kinh tế & Pháp luật', grade: 'Khối 12', campus: 'CS1', total: 28, below: 17, bench: 11, good: 0 },
  { isSubTotal: true, subject: 'GDKT&PL (Toàn khối)', grade: 'Khối 12', campus: 'TỔNG CƠ SỞ', total: 28, below: 17, bench: 11, good: 0 },

  { stt: 12, subject: 'Tin học / ICT', grade: 'Khối 12', campus: 'CS1', total: 1, below: 0, bench: 1, good: 1 },
  { stt: 13, subject: 'Tin học / ICT', grade: 'Khối 12', campus: 'CS3', total: 3, below: 0, bench: 3, good: 3 },
  { isSubTotal: true, subject: 'Tin học / ICT (Toàn khối)', grade: 'Khối 12', campus: 'TỔNG CƠ SỞ', total: 4, below: 0, bench: 4, good: 4 }
];

const totalElectiveEntries = 71;
const totalElectiveBelow = 30;
const totalElectiveBench = 41;
const totalElectiveGood = 11;

// 1. Generate HTML Table for Electives
function generateElectivesHtml() {
  let h = `
      <div class="campus-block" style="margin-top: 36px;">
        <h3 class="sub-section-title" style="color: #4338ca;">🔬 BẢNG THỐNG KÊ CHUYÊN ĐỀ: CÁC MÔN TỔ HỢP KHTN, KHXH & ĐẶC THÙ NGOÀI TOÁN - VĂN - ANH (BẬC THPT)</h3>
        <p style="margin-bottom: 12px; color: #475569; font-size: 13px;">
          Gồm các môn phân hóa tổ hợp theo Chương trình GDPT 2018 tại Khối 12 (Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, GDKT&PL, Tin học / ICT) tại các cơ sở CS1, CS3, CS4:
        </p>
        <div class="table-container">
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 50px;">STT</th>
                <th>Môn học</th>
                <th>Khối lớp</th>
                <th>Cơ sở</th>
                <th>Số HS khảo sát</th>
                <th>Điểm dưới TB (&lt; 5.0)</th>
                <th>Tỷ lệ &lt; 5.0</th>
                <th>Điểm Chuẩn (≥ 5.0)</th>
                <th>Tỷ lệ Đạt chuẩn</th>
                <th>Điểm 8 đến 10 (Giỏi)</th>
                <th>Tỷ lệ Giỏi</th>
              </tr>
            </thead>
            <tbody>
  `;

  thptElectives.forEach(r => {
    if (r.isSubTotal) {
      h += `
              <tr class="total-row" style="background-color: #f8fafc; font-weight: 700;">
                <td>-</td>
                <td><strong>${r.subject}</strong></td>
                <td>${r.grade}</td>
                <td><em>${r.campus}</em></td>
                <td><strong>${r.total}</strong></td>
                <td><strong>${r.below}</strong></td>
                <td><strong>${pct(r.below, r.total)}</strong></td>
                <td><strong>${r.bench}</strong></td>
                <td><strong>${pct(r.bench, r.total)}</strong></td>
                <td><strong>${r.good}</strong></td>
                <td><strong>${pct(r.good, r.total)}</strong></td>
              </tr>
      `;
    } else {
      h += `
              <tr>
                <td>${r.stt}</td>
                <td><strong>${r.subject}</strong></td>
                <td>${r.grade}</td>
                <td><span class="badge badge-growth">${r.campus}</span></td>
                <td>${r.total}</td>
                <td>${r.below}</td>
                <td>${pct(r.below, r.total)}</td>
                <td>${r.bench}</td>
                <td><strong>${pct(r.bench, r.total)}</strong></td>
                <td>${r.good}</td>
                <td>${pct(r.good, r.total)}</td>
              </tr>
      `;
    }
  });

  h += `
              <tr class="total-row" style="background-color: #ede9fe; color: #4338ca; font-weight: 800; font-size: 13.5px;">
                <td>TỔNG</td>
                <td colspan="3"><strong>TỔNG CÁC MÔN NGOÀI TOÁN - VĂN - ANH (BẬC THPT)</strong></td>
                <td><strong>${totalElectiveEntries}</strong></td>
                <td><strong>${totalElectiveBelow}</strong></td>
                <td><strong>${pct(totalElectiveBelow, totalElectiveEntries)}</strong></td>
                <td><strong>${totalElectiveBench}</strong></td>
                <td><strong>${pct(totalElectiveBench, totalElectiveEntries)}</strong></td>
                <td><strong>${totalElectiveGood}</strong></td>
                <td><strong>${pct(totalElectiveGood, totalElectiveEntries)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
  `;
  return h;
}

// 2. Generate Markdown Table for Electives
function generateElectivesMd() {
  let m = `### 4.2. BẢNG THỐNG KÊ CHUYÊN ĐỀ: CÁC MÔN TỔ HỢP KHTN, KHXH & ĐẶC THÙ NGOÀI TOÁN - VĂN - ANH (BẬC THPT)\n\n`;
  m += `* Gồm các môn thi phân hóa tổ hợp theo Chương trình GDPT 2018 tại Khối 12: Vật lí, Hóa học, Sinh học, Lịch sử, Địa lí, GD Kinh tế & Pháp luật, Tin học / ICT.\n\n`;
  m += `| STT | Môn | Khối | Cơ sở | Số HS khảo sát | Điểm dưới TB (< 5.0) | Tỷ lệ < 5.0 | Điểm Chuẩn (≥ 5.0) | Tỷ lệ Đạt chuẩn | Điểm 8 đến 10 (Giỏi) | Tỷ lệ Giỏi |\n`;
  m += `| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

  thptElectives.forEach(r => {
    if (r.isSubTotal) {
      m += `| **-** | **${r.subject}** | **${r.grade}** | **${r.campus}** | **${r.total}** | **${r.below}** | **${pct(r.below, r.total)}** | **${r.bench}** | **${pct(r.bench, r.total)}** | **${r.good}** | **${pct(r.good, r.total)}** |\n`;
    } else {
      m += `| ${r.stt} | ${r.subject} | ${r.grade} | ${r.campus} | ${r.total} | ${r.below} | ${pct(r.below, r.total)} | ${r.bench} | ${pct(r.bench, r.total)} | ${r.good} | ${pct(r.good, r.total)} |\n`;
    }
  });

  m += `| **TỔNG** | **TỔNG CÁC MÔN NGOÀI TOÁN - VĂN - ANH** | **Khối 12** | **TOÀN TRƯỜNG** | **${totalElectiveEntries}** | **${totalElectiveBelow}** | **${pct(totalElectiveBelow, totalElectiveEntries)}** | **${totalElectiveBench}** | **${pct(totalElectiveBench, totalElectiveEntries)}** | **${totalElectiveGood}** | **${pct(totalElectiveGood, totalElectiveEntries)}** |\n\n`;
  m += `---\n\n`;
  return m;
}

// 3. Rebuild Complete HTML
// We can run the HTML generator and append the elective section inside Section IV
console.log("Generating Electives HTML and Markdown blocks...");

// Let's create an updated HTML builder
const buildHtmlScript = fs.readFileSync(path.join(__dirname, 'generate_tables_only_report.js'), 'utf8');

// Insert generateElectivesHtml() before `secHtml += level-summary-card` for THPT
const modifiedHtmlScript = buildHtmlScript.replace(
  "htmlBody += generateLevelSection(4, 'THPT', 'THPT (Chuẩn Đạt: Điểm ≥ 5.0)', 'Điểm Chuẩn (≥ 5.0)', 'IV');",
  `htmlBody += generateLevelSection(4, 'THPT', 'THPT (Chuẩn Đạt: Điểm ≥ 5.0)', 'Điểm Chuẩn (≥ 5.0)', 'IV');\n    htmlBody = htmlBody.replace('</section>\\n    <!-- SECTION V:', \`${generateElectivesHtml()}\\n    </section>\\n    <!-- SECTION V:\`);`
);

fs.writeFileSync(path.join(__dirname, 'generate_tables_only_report.js'), modifiedHtmlScript, 'utf8');
console.log("Updated generate_tables_only_report.js with THPT electives!");

// Execute HTML generator
require('./generate_tables_only_report.js');

// 4. Update Markdown
let mdContent = fs.readFileSync(path.join(__dirname, '..', 'bao_cao_ksdn_va_ckdv_2026.html'), 'utf8');
// Let's also update sync_md_tables_only.js
let mdScript = fs.readFileSync(path.join(__dirname, 'sync_md_tables_only.js'), 'utf8');
mdScript = mdScript.replace(
  "appendLevelMd('THPT', 'THPT (Chuẩn Đạt: Điểm ≥ 5.0)', 'Điểm Chuẩn (≥ 5.0)', 'IV');",
  `appendLevelMd('THPT', 'THPT (Chuẩn Đạt: Điểm ≥ 5.0)', 'Điểm Chuẩn (≥ 5.0)', 'IV');\nmd += \`${generateElectivesMd()}\`;`
);
fs.writeFileSync(path.join(__dirname, 'sync_md_tables_only.js'), mdScript, 'utf8');
require('./sync_md_tables_only.js');

// 5. Update Excel
const wb = XLSX.readFile(path.join(__dirname, '..', 'Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.xlsx'));

// Create dedicated sheet for THPT Electives
const electiveSheetRows = [
  ['BẢNG THỐNG KÊ CHUYÊN ĐỀ: CÁC MÔN TỔ HỢP KHTN, KHXH & ĐẶC THÙ NGOÀI TOÁN - VĂN - ANH (BẬC THPT)'],
  ['* Đối tượng: Học sinh Khối 12 phân hóa tổ hợp theo Chương trình GDPT 2018'],
  ['* Chuẩn đạt điểm: ≥ 5.0'],
  [],
  ['STT', 'Môn học', 'Khối lớp', 'Cơ sở', 'Số HS khảo sát', 'Điểm dưới TB (< 5.0)', 'Tỷ lệ < 5.0', 'Điểm Chuẩn (≥ 5.0)', 'Tỷ lệ Đạt chuẩn', 'Điểm 8 đến 10 (Giỏi)', 'Tỷ lệ Giỏi']
];

thptElectives.forEach(r => {
  if (r.isSubTotal) {
    electiveSheetRows.push([
      '-',
      r.subject,
      r.grade,
      r.campus,
      r.total,
      r.below,
      pct(r.below, r.total),
      r.bench,
      pct(r.bench, r.total),
      r.good,
      pct(r.good, r.total)
    ]);
  } else {
    electiveSheetRows.push([
      r.stt,
      r.subject,
      r.grade,
      r.campus,
      r.total,
      r.below,
      pct(r.below, r.total),
      r.bench,
      pct(r.bench, r.total),
      r.good,
      pct(r.good, r.total)
    ]);
  }
});

electiveSheetRows.push([
  'TỔNG',
  'TỔNG CÁC MÔN NGOÀI TOÁN - VĂN - ANH',
  'Khối 12',
  'TOÀN TRƯỜNG',
  totalElectiveEntries,
  totalElectiveBelow,
  pct(totalElectiveBelow, totalElectiveEntries),
  totalElectiveBench,
  pct(totalElectiveBench, totalElectiveEntries),
  totalElectiveGood,
  pct(totalElectiveGood, totalElectiveEntries)
]);

const wsElectives = XLSX.utils.aoa_to_sheet(electiveSheetRows);
// Append sheet or replace
if (wb.SheetNames.includes('THPT_Mon_Ngoai_TVA')) {
  wb.Sheets['THPT_Mon_Ngoai_TVA'] = wsElectives;
} else {
  XLSX.utils.book_append_sheet(wb, wsElectives, 'THPT_Mon_Ngoai_TVA');
}

const outXlsxWs = path.join(__dirname, '..', 'Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.xlsx');
const outXlsxDl = 'C:\\Users\\thongpn\\Downloads\\Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.xlsx';
const outXlsxDt = 'C:\\Users\\thongpn\\Desktop\\Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.xlsx';

XLSX.writeFile(wb, outXlsxWs);
XLSX.writeFile(wb, outXlsxDl);
XLSX.writeFile(wb, outXlsxDt);

console.log("Successfully updated all HTML, Markdown, and Excel reports with THPT electives!");
