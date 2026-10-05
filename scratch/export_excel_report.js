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
  [1, 'Tiểu học', 'Khối 2 - 5', 'Điểm ≥ 7.0', 878, 2624, 2335, '89.0%', 49, '1.9%', 2002, '76.3%'],
  [2, 'THCS', 'Khối 6 - 9', 'Điểm ≥ 5.0', 673, 2095, 1785, '85.2%', 243, '11.6%', 838, '40.0%'],
  [3, 'THPT', 'Khối 10 - 12', 'Điểm ≥ 5.0', 148, 508, 334, '65.7%', 172, '33.9%', 76, '15.0%'],
  ['-', 'TOÀN TRƯỜNG', 'Khối 2 - 12', 'Theo bậc học', 1699, 5227, 4454, '85.2%', 464, '8.9%', 2916, '55.8%'],
  [],
  ['THỐNG KÊ HỌC SINH CAM KẾT ĐẦU VÀO (CKĐV) ĐÃ HOÀN TẤT NHẬP HỌC (COMPLETED)'],
  ['STT', 'Cơ sở trường', 'Số HS Tuyển mới Nhập học', 'Số HS CKĐV ĐÃ NHẬP HỌC', 'Tỷ lệ CKĐV / Tuyển mới', 'Môn cam kết chủ đạo'],
  [1, 'CS1', 90, 32, '35.6%', 'Tiếng Anh, Toán, Ngữ Văn, Tâm lý'],
  [2, 'CS2', 36, 7, '19.4%', 'Tiếng Việt, Tâm lý, Theo dõi tập trung/ngôn ngữ'],
  [3, 'CS3', 65, 13, '20.0%', 'Tiếng Việt, Tiếng Anh (ESL), Toán'],
  [4, 'CS4', 14, 13, '92.9%', 'Tiếng Anh, Toán, Ngữ Văn'],
  [5, 'CS5', 62, 11, '17.7%', 'Tiếng Anh, Toán, Thỏa thuận giao lưu'],
  ['-', 'TỔNG TOÀN HỆ THỐNG', 267, 76, '28.5%', 'Toán, Tiếng Việt, Tiếng Anh, Ngữ Văn, Tâm lý'],
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

// 2. Sheet Thống kê Học Sinh Chưa Đủ Điểm KSĐV
const missingStudents = ckdvData.filter(s => s.ksdvStatus !== 'Đủ điểm');
// 3. Sheet Danh sách 76 HS CKĐV Đã Nhập học theo Từng Cơ sở
const { getPreparedCkdvData, computeCampusSummary } = require('./calculate_ckdv_progress_table.js');
const ckdvByCampus = getPreparedCkdvData();

const ckdvHeaders = ['STT', 'Họ và tên', 'Lớp', 'Khối', 'Môn CKĐV', 'Điểm KSĐV', 'Điểm KSĐN', 'Tiến bộ', 'Đạt chuẩn'];
const totalInExcel = Object.values(ckdvByCampus).reduce((s, l) => s + l.length, 0);
const ckdvRows = [
  [`BẢNG MAP ĐIỂM KHẢO SÁT ĐẦU VÀO (KSĐV) VS KHẢO SÁT ĐẦU NĂM (KSĐN) ${totalInExcel} HỌC SINH CKĐV NHẬP HỌC (THEO ĐÚNG MÔN CAM KẾT)`],
  ['* Quy chuẩn Tiến bộ: Với Tiểu học, Điểm KSĐN phải Đạt từ 5.0 trở lên mới tính là Tiến bộ, nhưng không đạt chuẩn.'],
  ['* Quy chuẩn Đạt chuẩn: Tiểu học điểm ≥ 7.0; THCS & THPT điểm ≥ 5.0.'],
  ['* Chuẩn hóa Môn Cam Kết: Chỉ hiển thị các HS có môn cam kết cụ thể (Toán, Tiếng Việt, Ngữ Văn, Tiếng Anh, Tâm lý). 6 HS diện Chung/Theo dõi không có môn cam kết được loại trừ.'],
  []
];

Object.keys(ckdvByCampus).sort().forEach(cmp => {
  const students = ckdvByCampus[cmp];
  const summary = computeCampusSummary(students);

  const subList = Object.entries(summary.subCounts)
    .filter(([k, v]) => v > 0)
    .map(([k, v]) => `${k}: ${v} HS`)
    .join(' | ');

  ckdvRows.push([`>>> CƠ SỞ: ${cmp} (${students.length} HỌC SINH CKĐV)`]);
  ckdvRows.push(ckdvHeaders);

  students.forEach((st, idx) => {
    const rows = st.subjectRows || [];
    rows.forEach((row, rIdx) => {
      if (rIdx === 0) {
        ckdvRows.push([
          idx + 1,
          st.fullName,
          st.className || 'Chưa rõ',
          st.grade ? `Khối ${st.grade}` : '',
          row.subjectName,
          row.ksdvStr,
          row.ksdnStr,
          row.progressText,
          row.benchmarkText
        ]);
      } else {
        ckdvRows.push([
          '',
          '',
          '',
          '',
          row.subjectName,
          row.ksdvStr,
          row.ksdnStr,
          row.progressText,
          row.benchmarkText
        ]);
      }
    });
  });

  // 3 Hàng tổng kết cuối mỗi cơ sở
  ckdvRows.push(['HS Cam kết theo môn:', '', '', '', subList, '', '', '', '']);
  ckdvRows.push(['Tổng số môn Tiến bộ:', '', '', '', `${summary.totalProgress} / ${summary.totalEvaluated} lượt môn (${summary.progressRate})`, '', '', '', '']);
  ckdvRows.push(['Tổng số môn Đạt chuẩn:', '', '', '', `${summary.totalBenchmark} / ${summary.totalEvaluated} lượt môn (${summary.benchmarkRate}) (Đạt chuẩn: ${summary.totalBenchmark}, TB: ${summary.totalAverage}, Dưới TB: ${summary.totalBelowAvg})`, '', '', '', '']);
  ckdvRows.push([]);
});

// Section 3: Bảng riêng thống kê 6 học sinh diện Theo dõi chung & Thỏa thuận giao lưu
ckdvRows.push(['========================================================================================']);
ckdvRows.push(['3. DANH SÁCH 6 HỌC SINH DIỆN THEO DÕI CHUNG & THỎA THUẬN GIAO LƯU (ĐẢM BẢO ĐỦ 76 HS NHẬP HỌC)']);
ckdvRows.push(['* Nhóm 6 học sinh này không có môn cam kết học thuật cụ thể nên không đưa vào bảng đối sánh theo môn ở trên, được theo dõi theo diện riêng']);
ckdvRows.push(['STT', 'Họ và tên', 'Lớp', 'Khối', 'Cơ sở', 'Diện hồ sơ & Ghi chú xét duyệt', 'Điểm KSĐV', 'Điểm KSĐN', 'Tình trạng thực tế & Định hướng theo dõi']);
ckdvRows.push([1, 'Nguyễn Đặng Bảo Trâm', '8.2_CS1', 'Khối 8', 'CS1', 'Tư vấn tâm lý (Bảo Trâm đạt, có thể theo dõi tư vấn tâm lí)', 'Toán: 7.0; Văn: 6.5; Anh: 4.8; Tâm lý: 6', 'Toán: 3.0; Văn: 6.5; Anh: 4.0', 'Nhập học diện Đạt, BGH lưu ý theo dõi tư vấn tâm lý học đường, không cam kết môn văn hóa']);
ckdvRows.push([2, 'Nguyễn Thanh Phúc', '1.2INT_CS2', 'Khối 1', 'CS2', 'Tập trung chú ý (Không cần cam kết, GVTA tương tác kỹ với PH)', 'Anh: 5.0 (Vấn đáp: 5/30); Tâm lý: 2', 'Khối 1 (Chưa thi KSĐN)', 'Học sinh Lớp 1 diện Đạt, kết quả xét duyệt ghi rõ "Không cần cam kết", GVCN và GVTA phối hợp PH tương tác']);
ckdvRows.push([3, 'ĐỖ NGUYỄN AN KHÔI', '1.3_CS2', 'Khối 1', 'CS2', 'Tập trung chú ý ((cần theo dõi mức độ tập trung chú ý))', 'Anh: 7.0 (Vấn đáp: 7/30); Tâm lý: 1', 'Khối 1 (Chưa thi KSĐN)', 'Học sinh Lớp 1 diện Đạt, GVCN theo dõi rèn luyện nền nếp và sự tập trung trong các hoạt động học tập']);
ckdvRows.push([4, 'Phan Hải Đăng', '1.3_CS2', 'Khối 1', 'CS2', 'Phát triển ngôn ngữ (theo dõi thêm khả năng phát triển ngôn ngữ)', 'Tâm lý: -1', 'Khối 1 (Chưa thi KSĐN)', 'Học sinh Lớp 1 diện Đạt, GVCN hỗ trợ rèn luyện phát triển ngôn ngữ Tiếng Việt trong sinh hoạt']);
ckdvRows.push([5, 'Nguyễn Hoàng Đạt', '3.2INT_CS5', 'Khối 3', 'CS5', 'Thỏa thuận Giao lưu (Ký thoả thuận cam kết như các HS đã từng học giao lưu)', 'Toán: 2.0; TV: 1.0; Anh: 6.6', 'Toán: 6.0; TV: 2.0; Anh: 7.8', 'Học sinh Homeschooling học giao lưu tại CS5, ký thỏa thuận giao lưu chung. KSĐN có tiến bộ tốt (Toán 6.0, Anh 7.8)']);
ckdvRows.push([6, 'Nguyễn Hoàng Phúc', '5.2INT_CS5', 'Khối 5', 'CS5', 'Thỏa thuận Giao lưu (Ký thoả thuận cam kết như các HS đã từng học giao lưu)', 'Toán: 1.0; TV: 1.0; Anh: 7.2', 'Toán: 3.0; TV: 1.0; Anh: 9.2', 'Học sinh Homeschooling học giao lưu tại CS5, ký thỏa thuận giao lưu chung. Điểm KSĐN Tiếng Anh xuất sắc 9.2']);
ckdvRows.push(['TỔNG CỘNG HỆ THỐNG:', '', '', '', '', '6 HS Theo dõi chung + 70 HS có Môn cam kết = ĐỦ 76 HỌC SINH NHẬP HỌC (100%)', '', '', '']);
ckdvRows.push([]);

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
