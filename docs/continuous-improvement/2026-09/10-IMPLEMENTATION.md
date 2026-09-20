# 10. IMPLEMENTATION REPORT — BATCH #01
## BÁO CÁO KỸ THUẬT TRIỂN KHAI GÓI CẢI TIẾN THÁNG 09/2026

**Mã phiên bản phát hành:** `v1.0.1-PATCH`  
**Nguyên tắc vận hành:** `STABLE BY DEFAULT — CHANGE BY EVIDENCE`  
**Thời gian triển khai:** 20/09/2026  
**Trạng thái:** **HOÀN TẤT TRIỂN KHAI (CODE COMPLETE & SCOPE LOCKED)**  

---

### 1. PHẠM VI TRIỂN KHAI KHÓA CỨNG (HARD SCOPE LOCK)
Trong gói Batch #01, tuân thủ nghiêm ngặt chỉ 3 hạng mục được phê duyệt từ `09-APPROVED-BATCH.md`. Tuyệt đối không tái cấu trúc mã nguồn ngoài phạm vi, không thay đổi Prisma schema, không sửa đổi API contract.

| Mã hạng mục | Phân hệ | File mã nguồn thay đổi | Loại thay đổi | Bản chất kỹ thuật |
|---|---|---|---|---|
| **IMP-001** (BATCH01-FEAT-01) | Khảo thí & Đánh giá | `src/app/teacher/input-assessments/client.tsx` | UX Enhancement | Bổ sung keyboard navigation listener (`Enter`, `ArrowDown`, `ArrowUp`) |
| **IMP-002** (BATCH01-FEAT-02) | Hoạt động Trải nghiệm | `src/app/teacher/experiential-activities/[id]/page.tsx`<br>`src/app/teacher/experiential-activities/create/page.tsx` | Perf / UX | Thuộc tính `loading="lazy"`, `decoding="async"`, `max-w-[800px]`, quản lý URL minh chứng |
| **IMP-003** (BATCH01-TECH-03) | Nợ kỹ thuật / Testing | `tests/batch01_assessment_gap.test.ts` | Test Coverage | Bộ test hồi quy tự động kiểm thử logic GAP Analysis và phân loại mục tiêu |

---

### 2. CHI TIẾT KỸ THUẬT TỪNG HẠNG MỤC

#### 2.1. IMP-001 — Keyboard Navigation trong bảng nhập điểm học sinh
- **Vấn đề:** Giáo viên phải rời tay khỏi bàn phím sang chuột để click từng ô điểm của 35–40 học sinh.
- **Giải pháp áp dụng:**
  - Định danh duy nhất cho từng ô input điểm: `id={`score-input-${idx}-${colIdx}`}`.
  - Bổ sung handler `onKeyDown` điều hướng tiêu cự:
    - Nhấn `Enter` hoặc `ArrowDown`: Tự động nhảy tiêu cự (`focus()`) xuống ô nhập điểm của học sinh tiếp theo ở cùng cột điểm.
    - Nhấn `ArrowUp`: Tự động nhảy tiêu cự lên ô nhập điểm của học sinh phía trên.
  - Tận dụng logic kiểm tra biên [0.0 - 10.0] hiện có, không làm thay đổi state flow hoặc transaction lưu điểm.
- **Tác động mã nguồn:** Sửa đổi cục bộ 22 dòng mã tại `src/app/teacher/input-assessments/client.tsx`.

#### 2.2. IMP-002 — Tối ưu hóa tải ảnh minh chứng hoạt động trải nghiệm
- **Vấn đề:** Trang chi tiết hoạt động ngoại khóa hiển thị ảnh minh chứng dung lượng lớn gây nghẽn băng thông trên mạng 4G tại hiện trường.
- **Giải pháp áp dụng:**
  - Bổ sung cơ chế Lazy Loading bằng thuộc tính gốc `loading="lazy"` và giải mã không đồng bộ `decoding="async"`.
  - Giới hạn kích thước hiển thị thumbnail responsive tối ưu `max-w-[800px]`, `object-cover` kèm fallback `onError`.
  - Cho phép nhập danh sách URL minh chứng kèm xem trước tức thì trên màn hình khởi tạo hoạt động (`create/page.tsx`).
- **Tác động mã nguồn:** Sửa đổi cục bộ tại `[id]/page.tsx` và `create/page.tsx`, không tác động CSDL hay backend routing.

#### 2.3. IMP-003 — Bộ kiểm thử hồi quy tự động GAP Analysis & Phân loại mục tiêu
- **Vấn đề:** Cần bảo đảm tính nhất quán toán học của thuật toán phân tích GAP giữa điểm khảo thí thực tế và mục tiêu cố vấn học tập trước kỳ thi GK1.
- **Giải pháp áp dụng:**
  - Xây dựng suite kiểm thử độc lập tại `tests/batch01_assessment_gap.test.ts`.
  - Kiểm thử đầy đủ 5 kịch bản môn học: Đạt/vượt mục tiêu (`DAT_VUOT_MUC_TIEU`), Tiệm cận (`TIEM_CAN`), Cần nỗ lực (`CAN_NO_LUC`), Chưa có điểm (`CHUA_CO_DIEM`), Chuỗi diễn biến tiến độ (Trend).
  - Kiểm thử 4 mức độ mục tiêu phi môn học (`DAT`, `DANG_THUC_HIEN`, `CAN_DIEU_CHINH`, `CHUA_BAT_DAU`).
- **Kết quả:** 26/26 test assertions passed 100%.
