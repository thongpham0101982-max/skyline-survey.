const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const wb = XLSX.utils.book_new();

// Sheet 1: 7 Trụ cột cốt lõi
const sheet1Data = [
  ["STT", "TRỤ CỘT NỘI DUNG", "MÔ TẢ CHI TIẾT", "Ý NGHĨA SƯ PHẠM & GIÁ TRỊ TRUYỀN THÔNG"],
  ["1", "Thông tin Hành chính & Nhận diện", "Họ tên, mã học sinh (studentCode), ngày sinh, giới tính, lớp học, cơ sở (Campus), năm học và ảnh thẻ số hóa.", "Xác lập mã định danh duy nhất, cá nhân hóa hồ sơ học sinh và đảm bảo tính thống nhất dữ liệu."],
  ["2", "Cố vấn Học tập & Quản trị Mục tiêu", "Lời cam kết rèn luyện đầu năm, mục tiêu SMART, cảnh báo rèn luyện 3 màu (Xanh/Vàng/Đỏ SOS), nhật ký tham vấn 1-1.", "Giúp học sinh tự lập cam kết, hình thành thói quen tự quản trị bản thân; phát hiện sớm khó khăn để can thiệp kịp thời."],
  ["3", "Đánh giá Năng lực Chuyên sâu (Radar)", "Thang 4 bậc chuẩn hóa (Xuất sắc, Tốt, Đạt, Cần rèn luyện), mốc chuẩn khối 75%, biểu đồ Vector Radar đa giác, tự động tìm Top Strength & Growth Area.", "Đo lường năng lực thực chất thế kỷ 21, giúp cha mẹ thấu hiểu thế mạnh thực sự của con để đầu tư trọng điểm."],
  ["4", "Kết quả Học thuật MOET & Khảo sát Đầu vào", "Điểm số các môn cốt lõi (Toán, Văn, Anh viết, Anh nói), nhận xét của GVBM, đánh giá định tính Tiểu học TT27 và điểm khảo sát đầu vào.", "Minh bạch kết quả học thuật theo chuẩn Bộ GD&ĐT; theo dõi sự tiến bộ vượt bậc so với xuất phát điểm đầu vào."],
  ["5", "Bảng Vàng Thành tích & Khen thưởng", "Giải thưởng các lĩnh vực Olympic, KHKT, STEM, Thể thao, Nghệ thuật phân cấp từ Trường, Quận, Tỉnh/TP, Quốc gia, Quốc tế.", "Vinh danh đa trí thông minh, khích lệ sự tự tin và tạo minh chứng học thuật đắt giá cho hồ sơ du học."],
  ["6", "Dấu ấn Trải nghiệm & Dự án Thực tế", "4 mạch GDPT 2018 (Bản thân, Xã hội, Tự nhiên, Hướng nghiệp), vai trò tham gia, mức đánh giá và các đề tài dự án liên môn.", "Khắc họa chân dung công dân toàn cầu năng động, giàu lòng nhân ái, có kỹ năng lãnh đạo và tinh thần phụng sự."],
  ["7", "Định hướng Nghề nghiệp & Xác thực 3 Bên", "Khảo sát nghề nghiệp, kế hoạch tài chính cá nhân, lời nhận xét tổng kết từ GVCN và khung ký duyệt 3 bên (Học sinh - GVCN - BGH).", "Định hướng tương lai khoa học; xác lập giá trị pháp lý học bạ chính thức với cam kết đồng hành chặt chẽ 3 bên."]
];
const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
ws1['!cols'] = [{ wch: 6 }, { wch: 35 }, { wch: 55 }, { wch: 60 }];
XLSX.utils.book_append_sheet(wb, ws1, "7_Tru_Cot_Cot_Loi");

// Sheet 2: Lộ trình Chuẩn đầu ra Tiếng Anh & ICT Quốc tế
const sheetLộTrìnhData = [
  ["BẬC HỌC", "KHỐI LỚP", "CHUẨN ĐẦU RA TIẾNG ANH", "QUY ĐỔI CEFR / IELTS", "CHUẨN ĐẦU RA TIN HỌC / ICT", "CHỨNG CHỈ QUỐC TẾ MỤC TIÊU"],
  ["Tiểu học", "Khối 1 - 2", "Tiếng Anh Giao tiếp Khởi động", "Pre-A1 Starters", "Làm quen Thiết bị & Chuột máy tính", "Nhập môn Kỹ năng số"],
  ["Tiểu học", "Khối 3", "Cambridge Starters", "Pre-A1 (10 - 15 Khiên)", "IC3 Spark - Computing Fundamentals", "Chứng chỉ IC3 Spark Quốc tế (Phần 1)"],
  ["Tiểu học", "Khối 4", "Cambridge Movers", "A1 (Movers 12 - 15 Khiên)", "IC3 Spark - Key Applications", "Chứng chỉ IC3 Spark Quốc tế (Phần 2)"],
  ["Tiểu học", "Khối 5 (Tốt nghiệp TH)", "Cambridge Flyers", "A2 (Flyers ~ IELTS 4.0)", "IC3 Spark - Living Online (Tốt nghiệp)", "Chứng chỉ Trọn bộ IC3 Spark Quốc tế"],
  ["THCS", "Khối 6 - 7", "Cambridge KET (Key English Test)", "A2 CEFR (~ IELTS 4.5)", "IC3 GS6 Level 1 (Khám phá Kỹ thuật số)", "Chứng chỉ IC3 GS6 Level 1"],
  ["THCS", "Khối 8", "Cambridge PET B1 Chuẩn bị", "B1 CEFR (~ IELTS 5.0)", "IC3 GS6 Level 2 (Vận dụng Kỹ thuật số)", "Chứng chỉ IC3 GS6 Level 2"],
  ["THCS", "Khối 9 (Tốt nghiệp THCS)", "Cambridge PET / Pre-IELTS", "B1 CEFR (~ IELTS 5.5)", "IC3 GS6 Level 3 & Tư duy Lập trình", "Chứng chỉ Trọn bộ IC3 GS6 Quốc tế"],
  ["THPT", "Khối 10", "IELTS Academic Foundation", "IELTS 5.5 - 6.0", "MOS Word (Microsoft Office Specialist)", "Chứng chỉ Quốc tế MOS Word Specialist"],
  ["THPT", "Khối 11", "IELTS Academic Advanced", "IELTS 6.5 - 7.0+", "MOS Excel & PowerPoint", "Chứng chỉ Quốc tế MOS Excel & PPT"],
  ["THPT", "Khối 12 (Tốt nghiệp THPT)", "IELTS Academic 6.5 - 8.0+ / SAT", "B2 - C1 CEFR (Tuyển thẳng Đại học)", "MOS Master / Ứng dụng AI & Robotics", "Trọn bộ MOS Master & Miễn thi Tốt nghiệp"]
];
const wsLoTrinh = XLSX.utils.aoa_to_sheet(sheetLộTrìnhData);
wsLoTrinh['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 32 }, { wch: 28 }, { wch: 38 }, { wch: 38 }];
XLSX.utils.book_append_sheet(wb, wsLoTrinh, "Chuan_Dau_Ra_TiengAnh_ICT");

// Sheet 3: Quy trình Theo dõi Tâm lý & Hỗ trợ học tập Suốt K-12
const sheetTamLyData = [
  ["GIAI ĐOẠN / CẤP HỌC", "KHẢO SÁT ĐẦU VÀO & XẾP LỚP", "THEO DÕI & BỒI DƯỠNG TÂM LÝ (K-12)", "HỖ TRỢ HỌC TẬP & PHỤ ĐẠO VĂN HÓA", "HỒ SƠ LIÊN THÔNG CHUYỂN GIAO"],
  ["1. Giai đoạn Nhập học (Mầm non / Lớp 1 / Chuyển trường)", "Đánh giá chỉ số phát triển 5 lĩnh vực, khảo sát Toán tư duy, Tiếng Việt, Phỏng vấn Tiếng Anh 1-1 với GVNN.", "Khảo sát sàng lọc tâm lý ban đầu, theo dõi khả năng thích nghi môi trường mới, chống lo âu chia tách.", "Kiểm tra lỗ hổng kiến thức để phân lớp học thuật và lộ trình phụ đạo ban đầu.", "Mở Hồ sơ Học sinh 360° số hóa, cấp mã định danh studentCode duy nhất."],
  ["2. Bậc Tiểu học (Lớp 1 đến Lớp 5)", "Khảo sát năng lực đầu mỗi năm học và phân luồng Tiếng Anh Cambridge.", "Rèn luyện nề nếp kỷ luật, kỹ năng tự phục vụ, quản trị cảm xúc, can thiệp sớm hành vi hiếu động/nhút nhát.", "Kèm 1-1 học sinh chậm đọc viết/Toán; bồi dưỡng đội tuyển Toán Tuổi thơ, Olympic Tiếng Anh.", "Bàn giao hồ sơ tâm lý và học tập bảo mật lên cấp THCS."],
  ["3. Bậc THCS (Lớp 6 đến Lớp 9)", "Khảo sát phân ban và trình độ Tiếng Anh đầu cấp 2.", "Đồng hành khủng hoảng tuổi dậy thì, tư vấn gắn kết bạn bè, phòng chống bạo lực học đường, giảm áp lực thi cử.", "Phụ đạo các môn KHTN, Ngữ văn, Toán; bồi dưỡng đội tuyển KHKT, STEM Robotics, Olympic Thành phố.", "Bàn giao hồ sơ năng lực tích lũy và định hướng nghề nghiệp lên cấp THPT."],
  ["4. Bậc THPT (Lớp 10 đến Lớp 12 Tốt nghiệp)", "Khảo sát định hướng tổ hợp môn chuyên sâu và mục tiêu chứng chỉ Quốc tế (IELTS/SAT).", "Tham vấn 1-1 giải tỏa căng thẳng thi cử, tư vấn tâm lý hướng nghiệp, kỹ năng độc lập đại học.", "Chiến dịch ôn thi Tốt nghiệp THPT, phụ đạo chuyên sâu môn thi đại học, huấn luyện săn học bổng du học.", "Đóng dấu xuất bản Học bạ 360° Toàn diện & CV Năng lực Quốc tế."]
];
const wsTamLy = XLSX.utils.aoa_to_sheet(sheetTamLyData);
wsTamLy['!cols'] = [{ wch: 25 }, { wch: 35 }, { wch: 40 }, { wch: 40 }, { wch: 35 }];
XLSX.utils.book_append_sheet(wb, wsTamLy, "TamLy_Va_HoTroHocTap_K12");

// Sheet 4: Chi tiết 28 Trường Dữ Liệu
const sheet2Data = [
  ["STT", "MÃ TRƯỜNG DỮ LIỆU", "TÊN TRƯỜNG DỮ LIỆU", "NHÓM NỘI DUNG", "KIỂU DỮ LIỆU", "Ý NGHĨA TRONG HỒ SƠ"],
  ["1", "studentCode", "Mã học sinh", "Hành chính", "String (Unique)", "Mã định danh duy nhất xuyên suốt từ Mầm non đến Lớp 12"],
  ["2", "studentName", "Họ và tên học sinh", "Hành chính", "String", "Tên đầy đủ của học sinh theo khai sinh"],
  ["3", "dateOfBirth", "Ngày tháng năm sinh", "Hành chính", "Date (DD/MM/YYYY)", "Ngày sinh học sinh"],
  ["4", "gender", "Giới tính", "Hành chính", "String (Nam/Nữ)", "Giới tính học sinh"],
  ["5", "className", "Lớp học", "Hành chính", "String", "Tên lớp học chính thức"],
  ["6", "campusName", "Cơ sở đào tạo", "Hành chính", "String", "Cơ sở trường học Sky-Line"],
  ["7", "academicYear", "Năm học", "Hành chính", "String", "Niên khóa áp dụng"],
  ["8", "homeroomTeacher", "Giáo viên Chủ nhiệm", "Hành chính", "String", "Thầy/Cô chủ nhiệm chịu trách nhiệm lớp"],
  ["9", "photoStatus", "Ảnh đại diện thẻ", "Hành chính", "Image / URL", "Ảnh chân dung tác phong học sinh"],
  ["10", "entranceSurveyMath", "Điểm Toán đầu vào", "Tuyển sinh", "Decimal", "Khảo sát tư duy Toán lúc nhập học"],
  ["11", "entranceSurveyEngWritten", "Điểm Tiếng Anh viết đầu vào", "Tuyển sinh", "Decimal", "Khảo sát ngữ pháp/viết Tiếng Anh nhập học"],
  ["12", "entranceSurveyEngOral", "Điểm Tiếng Anh vấn đáp đầu vào", "Tuyển sinh", "Decimal", "Phỏng vấn 1-1 với GVNN lúc nhập học"],
  ["13", "entranceDirectorNote", "Cam kết / Ý kiến BGH đầu vào", "Tuyển sinh", "Text", "Chỉ đạo phân lớp và cam kết chất lượng đầu vào"],
  ["14", "learningCommitment", "Lời cam kết học tập", "Cố vấn", "Text", "Cam kết nề nếp và mục tiêu tự học"],
  ["15", "advisoryStatus", "Chỉ số cảnh báo rèn luyện", "Cố vấn", "Status (GREEN/YELLOW/RED)", "Trạng thái tâm lý và rèn luyện học đường"],
  ["16", "psychologicalSupportHistory", "Lịch sử tham vấn tâm lý 1-1", "Tâm lý học đường", "Text / Logs", "Hồ sơ chăm sóc sức khỏe tinh thần từ Lớp 1-12"],
  ["17", "academicSupportTarget", "Diện phụ đạo / Bồi dưỡng", "Hỗ trợ học tập", "String & Mentor", "Kế hoạch kèm cặp văn hóa 1-1 hoặc đội tuyển"],
  ["18", "englishOutputBenchmark", "Chuẩn Tiếng Anh Quốc tế đạt được", "Chuẩn Quốc Tế", "Cert & Score (IELTS/Cambridge)", "Kết quả thi chứng chỉ Cambridge / IELTS"],
  ["19", "ictOutputBenchmark", "Chuẩn Tin học Quốc tế đạt được", "Chuẩn Quốc Tế", "Cert (IC3 / MOS)", "Kết quả thi chứng chỉ IC3 Spark / IC3 GS6 / MOS"],
  ["20", "competencyOverallScore", "Điểm năng lực tổng quan", "Năng lực 360", "Percentage (%)", "Tỷ lệ % hoàn thành chuẩn năng lực"],
  ["21", "competencyRank", "Xếp loại năng lực", "Năng lực 360", "String", "Xuất sắc / Tốt / Đạt / Cần rèn luyện"],
  ["22", "topStrength", "Năng lực mạnh nhất", "Năng lực 360", "String & %", "Thế mạnh vượt trội của học sinh"],
  ["23", "growthArea", "Vùng cần rèn luyện", "Năng lực 360", "String & %", "Kỹ năng cần xây dựng kế hoạch bổ trợ"],
  ["24", "mathScore", "Điểm Toán MOET", "Học thuật MOET", "Decimal / Qualitative", "Điểm TB hoặc mức hoàn thành môn Toán"],
  ["25", "literatureScore", "Điểm Ngữ văn MOET", "Học thuật MOET", "Decimal / Qualitative", "Điểm TB hoặc mức hoàn thành môn Văn"],
  ["26", "achievementsSummary", "Tổng hợp thành tích giải thưởng", "Khen thưởng", "Text", "Danh hiệu, huy chương đạt được các cấp"],
  ["27", "experientialSummary", "Hoạt động trải nghiệm 4 mạch", "Trải nghiệm", "Text", "Vai trò, mức đánh giá 4 mạch GDPT 2018"],
  ["28", "homeroomTeacherComment", "Nhận xét tổng kết của GVCN", "Đánh giá GVCN", "Text", "Lời nhận xét chính thức trên học bạ A4"]
];
const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
ws2['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 32 }, { wch: 20 }, { wch: 25 }, { wch: 55 }];
XLSX.utils.book_append_sheet(wb, ws2, "Chi_Tiet_28_Truong_Du_Lieu");

// Sheet 5: Mẫu danh sách học sinh đầy đủ chuẩn đầu ra
const sheet4Data = [
  ["MÃ HỌC SINH", "HỌ VÀ TÊN", "LỚP", "CƠ SỞ", "NGÀY SINH", "ĐIỂM KS ĐẦU VÀO", "TÌNH TRẠNG TÂM LÝ (K-12)", "HỖ TRỢ HỌC TẬP", "CHUẨN TIẾNG ANH", "CHUẨN TIN HỌC ICT", "ĐIỂM NĂNG LỰC (%)", "XẾP LOẠI NL", "TOP STRENGTH", "THÀNH TÍCH NỔI BẬT"],
  ["SKL-2025-089", "Nguyễn Minh Anh", "10.1", "Riverside", "15/04/2010", "Toán 9.0 | Anh 9.5 (Trúng tuyển)", "Ổn định (GREEN) - Tự tin", "Bồi dưỡng Olympic Toán", "IELTS 7.0 (Mục tiêu 8.0)", "MOS Word & Excel Specialist", "88%", "TỐT", "Tư duy Logic & Vấn đề", "HCV Olympic Toán Quốc tế SEAMO"],
  ["SKL-2025-090", "Trần Quốc Bảo", "10.1", "Riverside", "22/08/2010", "Toán 8.5 | Anh 8.0 (Trúng tuyển)", "Ổn định (GREEN)", "Bồi dưỡng Sáng tạo KHKT", "IELTS 6.5", "MOS PowerPoint Specialist", "85%", "TỐT", "Sáng tạo & Đổi mới", "Giải Nhì STEM Cấp Thành phố"],
  ["SKL-2025-091", "Lê Thùy Dương", "10.1", "Riverside", "11/12/2010", "Toán 9.5 | Anh 9.8 (Trúng tuyển)", "Ổn định (GREEN)", "Đội tuyển Hùng biện Quốc tế", "IELTS 8.0 (Xuất sắc)", "MOS Master & IC3 GS6", "94%", "XUẤT SẮC", "Năng lực Ngôn ngữ & Giao tiếp", "Giải Nhất Hùng biện Tiếng Anh"],
  ["SKL-2025-092", "Phạm Hoàng Nam", "10.1", "Riverside", "05/03/2010", "Toán 7.0 | Anh 6.5 (Trúng tuyển)", "Cần lưu ý (YELLOW) - Áp lực thi", "Phụ đạo Văn hóa 1-1 môn Toán", "Cambridge PET B1 (IELTS 5.5)", "IC3 GS6 Level 2", "76%", "ĐẠT", "Làm việc Nhóm & Thể thao", "Huy chương Bạc Bơi lội Cấp Tỉnh"],
  ["SKL-2025-093", "Vũ Gia Hưng", "10.1", "Riverside", "19/09/2010", "Toán 8.8 | Anh 8.5 (Trúng tuyển)", "Ổn định (GREEN)", "Bồi dưỡng Robotics AI", "IELTS 6.5", "MOS Word Specialist", "87%", "TỐT", "Tư duy Khoa học & Công nghệ", "Dự án KHKT Cấp Trường"]
];
const ws4 = XLSX.utils.aoa_to_sheet(sheet4Data);
ws4['!cols'] = [{ wch: 15 }, { wch: 22 }, { wch: 8 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 28 }, { wch: 28 }, { wch: 18 }, { wch: 15 }, { wch: 28 }, { wch: 35 }];
XLSX.utils.book_append_sheet(wb, ws4, "Danh_Sach_Mau_Chuan_Dau_Ra");

const outDocPath = path.join(__dirname, '../docs/BAO_CAO_HO_SO_HOC_SINH_SKYLINE.xlsx');
const outPublicPath = path.join(__dirname, '../public/BAO_CAO_HO_SO_HOC_SINH_SKYLINE.xlsx');
const outArtifactPath = "C:\\Users\\Windows 11\\.gemini\\antigravity\\brain\\06e67f3a-f756-462f-80aa-52ffa7f02463\\BAO_CAO_HO_SO_HOC_SINH_SKYLINE.xlsx";

XLSX.writeFile(wb, outDocPath);
console.log('Saved to:', outDocPath);

try {
  XLSX.writeFile(wb, outPublicPath);
  console.log('Saved to:', outPublicPath);
} catch (e) { console.error('Public write err:', e.message); }

try {
  XLSX.writeFile(wb, outArtifactPath);
  console.log('Saved to:', outArtifactPath);
} catch (e) { console.error('Artifact write err:', e.message); }

console.log('ENRICHED EXCEL EXPORT COMPLETED SUCCESSFULLY!');
