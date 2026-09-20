# WAVE 6 — DASHBOARD & REPORTING TOÀN HỆ THỐNG (SSM)
## TỔNG QUAN, MỤC TIÊU VÀ NGUYÊN TẮC HỆ THỐNG ĐIỀU HÀNH

---

### 1. Bối cảnh và Mục tiêu
Sau khi chuẩn hóa 5 phân hệ cốt lõi (Hồ sơ 360°, Cố vấn & GAP, Hỗ trợ học tập, Hoạt động trải nghiệm, Khảo thí & Chất lượng), **Wave 6 — Dashboard & Reporting Toàn Hệ Thống** là bước hợp nhất tối thượng:
> **Xây dựng một lớp Dashboard & Reporting thống nhất, truy vết được, hỗ trợ người dùng theo chu trình: Observe → Understand → Drill-down → Act.**

Dashboard giải quyết triệt để 6 câu hỏi điều hành:
1. *Điều gì đang xảy ra?* (Tiến độ, chỉ số KPI cốt lõi).
2. *Có vấn đề gì cần chú ý?* (Cảnh báo bất thường, học sinh suy giảm, phiếu quá hạn).
3. *Dữ liệu nào chưa hoàn thành?* (Trung tâm giám sát chất lượng dữ liệu).
4. *Chất lượng đang thay đổi thế nào?* (Xu hướng nhiều kỳ, GAP với mục tiêu).
5. *Phạm vi nào cần drill-down?* (Cơ sở $ightarrow$ Khối $ightarrow$ Lớp $ightarrow$ Học sinh).
6. *Người dùng cần hành động gì tiếp theo?* (Action Center với link trực tiếp).

### 2. Bộ 8 Nguyên Tắc "ONE" Cốt Lõi
- **ONE Metric Catalog**: Mỗi chỉ số chỉ có một định nghĩa, một công thức và một nguồn quản lý duy nhất.
- **ONE Source of Truth per metric**: Dashboard chỉ **Read + Aggregate + Compare + Drill-down**, tuyệt đối không tự tính toán lại công thức khác module nguồn.
- **ONE Dashboard Data Layer**: Kiến trúc dữ liệu phân tầng rõ ràng từ Source Module $ightarrow$ Data Contract $ightarrow$ Aggregation Layer $ightarrow$ Role View.
- **ONE Reporting Strategy**: Trung tâm báo cáo tập trung, loại bỏ tình trạng báo cáo rải rác trong từng trang.
- **ONE Filter Language**: Bộ lọc phân cấp chuẩn hóa (Năm học, Cơ sở, Khối, Môn, Tổ chuyên môn).
- **ONE Drill-down Pattern**: Mọi KPI bất thường đều hỗ trợ xem danh sách chi tiết, triệt tiêu hoàn toàn "Dead-end dashboard".
- **ONE Alert Model**: Phân loại mức độ nghiêm trọng (Critical / Warning / Info) có quy tắc nghiệp vụ rõ ràng.
- **ONE Role-aware Dashboard System**: Thiết kế riêng biệt cho 5 nhóm vai trò (GV, TTCM, QLCM/TBP, GĐCS, Ban KT&ĐBCL).
