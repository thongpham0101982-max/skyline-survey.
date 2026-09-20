# 10. IMPLEMENTATION MANIFEST — BATCH #02 (2026-10)
## BẢNG KÊ KHAI VÀ THEO DÕI TIẾN ĐỘ TRIỂN KHAI MÃ NGUỒN

**Mã phiên bản phát hành:** `v1.0.2-PATCH`  
**Kỳ vận hành:** Tháng 10/2026 (Trước mốc Freeze kỳ thi Giữa học kỳ 1)  
**Nguyên tắc vận hành:** `SMALL CHANGE — CONTROLLED CHANGE — MEASURABLE CHANGE — NO SCOPE CREEP`  
**Trạng thái tổng thể:** **IMPLEMENTED & VERIFIED (HOÀN TẤT TRIỂN KHAI VÀ KIỂM CHỨNG)**  

---

### 1. BẢNG MANIFEST THEO DÕI HẠNG MỤC (SECTION 3)

| ID | Priority | Module | Risk | Dependency | Status | Files Changed |
|---|:---:|---|:---:|---|:---:|---|
| **IMP-005** | P3 | Shared Styles | **LOW** | None | **VERIFIED** | `src/app/globals.css` |
| **IMP-006** | P2 | Khảo thí & Đề thi | **LOW** | None | **VERIFIED** | `tests/batch02_matrix_validation.test.ts` |
| **IMP-004** | P2 | Cố vấn học tập | **LOW** | None | **VERIFIED** | `src/app/teacher/co-van-hoc-tap/page.tsx` |

---

### 2. CHI TIẾT TRIỂN KHAI TỪNG HẠNG MỤC (ONE ITEM AT A TIME — SECTION 6)

#### 2.1. Hạng mục IMP-005 (CSS Cleanup — TD-04)
- **Problem:** Tệp styles chứa rule `*:focus-visible` phủ định `outline: none !important` xung đột với chuẩn accessibility và nợ kỹ thuật TD-04.
- **Root cause:** Mã CSS prototype cũ chưa được chuẩn hóa đồng bộ theo SSM Design System.
- **Files changed:** `src/app/globals.css` (Cập nhật 4 dòng mã chuẩn hóa outline).
- **Logic changed:** Chuẩn hóa outline focus-visible 2px màu `#08AAA4`.
- **API changed?** NO | **Database changed?** NO | **RBAC changed?** NO | **UI changed?** NO visual drift | **Data changed?** NO.
- **File Diff Classification:** **EXPECTED (100% compliant)**.

#### 2.2. Hạng mục IMP-006 (Matrix Validation for GK1)
- **Problem:** Cần kiểm tra tự động 18 ma trận đề thi cho kỳ thi Giữa kỳ 1 bảo đảm tổng điểm = 10.0 và đủ câu hỏi trong thư viện đề.
- **Root cause:** Thiếu automated test suite cho service ma trận đề thi.
- **Files changed:** `tests/batch02_matrix_validation.test.ts` (File test mới).
- **Logic changed:** Kiểm tra hàm `validateExamMatrix` với các kịch bản ma trận chuẩn 10.0, ma trận thiếu điểm, ma trận thiếu câu hỏi trong ngân hàng và tỷ lệ 4 mức tư duy.
- **API changed?** NO | **Database changed?** NO | **RBAC changed?** NO | **UI changed?** NO | **Data changed?** NO.
- **File Diff Classification:** **EXPECTED**.

#### 2.3. Hạng mục IMP-004 (Filter Persistence in Advisory)
- **Problem:** Bộ lọc danh sách lớp của GVCN bị reset khi mở xem chi tiết học sinh rồi bấm Back hoặc khi F5 refresh trang.
- **Root cause:** Local state component chỉ lưu tạm bằng `useState("")`, khi mount lại bị reset về lớp đầu tiên `validClasses[0].id`.
- **Files changed:** `src/app/teacher/co-van-hoc-tap/page.tsx`.
- **Logic changed:**
  - Khởi tạo `selectedClassId` đọc từ URL `?classId=...` hoặc `sessionStorage.getItem("ssm_advisory_classId")`.
  - Giữ lại lớp đã chọn khi danh sách lớp tải xong nếu lớp đó hợp lệ trong `validClasses`.
  - Tự động đồng bộ `selectedClassId` vào `sessionStorage` và URL query parameter thông qua `history.replaceState`.
- **API changed?** NO | **Database changed?** NO | **RBAC changed?** NO | **UI changed?** Minimal (giữ nguyên layout) | **Data changed?** NO.
- **File Diff Classification:** **EXPECTED**.
