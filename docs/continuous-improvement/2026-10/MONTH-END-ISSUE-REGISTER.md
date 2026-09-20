# MONTH-END ISSUE REGISTER — MONTH 1 (2026-09)
## SỔ ĐĂNG KÝ VẤN ĐỀ VÀ PHÂN LOẠI XỬ LÝ CUỐI THÁNG 1

**Hệ thống:** Sky-Line Educational Quality Management System (SSM)  
**Kỳ đánh giá:** Cuối tháng 1 sau Go-Live (Tháng 09/2026)  
**Nguyên tắc:** **EVIDENCE BEFORE CHANGE — SMALL BATCH — SCOPE LOCK**  

---

### 1. BẢNG SỔ ĐĂNG KÝ VẤN ĐỀ TOÀN DIỆN (COMPREHENSIVE ISSUE REGISTER)

| ID | Vấn đề ghi nhận (Problem) | Bằng chứng thực tế (Evidence) | Căn nguyên gốc rễ (Root Cause) | Mức tác động (Impact) | Đề xuất phân loại (Recommendation) |
|---|---|---|---|:---:|:---:|
| **ISS-01** | Thao tác nhập điểm 35–40 HS/lớp bằng chuột tốn nhiều thời gian | 11 phản hồi từ GVBM tại 3 cơ sở (4.5 phút/lớp) | Thiếu keyboard navigation listener | Trung bình | **IMPROVE (Đã xử lý dứt điểm trong Batch #01 v1.0.1)** |
| **ISS-02** | Mở album ảnh ngoại khóa tải chậm trên mạng 4G ngoài trời | 5 phản hồi từ GV cơ sở Hill (tải 48.5MB đồng loạt) | Tải nguyên ảnh gốc và thiếu lazy loading | Thấp | **IMPROVE (Đã xử lý dứt điểm trong Batch #01 v1.0.1)** |
| **ISS-03** | Cần bảo đảm tính nhất quán toán học GAP trước kỳ thi GK1 | Yêu cầu QA nội bộ (Nợ kỹ thuật TD-03) | Thiếu automated regression test cho GAP | Trung bình | **TECHNICAL HARDENING (Đã xử lý xong trong Batch #01)** |
| **ISS-04** | Bộ lọc lớp/môn của GVCN bị reset khi tải lại trang | 7 phản hồi từ GVCN phụ trách nhiều lớp | Ephemeral state trong React `useState`, thiếu URL sync | Thấp | **IMPROVE (Phê duyệt cho Batch #02 — IMP-004)** |
| **ISS-05** | Một số selector CSS cũ dư thừa trong file global styles | Audit mã nguồn định kỳ (Nợ kỹ thuật TD-04) | Mã CSS layout prototype cũ chưa dọn sạch | Rất thấp | **TECHNICAL HARDENING (Phê duyệt cho Batch #02 — IMP-005)** |
| **ISS-06** | Cần kiểm tra tự động ma trận đề thi GK1 khớp tổng điểm 10.0 | Yêu cầu chuẩn bị cho kỳ thi Giữa HK1 (GK1) | Cần kiểm tra thủ công 18 ma trận tốn 4h | Thấp | **TECHNICAL HARDENING (Phê duyệt cho Batch #02 — IMP-006)** |
| **ISS-07** | GVCN còn e ngại ghi chú tư vấn tâm lý học sinh lộ thông tin | 8 phản hồi từ GVCN các cơ sở | Nhận thức chưa rõ về cơ chế mã hóa AES-256 | Trung bình | **TRAINING / PROCESS (Tổ chức truyền thông, không sửa code)** |
| **ISS-08** | Đề xuất xây dựng tính năng chat nội bộ học sinh và giáo viên | 12 đề xuất từ ban phong trào | Nhu cầu mở rộng tính năng ngoài phạm vi cốt lõi | Rất thấp | **CLOSE / DEFER (Không phù hợp tôn chỉ quản lý chất lượng)** |

---

### 2. TỔNG KẾT PHÂN LOẠI QUYẾT ĐỊNH
- **MUST FIX:** **0 mục** (Không có lỗi P0/P1 hoặc sai lệch dữ liệu CSDL).
- **IMPROVE:** **3 mục** (2 mục đã xong ở v1.0.1, 1 mục chuyển sang Batch #02).
- **TECHNICAL HARDENING:** **3 mục** (1 mục đã xong ở v1.0.1, 2 mục chuyển sang Batch #02).
- **TRAINING / PROCESS:** **1 mục** (Ban hành văn bản bảo mật thông tin tâm lý).
- **DATA CLEANUP:** **0 mục** (Dữ liệu sạch 99.9%).
- **QUARTERLY CANDIDATE:** **0 mục** (Không có vấn đề đòi hỏi tái cấu trúc lớn).
- **CLOSE / DEFER:** **1 mục** (Chat nội bộ).
