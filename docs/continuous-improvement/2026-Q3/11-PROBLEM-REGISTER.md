# 11. QUARTERLY PROBLEM REGISTER — 2026-Q3
## SỔ ĐĂNG KÝ VẤN ĐỀ VÀ PHÂN LOẠI QUYẾT ĐỊNH XỬ LÝ

---

### 1. SỔ ĐĂNG KÝ VẤN ĐỀ QUÝ 3/2026

| Mã | Vấn đề ghi nhận | Bằng chứng thực tế | Xu hướng | Mức tác động | Căn nguyên gốc rễ | Phân loại quyết định |
|---|---|---|:---:|:---:|---|:---:|
| **PR-01** | Thao tác nhập điểm bằng chuột gây mỏi tay khi nhập cả lớp | 11 phản hồi từ GVBM tại 3 cơ sở | ĐÃ GIẢI QUYẾT | Trung bình | Thiếu keyboard navigation listener | **MONTHLY IMPROVEMENT (Hoàn tất v1.0.1)** |
| **PR-02** | Mở album ảnh ngoại khóa tải chậm trên mạng 4G | 5 phản hồi từ GV Hill | ĐÃ GIẢI QUYẾT | Thấp | Tải đồng loạt ảnh gốc full-size | **MONTHLY IMPROVEMENT (Hoàn tất v1.0.1)** |
| **PR-03** | Cần kiểm thử tự động thuật toán GAP trước kỳ thi GK1 | Yêu cầu QA nội bộ (TD-03) | ĐÃ GIẢI QUYẾT | Trung bình | Thiếu automated regression test | **TECHNICAL HARDENING (Hoàn tất v1.0.1)** |
| **PR-04** | Bộ lọc danh sách lớp trên màn hình Cố vấn cần ghi nhớ lựa chọn gần nhất | 7 phản hồi từ GVCN dạy nhiều lớp | ỔN ĐỊNH | Thấp | State bộ lọc reset khi refresh trang | **MONTHLY IMPROVEMENT (Duyệt cho Batch #02)** |
| **PR-05** | Một số CSS selector dư thừa trong layout shared cũ | Kiểm toán code (TD-04) | ỔN ĐỊNH | Rất thấp | Mã CSS cũ chưa dọn sạch | **TECHNICAL HARDENING (Duyệt cho Batch #02)** |
| **PR-06** | GVCN còn phân vân về mức độ bảo mật khi ghi chú tâm lý Tier 2 | 8 phản hồi từ GVCN | ỔN ĐỊNH | Trung bình | Chưa hiểu rõ ranh giới mã hóa phân quyền | **TRAINING / PROCESS (Không sửa code)** |
| **PR-07** | Đề xuất tạo thêm chức năng mạng xã hội nội bộ học sinh | 2 đề xuất từ ban phong trào | ĐƠN LẺ | Rất thấp | Nhu cầu phát sinh ngoài phạm vi quản lý chất lượng | **REJECT / DEFER (Không phù hợp tôn chỉ SSM)** |

---

### 2. TỔNG HỢP CÁC QUYẾT ĐỊNH
- **MAINTAIN (Giữ nguyên ổn định):** 100% kiến trúc lõi, Database, RBAC và Design System.
- **MONTHLY IMPROVEMENT:** Đã hoàn thành Batch #01 (IMP-001, IMP-002). Chuẩn bị Batch #02 (nhớ bộ lọc lớp).
- **TECHNICAL HARDENING:** Đã hoàn thành TD-03. Chuẩn bị Batch #02 (dọn dẹp CSS TD-04).
- **TRAINING / PROCESS:** Ban hành hướng dẫn bảo mật tâm lý học sinh.
- **RETIRE CANDIDATE:** 0 hạng mục.
- **STRATEGIC CHANGE CANDIDATE:** **0 hạng mục (Không có nhu cầu thay đổi lớn).**
