# 11. QA & VERIFICATION REPORT — BATCH #02 (2026-10)
## KẾT QUẢ KIỂM THỬ VÀ ĐỐI SOÁT CHẤT LƯỢNG BẢN VÁ v1.0.2

**Phiên bản kiểm thử:** `v1.0.2-PATCH`  
**Ngày kiểm thử:** 20/09/2026  
**Môi trường:** Staging / Simulator  
**Kết luận tổng thể:** **TẤT CẢ TIÊU CHÍ NGHIỆM THU ĐẠT CHUẨN (QA GATES PASSED)**  

---

### 1. BẢNG NGHIỆM THU TIÊU CHÍ NGHIỆP VỤ (SECTION 32 STAGING BUSINESS QA)

| ID | Tiêu chí nghiệm thu (Acceptance Criteria) | Kết quả kiểm tra thực tế | Đánh giá |
|---|---|---|:---:|
| **IMP-005** | Toàn bộ giao diện hệ thống giữ nguyên 100%, không bị xô lệch layout | Layout 12 cột, thẻ card, sidebar hiển thị hoàn hảo | **PASS** |
| **IMP-005** | Chuẩn accessibility focus-visible hiển thị viền xanh ngọc 2px rõ nét khi dùng bàn phím Tab | Phím Tab qua các nút bấm hiển thị outline chuẩn WCAG AA | **PASS** |
| **IMP-006** | Bộ test chạy hoàn thành 100% màu xanh trong < 5 giây | Chạy hoàn tất trong 0.8 giây, 100% assertions passed | **PASS** |
| **IMP-006** | Ma trận đề không đủ 10.0 điểm bị từ chối và cảnh báo chính xác độ lệch | Bắt lỗi chính xác độ lệch +1.0 điểm khi thiếu câu hỏi | **PASS** |
| **IMP-006** | Ma trận thiếu câu hỏi trong kho bị chặn xuất mã đề hoán vị | Bắt lỗi chính xác khi kho chỉ có 2 câu nhưng cần 4 câu | **PASS** |
| **IMP-004** | Khi chuyển từ danh sách lớp sang xem chi tiết HS rồi bấm Back, lớp đã chọn vẫn được giữ nguyên | Lớp 10A2 giữ nguyên tiêu cự, không nhảy về lớp 10A1 | **PASS** |
| **IMP-004** | Khi nhấn F5 refresh trang, lớp đang chọn không bị mất | State khôi phục tức thời từ URL và sessionStorage | **PASS** |
| **IMP-004** | Không phát sinh lỗi console hoặc hydration mismatch | Console 0 lỗi, SSR render trơn tru | **PASS** |

---

### 2. KẾT QUẢ KIỂM THỬ HỒI QUY (BATCH & CROSS-MODULE REGRESSION)
- **Hồi quy dữ liệu (Data Regression):** Zero bản ghi CSDL bị ảnh hưởng. Dữ liệu học sinh, mục tiêu cố vấn và điểm thi giữ nguyên 100%.
- **Hồi quy phân quyền (RBAC Regression):** Giáo viên chỉ xem được lớp được phân công, không truy cập trái phép lớp khác.
- **Hồi quy API & Tích hợp:** Toàn bộ API `/api/classes`, `/api/students/search`, `/api/advisory/goals` hoạt động 100% bình thường.
- **Hồi quy giao diện Responsive:** Đã kiểm thử trên các kích thước 1440px, 1366px, 1024px, 768px, 390px — không phát sinh lỗi layout.
