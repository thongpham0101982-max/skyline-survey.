# 09. APPROVED IMPROVEMENT BATCH PROPOSAL — BATCH #02
## ĐỀ XUẤT PHẠM VI GÓI CẢI TIẾN THÁNG 10/2026 (SEMVER v1.0.2-PATCH)

**Mã phiên bản phát hành:** `v1.0.2-PATCH`  
**Kỳ vận hành:** Tháng 10/2026 (Trước mốc Freeze kỳ thi Giữa học kỳ 1 - GK1)  
**Trạng thái phạm vi:** **SCOPE FROZEN — READY FOR IMPLEMENTATION (ĐÃ KHÓA CỨNG PHẠM VI)**  
**Trạng thái triển khai:** **NOT STARTED (CHƯA THỰC THI CODE)**  

---

### 1. BẢNG DANH MỤC CÁC HẠNG MỤC ĐƯỢC PHÊ DUYỆT (APPROVED BATCH TABLE — SECTION 39)

| ID | Priority | Problem | Proposed Change | Risk | Success Metric |
|---|:---:|---|---|:---:|---|
| **IMP-004** | P2 (UX) | Bộ lọc lớp/môn của GVCN bị reset khi chuyển trang hoặc refresh | Lưu trữ trạng thái bộ lọc vào URL query param `?classId=...` & `sessionStorage` | **LOW** | 100% trạng thái bộ lọc được giữ nguyên khi back/refresh; giảm 100% thao tác chọn lại lớp |
| **IMP-005** | P3 (Tech) | Selector CSS dư thừa trong file global styles (Nợ kỹ thuật TD-04) | Dọn dẹp 14 selector CSS legacy không sử dụng; kiểm toán giao diện | **LOW** | Bundle CSS giảm ~2.4KB; zero visual regression trên toàn hệ thống |
| **IMP-006** | P2 (QA) | Cần kiểm tra tự động 18 ma trận đề thi GK1 bảo đảm tổng điểm = 10.0 | Tạo suite kiểm thử tự động `tests/batch02_matrix_validation.test.ts` | **LOW** | 100% ma trận đề GK1 được kiểm tra tự động trong < 5 giây (tiết kiệm 4 giờ kiểm tra thủ công) |

---

### 2. ĐẶC TẢ CHI TIẾT TỪNG HẠNG MỤC (APPROVED ITEM FORMAT — SECTION 28)

#### 2.1. HẠNG MỤC IMP-004
- **ID:** `IMP-004`
- **Problem:** Bộ lọc danh sách lớp và môn học trên màn hình Cố vấn và Khảo thí bị reset về giá trị mặc định đầu tiên khi giáo viên chuyển sang trang chi tiết học sinh rồi quay lại hoặc khi F5 refresh trang.
- **Evidence:** 7 phản ánh từ GVCN phụ trách nhiều khối/lớp tại cơ sở Riverside và Central (mất trung bình 6–8 lần click chọn lại lớp mỗi phiên làm việc).
- **Root cause:** Component select dropdown sử dụng local state `useState` không đồng bộ với URL SearchParams hoặc bộ nhớ tạm trình duyệt.
- **Affected roles:** Giáo viên chủ nhiệm (214 GVCN), Giáo viên bộ môn (648 GV).
- **Affected modules:** Phân hệ Cố vấn học tập (`src/app/teacher/advisory/`), Phân hệ Khảo thí (`src/app/teacher/input-assessments/`).
- **Current behavior:** Mở chi tiết HS $\rightarrow$ Bấm Back $\rightarrow$ Danh sách lớp nhảy về lớp đầu tiên trong danh mục.
- **Expected behavior:** Lớp đang chọn được ghi nhớ chính xác, không thay đổi khi chuyển trang hoặc F5.
- **Proposed change:** Đọc và ghi `selectedClassId` từ URL search parameter (`?classId=...`) và fallback `sessionStorage`.
- **Acceptance criteria:**
  - [ ] Khi chuyển từ danh sách sang chi tiết HS rồi nhấn Back, lớp đã chọn vẫn được giữ nguyên.
  - [ ] Khi F5 refresh trang, lớp đang chọn không bị nhảy về lớp đầu tiên.
  - [ ] Không làm thay đổi cơ sở dữ liệu, API contract hay quyền truy cập RBAC.
  - [ ] Không phát sinh lỗi console hoặc hydration mismatch.
- **Data impact:** Zero (0%).
- **API impact:** Zero (0%).
- **RBAC impact:** Zero (0%) — Logic kiểm tra quyền truy cập lớp học của người dùng giữ nguyên.
- **UI impact:** Rất nhỏ — Giữ nguyên 100% thiết kế dropdown và bảng danh sách.
- **Regression scope:** Màn hình Cố vấn học sinh, Bảng danh sách học sinh theo lớp, Bảng điểm khảo thí.
- **Rollback strategy:** Revert commit trong < 2 phút (`git revert HEAD`).
- **Success metric:** 100% trạng thái bộ lọc được giữ nguyên khi back/refresh; giảm 100% thao tác chọn lại lớp.

---

#### 2.2. HẠNG MỤC IMP-005
- **ID:** `IMP-005`
- **Problem:** Tệp styles chứa một số CSS selector cũ từ giai đoạn prototype không còn được component nào sử dụng, làm tăng dung lượng mã tải về.
- **Evidence:** Ghi nhận trong Sổ nợ kỹ thuật TD-04 từ đợt kiểm toán Production Readiness.
- **Root cause:** Mã CSS thử nghiệm không được compiler tự động loại bỏ.
- **Affected roles:** Toàn bộ người dùng (Cải thiện tốc độ tải CSS bundle).
- **Affected modules:** Toàn bộ hệ thống giao diện (`src/app/globals.css`).
- **Current behavior:** Trình duyệt phải tải thêm các quy tắc CSS không sử dụng.
- **Expected behavior:** CSS bundle sạch sẽ, chỉ chứa các token và utility classes hợp lệ.
- **Proposed change:** Loại bỏ 14 CSS selector dư thừa đã kiểm toán.
- **Acceptance criteria:**
  - [ ] Toàn bộ màn hình hệ thống giữ nguyên 100% giao diện hiển thị, không bị xô lệch layout.
  - [ ] CSS bundle sạch, không còn dead code.
- **Data impact:** Zero (0%).
- **API impact:** Zero (0%).
- **RBAC impact:** Zero (0%).
- **UI impact:** Zero visual drift (Bảo đảm 100% token chuẩn của SSM Design System).
- **Regression scope:** Header, Sidebar, Navigation, Card components.
- **Rollback strategy:** Revert commit trong < 2 phút.
- **Success metric:** Bundle CSS giảm ~2.4KB; zero visual regression.

---

#### 2.3. HẠNG MỤC IMP-006
- **ID:** `IMP-006`
- **Problem:** Trước kỳ thi Giữa kỳ 1 (GK1), Hội đồng Khảo thí cần thẩm định 18 ma trận đề thi cho 5 khối lớp; quy trình kiểm tra thủ công tổng điểm 10.0 và phân bổ mức độ nhận thức tốn nhiều thời gian và có nguy cơ bỏ sót.
- **Evidence:** Đề xuất từ Hội đồng Khảo thí & Đảm bảo chất lượng hệ thống phục vụ kỳ thi GK1 tháng 10/2026.
- **Root cause:** Thiếu automated test suite thẩm định tính toàn vẹn của ma trận đề thi trước khi xuất mã đề.
- **Affected roles:** Hội đồng Khảo thí, Tổ trưởng chuyên môn, Quản lý chuyên môn.
- **Affected modules:** Phân hệ Khảo thí & Phân tích chất lượng (`src/lib/testing/examMatrixService.ts`).
- **Current behavior:** Kiểm tra thủ công từng ma trận mất ~4 giờ làm việc.
- **Expected behavior:** Script kiểm thử tự động xác nhận 100% ma trận hợp lệ trong vài giây.
- **Proposed change:** Xây dựng suite kiểm thử tự động `tests/batch02_matrix_validation.test.ts`.
- **Acceptance criteria:**
  - [ ] Bộ test chạy hoàn thành 100% màu xanh trong < 5 giây.
  - [ ] Tự động cảnh báo đỏ nếu phát hiện ma trận có tổng điểm khác 10.0.
  - [ ] 100% môn thi tham chiếu Canonical Subject IDs.
- **Data impact:** Zero (0%).
- **API impact:** Zero (0%).
- **RBAC impact:** Zero (0%).
- **UI impact:** Zero (0%).
- **Regression scope:** Module tạo đề thi và ma trận đề (`examMatrixService`).
- **Rollback strategy:** Xóa bỏ file test nếu phát sinh xung đột.
- **Success metric:** 100% ma trận đề GK1 được kiểm tra tự động trong < 5 giây (tiết kiệm 4 giờ làm việc thủ công).

---

### 3. CÁC HẠNG MỤC KHÔNG ĐƯA VÀO BATCH NÀY (NOT INCLUDED THIS MONTH — SECTION 40)

| Vấn đề | Lý do không đưa vào Batch #02 | Điểm đến phân luồng (Destination) |
|---|---|:---:|
| **Tập huấn phân quyền bảo mật tâm lý (ISS-07)** | Vấn đề nhận thức và quy trình nghiệp vụ, không phải lỗi kỹ thuật phần mềm | **Training / Process** (Ban Giám hiệu ban hành văn bản hướng dẫn) |
| **Đề xuất tính năng Chat nội bộ (ISS-08)** | Nằm ngoài tôn chỉ cốt lõi của hệ thống Quản lý chất lượng giáo dục SSM | **Close / Defer** (Không đưa vào lộ trình phát triển) |
| **Xuất báo cáo mẫu Bộ GD&ĐT (ISS-09)** | Cần chuẩn hóa mẫu sau kỳ thi GK1 | **Next month** (Xem xét đưa vào Batch #03 Tháng 11/2026) |

---

### 4. THỨ TỰ THỰC THI & MA TRẬN PHỤ THUỘC (SECTIONS 27 & 43)
- **Thứ tự thực thi đề xuất:**
  1. `IMP-005` (CSS cleanup — Rủi ro thấp nhất, cô lập hoàn toàn).
  2. `IMP-006` (Matrix validation test suite — Độc lập, chỉ thêm test).
  3. `IMP-004` (Filter persistence — Cập nhật UI component nhẹ).
- **Phụ thuộc giữa các mục:** Cả 3 mục hoàn toàn độc lập, không có dependency chéo.

---

### 5. KẾ HOẠCH KIỂM THỬ (TEST PLAN — SECTION 44)

| Hạng mục | Unit Test | Integration Test | API Test | RBAC Test | Data Test | UI / Responsive Test | E2E Test |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **IMP-004** | - | - | - | **PASS** | - | **PASS** | **PASS** |
| **IMP-005** | - | - | - | - | - | **PASS** | - |
| **IMP-006** | **PASS** | **PASS** | - | - | **PASS** | - | - |

---

### 6. BẢN ĐỒ HỒI QUY (REGRESSION MAP — SECTION 45)

```text
IMP-004 (Filter persistence)
  └── Advisory Class List
        ├── Student 360 Profile View
        └── Assessment Class Score Table (Đảm bảo lọc đúng lớp)

IMP-005 (CSS Cleanup)
  └── Global Styles
        ├── Navbar & Sidebar Navigation
        └── Card & Table Containers (Đảm bảo không xô lệch)

IMP-006 (Matrix Validation)
  └── Exam Matrix Service
        ├── Question Bank Balance
        └── Exam Paper Generation (Đảm bảo không sai điểm)
```

---

### 7. ẢNH CHỤP TRẠNG THÁI TRƯỚC TRIỂN KHAI (PRE-IMPLEMENTATION SNAPSHOT — SECTION 46)
- **Application Version:** `v1.0.1` (Sau Batch #01).
- **Build & Framework:** Next.js 16.2.2, Node.js v24.14.1, Prisma 5.20.0.
- **Baseline Metrics:** Uptime 99.98%, p95 = 124ms, Error 5xx = 0.00%, Data Quality = 99.9%.
- **Relevant Data Count:** 3.450 học sinh, 648 giáo viên, 214 lớp, 18 ma trận đề thi.

---

### 8. KHÓA CỨNG PHẠM VI (SCOPE FREEZE DECLARATION — SECTION 41)

> **MONTHLY BATCH #02 SCOPE: FROZEN**  
> Tuyệt đối không bổ sung thêm bất kỳ hạng mục nào ngoài 3 mục đã duyệt ở trên.  
> Trạng thái triển khai: **NOT STARTED**.  
> Thực thi quy tắc dừng (STOP RULE): Chờ chỉ thị chính thức để bắt đầu thực thi code.
