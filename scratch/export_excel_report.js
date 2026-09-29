const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// Load JSON data
const reportData = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_report_data.json'), 'utf8'));
const ckdvData = JSON.parse(fs.readFileSync(path.join(__dirname, 'exact_commitment_table.json'), 'utf8'));
const dataByLevel = reportData.dataByLevel;

const wb = XLSX.utils.book_new();

// 1. Sheet Tổng quan 3 Bậc học
const summaryRows = [
  ['BÁO CÁO TỔNG QUAN KỲ KHẢO SÁT ĐẦU NĂM (KSĐN) NĂM HỌC 2026 - 2027'],
  ['HỆ THỐNG GIÁO DỤC SKYLINE - CSDL THỰC TẾ HỆ THỐNG SSM'],
  ['Ngày trích xuất dữ liệu: 29/09/2026'],
  [],
  ['STT', 'Bậc học', 'Quy mô Khối', 'Chuẩn Đạt điểm', 'Tổng số HS', 'Tổng lượt bài thi', 'Số bài Đạt chuẩn', 'Tỷ lệ Đạt chuẩn', 'Số bài Dưới TB (< 5.0)', 'Tỷ lệ Dưới TB', 'Số bài Giỏi (8-10)', 'Tỷ lệ Giỏi'],
  [1, 'Tiểu học', 'Khối 2 - 5', 'Điểm ≥ 7.0', 878, 2624, 2335, '89.0%', 53, '2.0%', 2002, '76.3%'],
  [2, 'THCS', 'Khối 6 - 9', 'Điểm ≥ 5.0', 673, 2095, 1785, '85.2%', 310, '14.8%', 838, '40.0%'],
  [3, 'THPT', 'Khối 10 - 12', 'Điểm ≥ 5.0', 148, 508, 334, '65.7%', 174, '34.3%', 76, '15.0%'],
  ['-', 'TOÀN TRƯỜNG', 'Khối 2 - 12', 'Theo bậc học', 1699, 5227, 4454, '85.2%', 537, '10.3%', 2916, '55.8%'],
  [],
  ['THỐNG KÊ HỌC SINH CAM KẾT ĐẦU VÀO (CKĐV) ĐÃ HOÀN TẤT NHẬP HỌC (COMPLETED)'],
  ['STT', 'Cơ sở trường', 'Số HS Tuyển mới Nhập học', 'Số HS CKĐV ĐÃ NHẬP HỌC', 'Tỷ lệ CKĐV / Tuyển mới', 'Môn cam kết chủ đạo'],
  [1, 'CS1', 90, 36, '40.0%', 'Tiếng Anh, Toán, Ngữ Văn, Tâm lý'],
  [2, 'CS2', 36, 8, '22.2%', 'Tiếng Anh, Tiếng Việt, Tâm lý'],
  [3, 'CS3', 65, 8, '12.3%', 'Tiếng Việt, Tiếng Anh (ESL), Toán'],
  [4, 'CS4', 14, 12, '85.7%', 'Tiếng Anh, Toán, Ngữ Văn'],
  [5, 'CS5', 62, 12, '19.4%', 'Tiếng Anh, Toán'],
  ['-', 'TỔNG TOÀN HỆ THỐNG', 292, 76, '26.0%', 'Toán, Tiếng Việt, Tiếng Anh, Ngữ Văn, Tâm lý'],
  [],
  ['TỔNG HỢP TÌNH TRẠNG ĐIỂM KSĐV CỦA 76 HỌC SINH CKĐV NHẬP HỌC'],
  ['Phân loại', 'Số lượng HS', 'Tỷ lệ %', 'Mô tả chi tiết'],
  ['Đủ điểm tất cả môn CKĐV', 58, '76.3%', 'Có đầy đủ điểm KSĐV các môn cam kết và đã được cập nhật chính xác'],
  ['Thiếu điểm môn cam kết', 11, '14.5%', 'Có điểm KSĐV nhưng thiếu môn cam kết (HS nước ngoài/song ngữ, chưa nhập Anh...)'],
  ['Hoàn toàn chưa có điểm KSĐV', 3, '3.9%', 'Gồm: Tuyển thẳng (1 HS), Lớp 1 theo dõi ngôn ngữ (1 HS), Chưa cập nhật bài thi (1 HS)'],
  ['Cam kết Tâm lý', 4, '5.3%', 'Chỉ theo dõi tâm lý lứa tuổi, không khảo sát văn hóa']
];
const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
XLSX.utils.book_append_sheet(wb, wsSummary, 'Tong_Quan');

// Helper for sorting subjects
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

function pct(num, den) {
  if (!den || den === 0) return '0.0%';
  return ((num / den) * 100).toFixed(1) + '%';
}

// Function to generate sheet for each level separated by Campus
function createLevelSheet(lvlName, benchDesc, sheetName) {
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

  const rows = [
    [`THỐNG KÊ CHI TIẾT BẬC ${lvlName.toUpperCase()} THEO TỪNG CƠ SỞ`],
    [`* Chuẩn đạt điểm: ${benchDesc}`],
    []
  ];

  let grandTotal = 0, grandBelow = 0, grandBench = 0, grandGood = 0;

  const sortedCampuses = Object.keys(campusMap).sort();
  sortedCampuses.forEach(cmp => {
    rows.push([`>>> CƠ SỞ: ${cmp} - BẬC ${lvlName.toUpperCase()}`]);
    rows.push(['STT', 'Môn học', 'Khối lớp', 'Số HS khảo sát', 'Điểm dưới TB (< 5.0)', 'Tỷ lệ < 5.0', `Điểm Chuẩn (${benchDesc})`, 'Tỷ lệ Đạt chuẩn', 'Điểm 8 đến 10 (Giỏi)', 'Tỷ lệ Giỏi']);

    const cRows = sortRows(campusMap[cmp]);
    const cmpTotal = cRows.reduce((s, r) => s + r.total, 0);
    const cmpBelow = cRows.reduce((s, r) => s + r.belowAvg, 0);
    const cmpBench = cRows.reduce((s, r) => s + r.atBenchmark, 0);
    const cmpGood = cRows.reduce((s, r) => s + r.good, 0);

    grandTotal += cmpTotal;
    grandBelow += cmpBelow;
    grandBench += cmpBench;
    grandGood += cmpGood;

    cRows.forEach((r, idx) => {
      rows.push([
        idx + 1,
        r.subject,
        r.grade,
        r.total,
        r.belowAvg,
        pct(r.belowAvg, r.total),
        r.atBenchmark,
        pct(r.atBenchmark, r.total),
        r.good,
        pct(r.good, r.total)
      ]);
    });

    // Subtotal row
    rows.push([
      '-',
      `TỔNG CƠ SỞ ${cmp}`,
      'Các khối',
      cmpTotal,
      cmpBelow,
      pct(cmpBelow, cmpTotal),
      cmpBench,
      pct(cmpBench, cmpTotal),
      cmpGood,
      pct(cmpGood, cmpTotal)
    ]);
    rows.push([]);
  });

  // Grand total row for the level
  rows.push([
    '★',
    `TỔNG TOÀN BẬC ${lvlName.toUpperCase()} (TẤT CẢ CƠ SỞ)`,
    'Khối thuộc bậc',
    grandTotal,
    grandBelow,
    pct(grandBelow, grandTotal),
    grandBench,
    pct(grandBench, grandTotal),
    grandGood,
    pct(grandGood, grandTotal)
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
}

createLevelSheet('Tiểu học', '≥ 7.0', 'Tieu_Hoc_Theo_CS');
createLevelSheet('THCS', '≥ 5.0', 'THCS_Theo_CS');
createLevelSheet('THPT', '≥ 5.0', 'THPT_Theo_CS');

// 2. Sheet 7 Môn Tự Chọn THPT Khối 12
const thptElectivesRows = [
  ['THỐNG KÊ CHI TIẾT 7 MÔN TỰ CHỌN KHỐI 12 THEO CƠ SỞ (NGOÀI TOÁN - VĂN - ANH)'],
  ['* Áp dụng cho học sinh Khối 12 làm bài khảo sát định hướng tốt nghiệp THPT theo tổ hợp môn'],
  [],
  ['STT', 'Cơ sở', 'Môn học tự chọn', 'Khối lớp', 'Số HS khảo sát', 'Điểm dưới TB (< 5.0)', 'Tỷ lệ < 5.0', 'Điểm Chuẩn (≥ 5.0)', 'Tỷ lệ Đạt chuẩn', 'Điểm 8 đến 10 (Giỏi)', 'Tỷ lệ Giỏi'],
  [1, 'CS1', 'Vật lí', 'Khối 12', 13, 2, '15.4%', 11, '84.6%', 2, '15.4%'],
  [2, 'CS1', 'Hóa học', 'Khối 12', 11, 4, '36.4%', 7, '63.6%', 2, '18.2%'],
  [3, 'CS1', 'Sinh học', 'Khối 12', 10, 0, '0.0%', 10, '100.0%', 3, '30.0%'],
  [4, 'CS1', 'Lịch sử', 'Khối 12', 11, 5, '45.5%', 6, '54.5%', 0, '0.0%'],
  [5, 'CS1', 'Địa lí', 'Khối 12', 11, 0, '0.0%', 11, '100.0%', 2, '18.2%'],
  [6, 'CS1', 'GD Kinh tế & Pháp luật', 'Khối 12', 11, 0, '0.0%', 11, '100.0%', 3, '27.3%'],
  [7, 'CS1', 'Tin học / ICT', 'Khối 12', 4, 1, '25.0%', 3, '75.0%', 0, '0.0%'],
  ['-', 'CS1', 'TỔNG 7 MÔN TỰ CHỌN K12', 'Khối 12', 71, 12, '16.9%', 59, '83.1%', 12, '16.9%']
];
const wsElectives = XLSX.utils.aoa_to_sheet(thptElectivesRows);
XLSX.utils.book_append_sheet(wb, wsElectives, 'THPT_7_Mon_Tu_Chon_K12');

// 3. Sheet MỚI: Thống kê Học Sinh Chưa Đủ Điểm KSĐV
const missingStudents = ckdvData.filter(s => s.ksdvStatus !== 'Đủ điểm');
const missingRows = [
  ['BẢNG THỐNG KÊ CHI TIẾT HỌC SINH CKĐV CHƯA CÓ ĐIỂM KSĐV HOẶC THIẾU MÔN CAM KẾT'],
  ['* Tổng số: 18 học sinh (gồm 3 HS chưa có điểm, 11 HS thiếu môn CK, 4 HS cam kết tâm lý)'],
  [],
  ['STT', 'Cơ sở', 'Mã HS', 'Họ và tên', 'Lớp', 'Khối', 'Môn Cam Kết', 'Phân loại Tình trạng', 'Điểm KSĐV Hiện Có', 'Điểm KSĐN Thực Tế', 'Nguyên nhân & Căn cứ Tuyển sinh']
];

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

  missingRows.push([
    idx + 1,
    st.campus || 'CS1',
    st.studentCode || '',
    st.fullName,
    st.className || 'Chưa rõ',
    st.grade ? `Khối ${st.grade}` : '',
    Array.isArray(st.committedSubjects) ? st.committedSubjects.join(', ') : (st.committedSubjects || ''),
    st.ksdvStatus,
    ksdvP.length > 0 ? ksdvP.join('; ') : '—',
    ksdnP.length > 0 ? ksdnP.join('; ') : 'Chưa có bài KSĐN',
    st.missingReason || ''
  ]);
});

const wsMissing = XLSX.utils.aoa_to_sheet(missingRows);
XLSX.utils.book_append_sheet(wb, wsMissing, 'HS_Chua_Du_Diem_KSDV');

// 4. Sheet Danh sách Toàn bộ 76 HS CKĐV Đã Nhập học
const ckdvHeaders = ['STT', 'Cơ sở', 'Mã HS', 'Họ và tên', 'Lớp', 'Khối', 'Môn CKĐV', 'Tình trạng KSĐV', 'Điểm KSĐV Môn Cam Kết (Thang 10 & Cột Tổng điểm)', 'Điểm KSĐN Môn Tương Ứng', 'Ghi chú & Trạng thái'];
const ckdvRows = [
  ['DANH SÁCH 76 HỌC SINH CAM KẾT ĐẦU VÀO (CKĐV) ĐÃ NHẬP HỌC - MAP ĐIỂM KHẢO SÁT ĐẦU NĂM'],
  ['* Điểm Tiếng Anh KSĐV: Lấy từ Cột Tổng điểm (Thang 100) và quy đổi chuẩn xác về Thang 10 (Scale 10 = Tổng điểm / 10)'],
  ['* HS diện Tâm lý: Ghi chú rõ "HS Cam kết tâm lý", không hiển thị điểm thi bộ môn'],
  [],
  ckdvHeaders
];

const campusOrder = { 'CS1': 1, 'CS2': 2, 'CS3': 3, 'CS4': 4, 'CS5': 5 };
ckdvData.sort((a, b) => (campusOrder[a.campus] || 9) - (campusOrder[b.campus] || 9));

ckdvData.forEach((st, idx) => {
  let note = '';
  let ksdvStr = '';
  let ksdnStr = '';

  if (st.isPsychology) {
    ksdvStr = 'HS Cam kết tâm lý';
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
        else if (st.ksdnEng < 5.0 && st.grade >= 6) note = `Dưới TB môn Anh (${st.ksdnEng}), cần phụ đạo`;
        else if (st.ksdnEng < 7.0 && st.grade <= 5) note = `Chưa đạt chuẩn Tiểu học (${st.ksdnEng})`;
        else note = `Đạt chuẩn môn Anh (${st.ksdnEng})`;
      } else if (st.ksdnMath != null && st.ksdvMath != null) {
        const diff = +(st.ksdnMath - st.ksdvMath).toFixed(1);
        if (diff >= 2.0) note = `Tiến bộ tốt môn Toán (+${diff})`;
        else if (st.ksdnMath < 5.0 && st.grade >= 6) note = `Dưới TB môn Toán (${st.ksdnMath}), cần kèm gấp`;
        else note = `Đạt chuẩn môn Toán (${st.ksdnMath})`;
      } else if (st.missingReason) {
        note = st.missingReason;
      }
    } else {
      note = st.missingReason;
    }
  }

  ckdvRows.push([
    idx + 1,
    st.campus || 'CS1',
    st.studentCode || '',
    st.fullName,
    st.className || 'Chưa rõ',
    st.grade ? `Khối ${st.grade}` : '',
    Array.isArray(st.committedSubjects) ? st.committedSubjects.join(', ') : (st.committedSubjects || ''),
    st.ksdvStatus || 'Đủ điểm',
    ksdvStr,
    ksdnStr,
    note
  ]);
});

const wsCKDV = XLSX.utils.aoa_to_sheet(ckdvRows);
XLSX.utils.book_append_sheet(wb, wsCKDV, '76_HS_CKDV');

// Save Excel files
const outPathWorkspace = path.join(__dirname, '..', 'Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.xlsx');
const outPathDownloads = 'C:\\Users\\thongpn\\Downloads\\Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.xlsx';
const outPathDesktop = 'C:\\Users\\thongpn\\Desktop\\Bao_Cao_Khao_Sat_Dau_Nam_va_76_HS_CKDV_2026.xlsx';

XLSX.writeFile(wb, outPathWorkspace);
XLSX.writeFile(wb, outPathDownloads);
XLSX.writeFile(wb, outPathDesktop);

console.log("Successfully generated comprehensive Excel report with verified English scores and missing entrance scores sheet!");
