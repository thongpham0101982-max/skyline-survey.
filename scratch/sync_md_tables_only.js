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
| 1 | **Tiểu học** | Khối 2 - 5 | Điểm ≥ 7.0 | 878 | 2.624 | 2.335 | **89.0%** | 53 | 2.0% | 2.002 | 76.3% |
| 2 | **THCS** | Khối 6 - 9 | Điểm ≥ 5.0 | 673 | 2.095 | 1.785 | **85.2%** | 310 | 14.8% | 838 | 40.0% |
| 3 | **THPT** | Khối 10 - 12 | Điểm ≥ 5.0 | 148 | 508 | 334 | **65.7%** | 174 | 34.3% | 76 | 15.0% |
| **-** | **TOÀN TRƯỜNG** | **Khối 2 - 12** | **Theo bậc** | **1.699** | **5.227** | **4.454** | **85.2%** | **537** | **10.3%** | **2.916** | **55.8%** |

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

// Bổ sung chuyên đề 7 môn tự chọn THPT
md += `## CHUYÊN ĐỀ THPT: THỐNG KÊ CHI TIẾT 7 MÔN TỰ CHỌN KHỐI 12 THEO CƠ SỞ (NGOÀI TOÁN - VĂN - ANH)

> Khảo sát định hướng tốt nghiệp THPT theo tổ hợp môn tự chọn (Khoa học Tự nhiên & Khoa học Xã hội) tại CS1 (71 lượt bài thi).

| STT | Cơ sở | Môn học tự chọn | Khối lớp | Số HS khảo sát | Điểm dưới TB (< 5.0) | Tỷ lệ < 5.0 | Điểm Chuẩn (≥ 5.0) | Tỷ lệ Đạt chuẩn | Điểm 8 đến 10 (Giỏi) | Tỷ lệ Giỏi |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| 1 | CS1 | Vật lí | Khối 12 | 13 | 2 | 15.4% | **11** | **84.6%** | 2 | 15.4% |
| 2 | CS1 | Hóa học | Khối 12 | 11 | 4 | 36.4% | **7** | **63.6%** | 2 | 18.2% |
| 3 | CS1 | Sinh học | Khối 12 | 10 | 0 | 0.0% | **10** | **100.0%** | 3 | 30.0% |
| 4 | CS1 | Lịch sử | Khối 12 | 11 | 5 | 45.5% | **6** | **54.5%** | 0 | 0.0% |
| 5 | CS1 | Địa lí | Khối 12 | 11 | 0 | 0.0% | **11** | **100.0%** | 2 | 18.2% |
| 6 | CS1 | GD Kinh tế & Pháp luật | Khối 12 | 11 | 0 | 0.0% | **11** | **100.0%** | 3 | 27.3% |
| 7 | CS1 | Tin học / ICT | Khối 12 | 4 | 1 | 25.0% | **3** | **75.0%** | 0 | 0.0% |
| **-** | **CS1** | **TỔNG 7 MÔN TỰ CHỌN K12** | **Khối 12** | **71** | **12** | **16.9%** | **59** | **83.1%** | **12** | **16.9%** |

---

`;

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
| **Đủ điểm tất cả môn CKĐV** | **58** | **76.3%** | Đã có đầy đủ điểm KSĐV và được cập nhật chính xác (Toán, Văn, Anh scale 10 & tổng) |
| **Thiếu điểm môn cam kết** | **11** | **14.5%** | Gồm 5 HS nước ngoài/song ngữ bồi dưỡng TV; 4 HS chưa nhập Anh; 1 HS quốc tế EPT; 1 HS miễn Toán |
| **Hoàn toàn chưa có điểm KSĐV** | **3** | **3.9%** | Gồm 1 HS diện Tuyển thẳng (Lê Nguyên Khang); 1 HS Lớp 1 theo dõi ngôn ngữ; 1 HS chưa nhập bài thi |
| **Cam kết Tâm lý lứa tuổi** | **4** | **5.3%** | Học sinh diện theo dõi tâm lý lứa tuổi, không khảo sát văn hóa |
| **TỔNG CỘNG** | **76** | **100.0%** | **Đúng 76 học sinh CKĐV đã hoàn tất nhập học** |

---

### 3. Bảng Thống Kê Chi Tiết Học Sinh CKĐV Chưa Có Điểm KSĐV Hoặc Thiếu Môn Cam Kết (18 học sinh)

| STT | Cơ sở | Mã HS | Họ và tên | Lớp & Khối | Môn Cam Kết | Phân loại Tình trạng | Điểm KSĐV Hiện Có | Điểm KSĐN Thực Tế | Nguyên nhân & Căn cứ Tuyển sinh |
| :---: | :---: | :---: | :--- | :---: | :--- | :---: | :--- | :--- | :--- |
`;

const missingStudents = ckdvData.filter(s => s.ksdvStatus !== 'Đủ điểm');
missingStudents.forEach((st, idx) => {
  const ksdvP = [];
  if (st.ksdvMath != null) ksdvP.push(`Toán: ${st.ksdvMath}`);
  if (st.ksdvViet != null) ksdvP.push(`Tiếng Việt: ${st.ksdvViet}`);
  if (st.ksdvVan != null) ksdvP.push(`Ngữ Văn: ${st.ksdvVan}`);
  if (st.ksdvEngScale10 != null) ksdvP.push(`Anh: ${st.ksdvEngScale10.toFixed(1)} (Tổng: ${st.ksdvEngTotal})`);

  const ksdnP = [];
  if (st.ksdnMath != null) ksdnP.push(`Toán: ${st.ksdnMath}`);
  if (st.ksdnViet != null) ksdnP.push(`Tiếng Việt: ${st.ksdnViet}`);
  if (st.ksdnVan != null) ksdnP.push(`Ngữ Văn: ${st.ksdnVan}`);
  if (st.ksdnEng != null) ksdnP.push(`Anh: ${st.ksdnEng}`);

  const commText = Array.isArray(st.committedSubjects) ? st.committedSubjects.join(', ') : (st.committedSubjects || '');

  md += `| ${idx + 1} | ${st.campus} | ${st.studentCode || ''} | **${st.fullName}** | \`${st.className || 'Chưa rõ'}\` (K${st.grade || ''}) | ${commText} | **${st.ksdvStatus}** | ${ksdvP.length > 0 ? ksdvP.join('; ') : '—'} | ${ksdnP.length > 0 ? ksdnP.join('; ') : 'Chưa có bài KSĐN'} | ${st.missingReason || '—'} |\n`;
});

md += `\n---\n\n### 4. Danh sách Chi tiết Toàn bộ 76 Học sinh CKĐV Nhập học - Map Điểm KSĐV vs KSĐN theo Từng Cơ sở\n\n`;

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
    ksdvStr = 'HS Cam kết tâm lý';
    ksdnStr = '—';
    note = '**HS Cam kết tâm lý**';
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

    if (st.ksdvStatus === 'Chưa có điểm KSĐV') {
      ksdvStr = `Chưa có điểm KSĐV (${st.missingReason})`;
    } else {
      ksdvStr = ksdvParts.join('; ');
      if (st.missingCommitted && st.missingCommitted.length > 0) {
        ksdvStr += ` (${st.missingCommitted.join(', ')}: Chưa có điểm)`;
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
    } else {
      note = st.missingReason;
    }
  }

  ckdvByCampus[cmp].push({
    ...st,
    ksdvStr,
    ksdnStr,
    note
  });
});

const campusTitles = {
  'CS1': 'CƠ SỞ CS1 (36 học sinh)',
  'CS2': 'CƠ SỞ CS2 (8 học sinh)',
  'CS3': 'CƠ SỞ CS3 (8 học sinh)',
  'CS4': 'CƠ SỞ CS4 (12 học sinh)',
  'CS5': 'CƠ SỞ CS5 (12 học sinh)'
};

Object.keys(ckdvByCampus).sort().forEach(cmp => {
  const students = ckdvByCampus[cmp];
  md += `#### ${campusTitles[cmp] || `CƠ SỞ ${cmp}`}\n\n`;
  md += `| STT | Họ và tên | Lớp | Khối | Môn CKĐV | Điểm KSĐV Môn Cam Kết (Thang 10 & Cột Tổng điểm) | Điểm KSĐN Môn Tương Ứng | Ghi chú & Trạng thái |\n`;
  md += `| :---: | :--- | :---: | :---: | :--- | :--- | :--- | :--- |\n`;

  students.forEach((st, idx) => {
    const subjectsStr = Array.isArray(st.committedSubjects) ? st.committedSubjects.join(', ') : (st.committedSubjects || '');
    md += `| ${idx + 1} | **${st.fullName}** | \`${st.className || 'Chưa rõ'}\` | Khối ${st.grade || ''} | ${subjectsStr} | ${st.ksdvStr} | ${st.ksdnStr} | ${st.note} |\n`;
  });

  md += `\n`;
});

const mdArtifactPath = 'C:\\Users\\thongpn\\.gemini\\antigravity-ide\\brain\\bde4b516-a7ae-4e5a-ba06-cca3b42b7b51\\bao_cao_chat_luong_ksdn_va_ckdv.md';
const mdDownloadsPath = 'C:\\Users\\thongpn\\Downloads\\Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.md';

fs.writeFileSync(mdArtifactPath, md, 'utf8');
fs.writeFileSync(mdDownloadsPath, md, 'utf8');

console.log("Successfully updated Markdown report with verified English scores and missing entrance scores table!");
