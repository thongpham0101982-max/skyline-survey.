import { KnowledgeDocumentMetadata } from "../types";

export const OFFICIAL_KNOWLEDGE_DOCUMENTS: KnowledgeDocumentMetadata[] = [
  {
    id: "QC-BENCHMARK-2026",
    title: "Quy Chế Điểm Chuẩn Benchmark Học Tập Năm Học 2026-2027",
    category: "BENCHMARK",
    version: "2.1",
    schoolYear: "2026-2027",
    effectiveDate: "2026-08-15",
    status: "ACTIVE",
    roleScope: ["ADMIN", "TBP", "TTCM", "TEACHER", "PARENT", "STUDENT"],
    campusScope: ["ALL"],
    source: "Quyết định số 48/QĐ-BĐHCM-SKL",
    content: `[QUY ĐỊNH CHUẨN BENCHMARK MÔN HỌC SKY-LINE]:
1. Khối Tiểu học (Lớp 1 đến Lớp 5):
   - Chuẩn điểm đạt Benchmark: Điểm định kỳ và điểm tổng kết đạt từ 7.0/10 trở lên.
   - Xếp loại: Vượt chuẩn (>= 9.0), Đạt chuẩn (7.0 - 8.9), Dưới chuẩn (< 7.0).
2. Khối THCS và THPT (Lớp 6 đến Lớp 12):
   - Chuẩn điểm đạt Benchmark: Điểm định kỳ và điểm tổng kết đạt từ 6.0/10 trở lên.
   - Xếp loại: Vượt chuẩn (>= 8.0), Đạt chuẩn (6.0 - 7.9), Dưới chuẩn (< 6.0).
3. Biện pháp đối với học sinh dưới chuẩn:
   - Giáo viên bộ môn phối hợp GVCN ghi chú vào danh sách theo dõi học sinh dưới chuẩn.
   - Thiết lập mục tiêu SMART và kích hoạt Kế hoạch 7 ngày gỡ rào cản.`
  },
  {
    id: "QC-DU-GIO-11TC",
    title: "Quy Định Đánh Giá Dự Giờ 11 Tiêu Chí Sư Phạm & Định Mức Tháng",
    category: "OBSERVATION",
    version: "3.0",
    schoolYear: "2026-2027",
    effectiveDate: "2026-08-20",
    status: "ACTIVE",
    roleScope: ["ADMIN", "TBP", "TTCM", "TEACHER"],
    campusScope: ["ALL"],
    source: "Văn bản hướng dẫn chuyên môn số 112/HD-KTĐBCL",
    content: `[QUY ĐỊNH HOẠT ĐỘNG DỰ GIỜ SƯ PHẠM VÀ PHÁT TRIỂN CHUYÊN MÔN]:
1. Định mức dự giờ bắt buộc trong tháng:
   - Giáo viên giảng dạy (GVBM, GVCN): Tối thiểu 2 tiết dự giờ/tháng.
   - Tổ trưởng Chuyên môn (TTCM): Tối thiểu 4 tiết dự giờ/tháng trong tổ chuyên môn.
   - Lãnh đạo BGH / Ban ĐHCM: Dự giờ theo kế hoạch thanh tra chuyên môn định kỳ.
2. Bộ 11 Tiêu chí Đánh giá Tiết dạy (Y1 đến Y11 - Thang điểm 20.00):
   - Y1: Mục tiêu bài học rõ ràng, phù hợp năng lực học sinh.
   - Y2: Nội dung chính xác, khoa học, bám sát khung chuẩn.
   - Y3: Phương pháp giảng dạy tích cực, phát huy tính chủ động của học sinh.
   - Y4: Sử dụng hiệu quả thiết bị, đồ dùng dạy học và công nghệ thông tin.
   - Y5: Tổ chức hoạt động học tập nhóm và tương tác sư phạm hiệu quả.
   - Y6: Quản lý lớp học nề nếp, tạo không khí học tập tích cực, thân thiện.
   - Y7: Phân hóa đối tượng học sinh (có hoạt động hỗ trợ học sinh yếu/nâng cao cho học sinh giỏi).
   - Y8: Đánh giá quá trình, phản hồi kịp thời cho học sinh trong tiết học.
   - Y9: Tác phong sư phạm chuẩn mực, ngôn ngữ mẫu mực, truyền cảm hứng.
   - Y10: Học sinh tích cực, chủ động, hiểu bài và vận dụng được kiến thức.
   - Y11: Phân bổ thời gian hợp lý, hoàn thành trọn vẹn tiến trình bài giảng.
3. Khung xếp loại tiết dạy:
   - Loại Tốt: Tổng điểm từ 18.00 đến 20.00 điểm.
   - Loại Khá: Tổng điểm từ 14.00 đến dưới 18.00 điểm.
   - Loại Đạt: Tổng điểm từ 10.00 đến dưới 14.00 điểm.
   - Loại Chưa đạt: Dưới 10.00 điểm (bắt buộc dự lại và bồi dưỡng chuyên môn).`
  },
  {
    id: "QC-CO-VAN-SMART-2026",
    title: "Quy Định Sổ Mục Tiêu SMART & Kế Hoạch 7 Ngày Gỡ Khó",
    category: "ADVISORY",
    version: "2.0",
    schoolYear: "2026-2027",
    effectiveDate: "2026-09-01",
    status: "ACTIVE",
    roleScope: ["ADMIN", "TBP", "TTCM", "TEACHER", "PARENT", "STUDENT"],
    campusScope: ["ALL"],
    source: "Quy trình Cố vấn Học đường số 76/QT-CVHT",
    content: `[QUY CHẾ SỔ MỤC TIÊU SMART VÀ KẾ HOẠCH 7 NGÀY GỠ RÀO CẢN]:
1. Nguyên tắc thiết lập mục tiêu SMART của học sinh:
   - S (Specific): Mục tiêu điểm số hoặc kỹ năng rõ ràng theo từng môn học.
   - M (Measurable): Đo lường bằng điểm bài kiểm tra hoặc số lượng bài tập hoàn thành.
   - A (Achievable): Vừa sức, có tính thử thách phù hợp với năng lực hiện thời.
   - R (Relevant): Gắn liền với sự tiến bộ học kỳ và chuẩn benchmark.
   - T (Time-bound): Có hạn định rõ ràng (theo tuần, tháng hoặc bài kiểm tra định kỳ).
2. Kế hoạch 7 ngày gỡ rào cản (7-Day Barrier Removal Plan):
   - Kích hoạt khi: Điểm kiểm tra dưới chuẩn benchmark, hoặc khoảng chênh GAP < -1.5 điểm, hoặc học sinh rơi vào trạng thái cảnh báo ĐỎ.
   - Nội dung: Học sinh cùng GVCN/Cố vấn xác định 3 hành động cụ thể trong vòng 7 ngày để giải quyết khó khăn kiến thức.
3. Phân loại trạng thái Cố vấn học tập:
   - Trạng thái XANH (Bình thường): Điểm đạt benchmark, hoàn thành mục tiêu.
   - Trạng thái VÀNG (Cần lưu ý): Có 1-2 môn dưới benchmark nhẹ (-1.5 <= GAP < -0.5), cần GVCN nhắc nhở.
   - Trạng thái ĐỎ (Nguy cơ cao): Nhiều môn dưới chuẩn (GAP < -1.5), cần thông báo gia đình và họp cố vấn trực tiếp.`
  },
  {
    id: "QC-MO-KHOA-SO-DIEM",
    title: "Quy Trình Xin Mở Khóa Sổ Điểm & Xét Duyệt Điểm",
    category: "PROCESS",
    version: "1.5",
    schoolYear: "2026-2027",
    effectiveDate: "2026-08-10",
    status: "ACTIVE",
    roleScope: ["ADMIN", "TBP", "TTCM", "TEACHER"],
    campusScope: ["ALL"],
    source: "Quy trình KT-ĐBCL số 35/QT-KTĐBCL",
    content: `[QUY TRÌNH XIN MỞ KHÓA SỔ ĐIỂM TRÊN HỆ THỐNG SSM]:
1. Thời hạn khóa sổ điểm:
   - Sau thời hạn quy định nhập điểm định kỳ (GK1, CK1, GK2, CK2), hệ thống SSM tự động khóa sổ điểm lớp.
2. Quy trình xin mở khóa bổ sung / chỉnh sửa điểm:
   - Bước 1: Giáo viên bộ môn vào trang Sổ điểm, bấm 'Yêu cầu mở khóa sổ điểm'.
   - Bước 2: Nhập đầy đủ lý do điều chỉnh, danh sách học sinh và minh chứng bài làm (nếu có phúc khảo/chấm sót).
   - Bước 3: Tổ trưởng Chuyên môn (TTCM) xác nhận yêu cầu hợp lệ trong vòng 24 giờ.
   - Bước 4: Ban Khảo thí & Đảm bảo Chất lượng (KT-ĐBCL) hoặc Ban ĐHCM phê duyệt trên hệ thống.
   - Bước 5: Khi được duyệt, sổ điểm được mở tạm thời trong vòng 48 giờ để giáo viên cập nhật.`
  },
  {
    id: "QC-HD-SU-DUNG-SSM",
    title: "Cẩm Nang Hướng Dẫn Sử Dụng & Tra Cứu Hệ Thống SSM",
    category: "SSM_GUIDE",
    version: "2.0",
    schoolYear: "2026-2027",
    effectiveDate: "2026-09-01",
    status: "ACTIVE",
    roleScope: ["ADMIN", "TBP", "TTCM", "TEACHER", "PARENT", "STUDENT"],
    campusScope: ["ALL"],
    source: "Tài liệu đào tạo nội bộ Sky-Line IT",
    content: `[HƯỚNG DẪN THAO TÁC CÁC CHỨC NĂNG CỐT LÕI TRÊN SSM]:
1. Quản lý Sổ điểm & Benchmark:
   - Truy cập: Giáo viên vào 'Sổ điểm & Nhận xét' hoặc 'Điểm lớp chủ nhiệm'.
   - Kiểm tra học sinh dưới chuẩn: Bộ lọc tự động đánh dấu màu cam/đỏ các điểm dưới 6.0 (THCS/THPT) hoặc 7.0 (Tiểu học).
2. Dự giờ sư phạm:
   - Đăng ký tiết dạy / đi dự: Vào 'Hoạt động dự giờ' -> 'Đăng ký tiết dạy' hoặc 'Đăng ký đi dự'.
   - Nhập phiếu đánh giá: Đánh giá theo 11 tiêu chí, nhận xét ưu điểm và giải pháp cải thiện.
3. Cố vấn học tập & Học sinh:
   - Cổng Giáo viên: Vào 'Cố vấn học tập' để cập nhật trạng thái Xanh/Vàng/Đỏ và nhật ký trao đổi.
   - Cổng Học sinh: Vào 'Sổ mục tiêu' để tạo mục tiêu SMART học kỳ và xem kế hoạch 7 ngày gỡ rào cản.`
  }
];
