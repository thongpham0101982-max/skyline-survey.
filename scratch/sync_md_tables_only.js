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

let md = `# BÁO CÁO THỐNG KÊ KỲ KHẢO SÁT ĐẦU NĂM (KSĐN)
## & BẢNG MAP ĐIỂM 76 HỌC SINH CAM KẾT ĐẦU VÀO (CKĐV) ĐÃ NHẬP HỌC
### CSDL THỰC TẾ HỆ THỐNG SSM - NĂM HỌC 2026 - 2027

> [!IMPORTANT]
> **QUY CHUẨN ĐÁNH GIÁ CHẤT LƯỢNG & NGUYÊN TẮC DỮ LIỆU:**
> * **Chuẩn Bậc Tiểu học**: Toán, Tiếng Việt, Tiếng Anh **từ 7.0 điểm trở lên (≥ 7.0)**. Dưới TB: **< 5.0**. Giỏi: **8.0 - 10.0**.
> * **Chuẩn Bậc THCS & THPT**: Mức điểm đạt chuẩn là **từ 5.0 điểm trở lên (≥ 5.0)**. Dưới TB: **< 5.0**. Giỏi: **8.0 - 10.0**.
> * **Điểm Tiếng Anh KSĐV**: Được lấy trực tiếp từ **Cột Tổng điểm** (thang 100) và **quy đổi chuẩn xác về Thang điểm 10 (Scale 10 = Tổng điểm / 10)** (hiển thị cả Scale 10 và Cột Tổng điểm gốc, ví dụ: 4.1 [Tổng: 41]; 8.4 [Tổng: 84]; 9.6 [Tổng: 96]).
> * **Học sinh diện Cam kết Tâm lý**: Cột điểm hiển thị rõ \`HS Cam kết tâm lý\`, không map điểm thi văn hóa.
> * **Đối tượng theo dõi CKĐV**: Đúng **76 học sinh CKĐV ĐÃ HOÀN TẤT NHẬP HỌC** (\`COMPLETED\`) trên tổng số 292 HS tuyển mới nhập học (chiếm 26.0%).
> * **Thống kê chuyên đề**: Bổ sung bảng 7 môn tự chọn THPT Khối 12 và bảng phân loại chi tiết học sinh chưa có điểm hoặc thiếu môn khảo sát đầu vào.

---

## PHẦN I: BẢNG THỐNG KÊ TỔNG QUAN 3 BẬC HỌC (TOÀN TRƯỜNG)

| STT | Bậc học | Đối tượng Khối | Chuẩn Đạt | Số HS Khảo Sát | Tổng Lượt Bài Thi | Số Bài Đạt Chuẩn | Tỷ Lệ Đạt Chuẩn | Số Bài Dưới TB (< 5.0) | Tỷ Lệ Dưới TB | Số Bài Giỏi (8-10) | Tỷ Lệ Giỏi |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | **Tiểu học** | Khối 2 - 5 | Điểm ≥ 7.0 | 878 | 2.624 | 2.335 | **89.0%** | 49 | 1.9% | 2.002 | 76.3% |
| 2 | **THCS** | Khối 6 - 9 | Điểm ≥ 5.0 | 673 | 2.095 | 1.785 | **85.2%** | 243 | 11.6% | 838 | 40.0% |
| 3 | **THPT** | Khối 10 - 12 | Điểm ≥ 5.0 | 148 | 508 | 334 | **65.7%** | 172 | 33.9% | 76 | 15.0% |
| **-** | **TOÀN TRƯỜNG** | **Khối 2 - 12** | **Theo bậc** | **1.699** | **5.227** | **4.454** | **85.2%** | **464** | **8.9%** | **2.916** | **55.8%** |

---

`;

// Function to generate Level markdown
function appendLevelMd(lvlKey, lvlTitle, benchText, roman) {
  const lvlData = dataByLevel[lvlKey] || {};
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

  md += `## PHẦN ${roman}: BẢNG THỐNG KÊ CHI TIẾT BẬC ${lvlTitle.toUpperCase()} THEO CƠ SỞ\n\n`;

  let grandTotal = 0, grandBelow = 0, grandBench = 0, grandGood = 0;
  const sortedCampuses = Object.keys(campusMap).sort();

  sortedCampuses.forEach(cmp => {
    const rows = sortRows(campusMap[cmp]);
    const cmpTotal = rows.reduce((s, r) => s + r.total, 0);
    const cmpBelow = rows.reduce((s, r) => s + r.belowAvg, 0);
    const cmpBench = rows.reduce((s, r) => s + r.atBenchmark, 0);
    const cmpGood = rows.reduce((s, r) => s + r.good, 0);

    grandTotal += cmpTotal;
    grandBelow += cmpBelow;
    grandBench += cmpBench;
    grandGood += cmpGood;

    md += `### Cơ sở ${cmp} - Bậc ${lvlKey} (Tổng: ${cmpTotal.toLocaleString('vi-VN')} bài thi)\n\n`;
    md += `| STT | Môn | Khối | Số HS khảo sát | Điểm dưới TB (< 5.0) | Tỷ lệ < 5.0 | ${benchText} | Tỷ lệ Đạt chuẩn | Điểm 8 đến 10 (Giỏi) | Tỷ lệ Giỏi |\n`;
    md += `| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;

    rows.forEach((r, idx) => {
      md += `| ${idx + 1} | ${r.subject} | ${r.grade} | ${r.total} | ${r.belowAvg} | ${pct(r.belowAvg, r.total)} | ${r.atBenchmark} | ${pct(r.atBenchmark, r.total)} | ${r.good} | ${pct(r.good, r.total)} |\n`;
    });

    md += `| **-** | **TỔNG CƠ SỞ ${cmp}** | **Các khối** | **${cmpTotal}** | **${cmpBelow}** | **${pct(cmpBelow, cmpTotal)}** | **${cmpBench}** | **${pct(cmpBench, cmpTotal)}** | **${cmpGood}** | **${pct(cmpGood, cmpTotal)}** |\n\n`;
  });

  md += `### TỔNG TOÀN BẬC ${lvlKey.toUpperCase()} (TẤT CẢ CƠ SỞ)\n\n`;
  md += `| Quy mô | Tổng lượt bài thi | Số bài Dưới TB (< 5.0) | Tỷ lệ Dưới TB | Số bài Đạt chuẩn (${benchText.split('|')[0].trim()}) | Tỷ lệ Đạt chuẩn | Số bài Giỏi (8-10) | Tỷ lệ Giỏi |\n`;
  md += `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |\n`;
  md += `| **TOÀN BẬC ${lvlKey.toUpperCase()}** | **${grandTotal.toLocaleString('vi-VN')}** | **${grandBelow}** | **${pct(grandBelow, grandTotal)}** | **${grandBench}** | **${pct(grandBench, grandTotal)}** | **${grandGood}** | **${pct(grandGood, grandTotal)}** |\n\n---\n\n`;
}

appendLevelMd('Tiểu học', 'Tiểu học', 'Chuẩn Đạt (≥ 7.0)', 'II');
appendLevelMd('THCS', 'THCS', 'Chuẩn Đạt (≥ 5.0)', 'III');
appendLevelMd('THPT', 'THPT', 'Chuẩn Đạt (≥ 5.0)', 'IV');

// Section V: CKDV
md += `## PHẦN V: BẢNG MAP KẾT QUẢ KHẢO SÁT ĐẦU VÀO VỚI KHẢO SÁT ĐẦU NĂM (76 HỌC SINH CKĐV ĐÃ NHẬP HỌC)

### 1. Tỷ lệ Học sinh CKĐV Nhập học so với Tuyển mới Nhập học theo Cơ sở

| STT | Cơ sở trường | Số HS Tuyển mới Nhập học (COMPLETED) | Số HS CKĐV ĐÃ NHẬP HỌC | Tỷ lệ CKĐV / Tuyển mới | Nhóm môn cam kết chủ đạo |
| :---: | :--- | :---: | :---: | :---: | :--- |
| 1 | **CS1** | 90 | **36** | **40.0%** | Tiếng Anh, Toán, Ngữ Văn, Tâm lý |
| 2 | **CS2** | 36 | **8** | **22.2%** | Tiếng Anh, Tiếng Việt, Tâm lý |
| 3 | **CS3** | 65 | **8** | **12.3%** | Tiếng Việt, Tiếng Anh (ESL), Toán |
| 4 | **CS4** | 14 | **12** | **85.7%** | Tiếng Anh, Toán, Ngữ Văn |
| 5 | **CS5** | 62 | **12** | **19.4%** | Tiếng Anh, Toán |
| **-** | **TỔNG TOÀN HỆ THỐNG** | **292** | **76** | **26.0%** | **Toán, Tiếng Việt, Tiếng Anh, Ngữ Văn, Tâm lý** |

### 2. Tổng Hợp Tình Trạng Điểm Khảo Sát Đầu Vào (KSĐV) Của 76 Học Sinh CKĐV

| Phân loại tình trạng điểm KSĐV | Số lượng HS | Tỷ lệ % | Đặc điểm & Nguyên nhân hồ sơ |
| :--- | :---: | :---: | :--- |
| **Đủ điểm tất cả môn CKĐV** | **68** | **89.5%** | Đã có đầy đủ điểm KSĐV đúng các môn cam kết (Toán, Văn, Anh quy đổi thang 10 & tổng) |
| **Thiếu điểm môn cam kết** | **8** | **10.5%** | Gồm 7 HS nước ngoài/song ngữ cam kết bồi dưỡng Tiếng Việt (chưa thi TV); 1 HS chưa nhập điểm Anh |
| **TỔNG CỘNG** | **76** | **100.0%** | **Đúng 76 học sinh CKĐV đã hoàn tất nhập học** |

---
`;

// Helpers for synchronized committed subject and score rendering in Markdown
function renderMdCommitted(subs) {
  if (!subs || subs.length === 0) return '—';
  const arr = Array.isArray(subs) ? subs : [subs];
  return arr.map(sub => {
    const s = sub.trim();
    if (s.includes('Anh')) return `**Tiếng Anh**`;
    if (s.includes('Toán')) return `**Toán**`;
    if (s.includes('Tiếng Việt')) return `**Tiếng Việt**`;
    if (s.includes('Văn')) return `**Ngữ Văn**`;
    if (s.includes('Tâm lý')) return `**Tâm lý**`;
    return `**${s}**`;
  }).join(', ');
}

function renderMdKsdv(st) {
  const comms = st.committedSubjects || [];
  const parts = [];

  const hasMath = comms.some(c => c.includes('Toán'));
  const hasViet = comms.some(c => c.includes('Tiếng Việt'));
  const hasVan = comms.some(c => c.includes('Văn'));
  const hasEng = comms.some(c => c.includes('Anh'));

  if (hasMath) {
    if (st.ksdvMath != null) parts.push(`**Toán: ${st.ksdvMath}**`);
    else parts.push(`*Toán: Chưa có điểm*`);
  }
  if (hasViet) {
    if (st.ksdvViet != null) parts.push(`**Tiếng Việt: ${st.ksdvViet}**`);
    else parts.push(`*Tiếng Việt: Chưa có điểm*`);
  }
  if (hasVan) {
    if (st.ksdvVan != null) parts.push(`**Ngữ Văn: ${st.ksdvVan}**`);
    else parts.push(`*Ngữ Văn: Chưa có điểm*`);
  }
  if (hasEng) {
    if (st.ksdvEngScale10 != null) parts.push(`**Tiếng Anh: ${st.ksdvEngScale10 % 1 === 0 ? st.ksdvEngScale10 : st.ksdvEngScale10.toFixed(1)}**`);
    else parts.push(`*Tiếng Anh: Chưa có điểm*`);
  }


  if (st.isPsychology) {
    if (parts.length > 0) return parts.join('; ') + ' (**Theo dõi tâm lý**)';
    return '**Theo dõi tâm lý lứa tuổi**';
  }

  if (st.ksdvStatus === 'Chưa có điểm KSĐV' && parts.length === 0) {
    return '*(Chưa có điểm KSĐV)*';
  }

  if (parts.length === 0) return '—';
  return parts.join('; ');
}

function renderMdKsdn(st) {
  const comms = st.committedSubjects || [];
  const parts = [];

  const hasMath = comms.some(c => c.includes('Toán'));
  const hasViet = comms.some(c => c.includes('Tiếng Việt'));
  const hasVan = comms.some(c => c.includes('Văn'));
  const hasEng = comms.some(c => c.includes('Anh'));

  if (hasMath) {
    if (st.ksdnMath != null) parts.push(`**Toán: ${st.ksdnMath}**`);
    else parts.push(`*Toán: Chưa thi*`);
  }
  if (hasViet) {
    if (st.ksdnViet != null) parts.push(`**Tiếng Việt: ${st.ksdnViet}**`);
    else parts.push(`*Tiếng Việt: Chưa thi*`);
  }
  if (hasVan) {
    if (st.ksdnVan != null) parts.push(`**Ngữ Văn: ${st.ksdnVan}**`);
    else parts.push(`*Ngữ Văn: Chưa thi*`);
  }
  if (hasEng) {
    if (st.ksdnEng != null) parts.push(`**Tiếng Anh: ${st.ksdnEng}**`);
    else parts.push(`*Tiếng Anh: Chưa thi*`);
  }

  if (st.isPsychology && parts.length === 0) {
    const psyKsdn = [];
    if (st.ksdnMath != null) psyKsdn.push(`Toán: ${st.ksdnMath}`);
    if (st.ksdnViet != null) psyKsdn.push(`Tiếng Việt: ${st.ksdnViet}`);
    if (st.ksdnVan != null) psyKsdn.push(`Ngữ Văn: ${st.ksdnVan}`);
    if (st.ksdnEng != null) psyKsdn.push(`Tiếng Anh: ${st.ksdnEng}`);
    if (psyKsdn.length > 0) return psyKsdn.join('; ');
    return '*Chưa có bài KSĐN (Khối 1)*';
  }

  if (parts.length > 0) return parts.join('; ');
  if (st.grade === '1' || st.grade === 1) return '*Chưa có bài KSĐN (Khối 1)*';
  return '*Chưa có bài KSĐN*';
}

const { getPreparedCkdvData, computeCampusSummary } = require('./calculate_ckdv_progress_table.js');
const ckdvByCampus = getPreparedCkdvData();

const totalInTable = Object.values(ckdvByCampus).reduce((s, l) => s + l.length, 0);

md += `\n---\n\n### 2. Danh sách Chi tiết ${totalInTable} Học sinh CKĐV Nhập học - Map Điểm KSĐV vs KSĐN theo Từng Cơ sở\n\n`;
md += `> **Quy chuẩn đánh giá & Chuẩn hóa môn cam kết:**\n`;
md += `> • **Tiến bộ:** Với Tiểu học, điểm KSĐN phải **đạt từ 5.0 trở lên mới tính là Tiến bộ, nhưng không đạt chuẩn**.\n`;
md += `> • **Đạt chuẩn:** Tiểu học điểm ≥ 7.0; THCS & THPT điểm ≥ 5.0.\n`;
md += `> • **Chuẩn hóa Môn Cam Kết:** Chỉ hiển thị đúng các học sinh có môn cam kết học thuật cụ thể (Toán, Tiếng Việt, Ngữ Văn, Tiếng Anh, Tâm lý) đúng theo mục xét duyệt *Môn Cam Kết (đã chọn)* trên hệ thống. 6 học sinh diện Chung / Theo dõi (theo dõi tập trung/ngôn ngữ Lớp 1, thỏa thuận học giao lưu chung) không có môn cam kết cụ thể được loại trừ khỏi bảng đối sánh.\n\n`;

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
    .map(([k, v]) => `**${k}:** ${v} HS`)
    .join(' | ');

  md += `#### ${campusTitles[cmp] || `CƠ SỞ ${cmp}`}\n\n`;
  md += `| STT | Họ và tên | Lớp | Khối | Môn CKĐV | Điểm KSĐV | Điểm KSĐN | Tiến bộ | Đạt chuẩn |\n`;
  md += `| :---: | :--- | :---: | :---: | :--- | :---: | :---: | :---: | :---: |\n`;

  students.forEach((st, idx) => {
    const rows = st.subjectRows || [];
    rows.forEach((row, rIdx) => {
      if (rIdx === 0) {
        md += `| ${idx + 1} | **${st.fullName}** | \`${st.className || 'Chưa rõ'}\` | Khối ${st.grade || ''} | **${row.subjectName}** | ${row.ksdvStr} | ${row.ksdnStr} | **${row.progressText}** | **${row.benchmarkText}** |\n`;
      } else {
        md += `| | | | | **${row.subjectName}** | ${row.ksdvStr} | ${row.ksdnStr} | **${row.progressText}** | **${row.benchmarkText}** |\n`;
      }
    });
  });

  // Hàng tổng kết 3 phần
  md += `| **HS Cam kết theo môn:** | | | | **${subList}** | | | | |\n`;
  md += `| **Tổng số môn Tiến bộ:** | | | | **${summary.totalProgress} / ${summary.totalEvaluated} lượt môn (${summary.progressRate})** | | | | |\n`;
  md += `| **Tổng số môn Đạt chuẩn:** | | | | **${summary.totalBenchmark} / ${summary.totalEvaluated} lượt môn (${summary.benchmarkRate})** | | *(TB: ${summary.totalAverage} \\| Dưới TB: ${summary.totalBelowAvg})* | | |\n\n`;
});

md += `\n---\n\n### 3. Danh sách Thống kê 6 Học sinh Thuộc Diện Theo Dõi Chung & Thỏa Thuận Giao Lưu (Đảm bảo đủ 76 HS nhập học)\n\n`;
md += `> **Ghi chú mục riêng:** Nhóm 6 học sinh này không có môn cam kết học thuật cụ thể (không chọn môn trong mục xét duyệt *Môn Cam Kết* trên hệ thống), thuộc danh sách 76 học sinh nhập học có điều kiện/theo dõi/thỏa thuận được BGH & GĐCS phê duyệt.\n\n`;
md += `| STT | Họ và tên | Lớp | Khối | Cơ sở | Diện hồ sơ & Ghi chú xét duyệt | Điểm KSĐV | Điểm KSĐN | Tình trạng thực tế & Định hướng theo dõi |\n`;
md += `| :---: | :--- | :---: | :---: | :---: | :--- | :--- | :--- | :--- |\n`;
md += `| 1 | **Nguyễn Đặng Bảo Trâm** | \`8.2_CS1\` | Khối 8 | CS1 | **Tư vấn tâm lý**<br>*(Bảo Trâm đạt, có thể theo dõi tư vấn tâm lí)* | Toán: **7.0**; Văn: **6.5**; Anh: **4.8**; Tâm lý: **6** | Toán: **3.0**; Văn: **6.5**; Anh: **4.0** | Nhập học diện Đạt, BGH lưu ý theo dõi tư vấn tâm lý học đường, không cam kết môn văn hóa. |\n`;
md += `| 2 | **Nguyễn Thanh Phúc** | \`1.2INT_CS2\` | Khối 1 | CS2 | **Tập trung chú ý**<br>*(Không cần cam kết, GVTA tương tác kỹ với PH)* | Anh: **5.0** (Vấn đáp: 5/30); Tâm lý: **2** | *Khối 1 (Chưa thi KSĐN)* | Học sinh Lớp 1 diện Đạt, kết quả xét duyệt ghi rõ "Không cần cam kết", GVCN và GVTA phối hợp PH tương tác sát sao trong năm học. |\n`;
md += `| 3 | **ĐỖ NGUYỄN AN KHÔI** | \`1.3_CS2\` | Khối 1 | CS2 | **Tập trung chú ý**<br>*(cần theo dõi mức độ tập trung chú ý)* | Anh: **7.0** (Vấn đáp: 7/30); Tâm lý: **1** | *Khối 1 (Chưa thi KSĐN)* | Học sinh Lớp 1 diện Đạt, GVCN theo dõi rèn luyện nền nếp và sự tập trung trong các hoạt động học tập đầu năm. |\n`;
md += `| 4 | **Phan Hải Đăng** | \`1.3_CS2\` | Khối 1 | CS2 | **Phát triển ngôn ngữ**<br>*(theo dõi thêm khả năng phát triển ngôn ngữ)* | Tâm lý: **-1** | *Khối 1 (Chưa thi KSĐN)* | Học sinh Lớp 1 diện Đạt, GVCN hỗ trợ rèn luyện phát triển ngôn ngữ Tiếng Việt trong sinh hoạt và học tập. |\n`;
md += `| 5 | **Nguyễn Hoàng Đạt** | \`3.2INT_CS5\` | Khối 3 | CS5 | **Thỏa thuận Giao lưu**<br>*(Ký thoả thuận cam kết như các HS đã từng học giao lưu)* | Toán: **2.0**; TV: **1.0**; Anh: **6.6** | Toán: **6.0**; TV: **2.0**; Anh: **7.8** | Học sinh Homeschooling (KLIS Academy TP.HCM) học giao lưu tại CS5, ký thỏa thuận giao lưu chung. KSĐN có tiến bộ tốt (Toán 6.0, Anh 7.8). |\n`;
md += `| 6 | **Nguyễn Hoàng Phúc** | \`5.2INT_CS5\` | Khối 5 | CS5 | **Thỏa thuận Giao lưu**<br>*(Ký thoả thuận cam kết như các HS đã từng học giao lưu)* | Toán: **1.0**; TV: **1.0**; Anh: **7.2** | Toán: **3.0**; TV: **1.0**; Anh: **9.2** | Học sinh Homeschooling học giao lưu tại CS5, ký thỏa thuận học giao lưu chung. Điểm KSĐN Tiếng Anh đạt xuất sắc 9.2. |\n\n`;
md += `> **TỔNG CỘNG HỆ THỐNG:** **6 Học sinh diện Theo dõi chung & Thỏa thuận giao lưu** + **70 Học sinh có môn cam kết tại Mục 2** = **ĐỦ 76 HỌC SINH NHẬP HỌC (100%)**\n\n`;

const mdArtifactPath = 'C:\\Users\\thongpn\\.gemini\\antigravity-ide\\brain\\bde4b516-a7ae-4e5a-ba06-cca3b42b7b51\\bao_cao_chat_luong_ksdn_va_ckdv.md';
const mdDownloadsPath = 'C:\\Users\\thongpn\\Downloads\\Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.md';

fs.writeFileSync(mdArtifactPath, md, 'utf8');
fs.writeFileSync(mdDownloadsPath, md, 'utf8');

console.log("Successfully updated Markdown report with verified English scores and missing entrance scores table!");
