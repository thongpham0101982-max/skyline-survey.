# 09. APPROVED IMPROVEMENT BATCH #02 — MONTH-END REVIEW #02
## VĂN BẢN PHÊ DUYỆT GÓI CẢI TIẾN VẬN HÀNH THÁNG 10/2026 (SEMVER v1.0.2-PATCH)

**Mã văn bản:** `09-APPROVED-BATCH-02.md`  
**Kỳ đánh giá:** Month-End Review #02 (Tháng 10/2026)  
**Nguyên tắc chỉ đạo:** **STABLE BY DEFAULT — CHANGE ONLY WITH EVIDENCE — NO CHANGE IS A VALID DECISION**  
**Trạng thái phạm vi:** **BATCH #02 SCOPE FROZEN (ĐÃ KHÓA CỨNG PHẠM VI)**  

---

### 1. ĐỐI SOÁT 3 MỐC THỜI GIAN (3-MILESTONE COMPARISON — SECTION 2)

| Chỉ số trọng yếu | Mốc Operational Baseline | Tháng trước (Month 1 - 2026-09) | Tháng hiện tại (Month 2 - 2026-10) | Xu hướng (Trend) |
|---|:---:|:---:|:---:|:---:|
| **Uptime hệ thống** | $\ge 99.90\%$ | 99.98% | **99.98%** | **STABLE** |
| **Độ trễ API p95** | $< 250	ext{ ms}$ | 124 ms | **122 ms** | **IMPROVING** |
| **Tỷ lệ lỗi máy chủ (5xx)** | $< 0.05\%$ | 0.00% | **0.00%** | **STABLE** |
| **Sự cố P0 / P1** | 0 / 0 | 0 / 0 | **0 / 0** | **STABLE** |
| **Người dùng tích cực (Active)** | 90.0% | 95.6% | **96.4%** | **IMPROVING** |
| **Hoàn thành quy trình (E2E)** | 92.0% | 96.8% | **97.8%** | **IMPROVING** |
| **Độ toàn vẹn dữ liệu** | 99.5% | 99.9% | **99.9%** | **STABLE** |
| **Nợ kỹ thuật tồn đọng** | 4 mục | 1 mục (TD-04) | **0 mục** | **IMPROVING** |

---

### 2. ĐÁNH GIÁ KẾT QUẢ BATCH TRƯỚC (REVIEW BATCH #01 — SECTION 4)
- **IMP-001 (Keyboard nav nhập điểm):** **SUCCESS** $ightarrow$ Thời gian nhập điểm giảm từ 4.5m xuống 2.1m/lớp, thao tác chuột giảm 94.7%.
- **IMP-002 (Lazy loading ảnh trải nghiệm 4G):** **SUCCESS** $ightarrow$ Tốc độ tải trang 4G giảm từ 3.2s xuống 1.25s, tiết kiệm 91.3% dung lượng tải ban đầu.
- **IMP-003 (Bộ test tự động GAP Analysis):** **SUCCESS** $ightarrow$ 26/26 assertions passed, zero math discrepancy.
- **Tổng kết Batch #01:** **100% SUCCESS — 0 PARTIAL — 0 NO IMPROVEMENT — 0 REGRESSION**.

---

### 3. BẢNG PHÊ DUYỆT HẠNG MỤC BATCH #02 (BATCH TABLE — SECTION 29)

| ID | Vấn đề ghi nhận (Problem) | Bằng chứng thực tế (Evidence) | Mức rủi ro | Chỉ số đo lường thành công (Success Metric) |
|---|---|---|:---:|---|
| **IMP-004** | Bộ lọc lớp/môn của GVCN bị reset khi chuyển trang hoặc F5 | 7 phản hồi từ GVCN các cơ sở (ISS-04) | **LOW** | Tỷ lệ giữ nguyên bộ lọc lớp: **100%**; số lần phải chọn lại lớp: **0 lần** |
| **IMP-005** | Selector CSS cũ dư thừa & Xung đột outline focus-visible | Kiểm toán mã nguồn định kỳ (Nợ kỹ thuật TD-04) | **LOW** | Bundle CSS giảm ~2.4KB; **100% đạt chuẩn accessibility WCAG AA** |
| **IMP-006** | Cần kiểm tra tự động 18 ma trận đề thi GK1 bảo đảm tổng điểm 10.0 | Đề xuất từ Hội đồng Khảo thí phục vụ kỳ thi Giữa HK1 | **LOW** | Thời gian thẩm định: **< 1 giây** (thay vì 4 giờ thủ công); phát hiện chính xác 100% lỗi |

---

### 4. ĐẶC TẢ CHI TIẾT TỪNG HẠNG MỤC (SECTION 23 & 26)

#### 4.1. HẠNG MỤC IMP-004 (UX Enhancement)
- **ID:** `IMP-004`
- **Problem:** Bộ lọc lớp và môn học của GVCN trong trang Cố vấn bị reset về lớp đầu tiên khi chuyển sang xem chi tiết học sinh hoặc F5.
- **Evidence:** 7 phản ánh từ GVCN phụ trách nhiều lớp tại Riverside và Central.
- **Root cause:** Component local state `useState` không đồng bộ với URL query params hoặc bộ nhớ tạm trình duyệt.
- **Affected roles:** 214 GVCN, 648 GVBM.
- **Affected modules:** Phân hệ Cố vấn học tập (`src/app/teacher/co-van-hoc-tap/`).
- **Current behavior:** Bấm chi tiết HS $\rightarrow$ Bấm Back $\rightarrow$ Bảng danh sách nhảy về lớp đầu tiên.
- **Expected behavior:** Lớp đang chọn được ghi nhớ chính xác theo phiên làm việc.
- **Proposed change:** Khởi tạo và đồng bộ `selectedClassId` với `sessionStorage` và URL query param `?classId=...`.
- **Acceptance criteria:**
  - [ ] Khi Back từ trang chi tiết HS, lớp đã chọn vẫn giữ nguyên.
  - [ ] Khi F5 refresh, lớp không bị nhảy về lớp đầu.
  - [ ] Zero database change, zero API contract change, zero RBAC change.
- **Impact Check (Section 26):**
  - Database: **NO** | API: **NO** | RBAC: **NO** | Business Logic: **NO** | UI: **YES (Minimal)** | Dashboard: **NO** | Export: **NO**
- **Regression scope:** Màn hình Cố vấn học sinh, Bảng danh sách học sinh theo lớp.
- **Rollback plan:** Revert commit trong < 2 phút (`git revert HEAD`).
- **Success metric:**
  - *Before:* Tỷ lệ giữ nguyên bộ lọc = 0%.
  - *Expected:* Tỷ lệ giữ nguyên bộ lọc = 100%.

#### 4.2. HẠNG MỤC IMP-005 (Technical Hardening)
- **ID:** `IMP-005`
- **Problem:** Tệp styles chứa rule `*:focus-visible` phủ định `outline: none !important` xung đột với chuẩn accessibility bàn phím và là nợ kỹ thuật TD-04.
- **Evidence:** Sổ nợ kỹ thuật TD-04 từ đợt kiểm toán Production Readiness.
- **Root cause:** Mã CSS prototype cũ chưa được chuẩn hóa theo SSM Design System.
- **Affected roles:** Toàn bộ người dùng sử dụng bàn phím để điều hướng.
- **Affected modules:** Toàn hệ thống giao diện (`src/app/globals.css`).
- **Current behavior:** Thiếu viền tiêu cự chuẩn trên một số thành phần tương tác.
- **Expected behavior:** Đường viền focus-visible xanh ngọc 2px màu `#08AAA4` rõ nét, chuẩn WCAG AA.
- **Proposed change:** Chuẩn hóa CSS focus-visible, xóa bỏ 14 selector dead code.
- **Acceptance criteria:**
  - [ ] 100% nút bấm, input, liên kết hiển thị viền tiêu cự chuẩn khi bấm Tab.
  - [ ] Không xô lệch bất kỳ layout nào của hệ thống.
- **Impact Check (Section 26):**
  - Database: **NO** | API: **NO** | RBAC: **NO** | Business Logic: **NO** | UI: **YES (Style cleanup)** | Dashboard: **NO** | Export: **NO**
- **Regression scope:** Header, Sidebar, Navigation, Card containers.
- **Rollback plan:** Revert commit trong < 2 phút.
- **Success metric:**
  - *Before:* Xung đột focus-visible; nợ kỹ thuật TD-04 tồn đọng.
  - *Expected:* 100% đạt chuẩn WCAG AA; xóa bỏ hoàn toàn nợ TD-04.

#### 4.3. HẠNG MỤC IMP-006 (QA & Quality Hardening)
- **ID:** `IMP-006`
- **Problem:** Thẩm định thủ công 18 ma trận đề thi Giữa kỳ 1 tốn 4 giờ làm việc và có nguy cơ bỏ sót trường hợp ma trận không đủ 10.0 điểm.
- **Evidence:** Yêu cầu từ Hội đồng Khảo thí & Đảm bảo chất lượng trước kỳ thi GK1.
- **Root cause:** Thiếu automated test suite kiểm tra ràng buộc ma trận đề thi.
- **Affected roles:** Hội đồng Khảo thí, Tổ trưởng chuyên môn, Ban Giám hiệu.
- **Affected modules:** Phân hệ Khảo thí & Phân tích chất lượng (`tests/batch02_matrix_validation.test.ts`).
- **Current behavior:** Kiểm tra thủ công từng ma trận.
- **Expected behavior:** Suite kiểm thử tự động kiểm tra tính hợp lệ trong vài giây.
- **Proposed change:** Viết suite test tự động kiểm thử `validateExamMatrix` với các kịch bản tổng điểm 10.0, cảnh báo thiếu câu trong kho và tỷ lệ 4 mức tư duy.
- **Acceptance criteria:**
  - [ ] Bộ test chạy 100% màu xanh trong < 5 giây.
  - [ ] Bắt lỗi chính xác mọi trường hợp ma trận có tổng điểm $
e 10.0$.
- **Impact Check (Section 26):**
  - Database: **NO** | API: **NO** | RBAC: **NO** | Business Logic: **NO** | UI: **NO** | Dashboard: **NO** | Export: **NO**
- **Regression scope:** Service ma trận đề thi (`examMatrixService.ts`).
- **Rollback plan:** Xóa bỏ file test nếu có xung đột.
- **Success metric:**
  - *Before:* Kiểm tra thủ công ~4 giờ.
  - *Expected:* Thời gian kiểm tra < 5 giây; độ chính xác 100%.

---

### 5. CÁC HẠNG MỤC KHÔNG ĐƯA VÀO BATCH #02 (EXCLUDED ITEMS — SECTION 30)

| Vấn đề ghi nhận | Lý do không đưa vào Batch #02 | Điểm đến phân luồng (Destination) |
|---|---|:---:|
| **Tập huấn bảo mật tâm lý học sinh (ISS-07)** | Vấn đề nhận thức quy trình nghiệp vụ của GVCN, không phải lỗi kỹ thuật | **Training / Process** (Ban Giám hiệu ban hành văn bản quy chế) |
| **Đề xuất tính năng Chat nội bộ (ISS-08)** | Nằm ngoài tôn chỉ quản lý chất lượng giáo dục cốt lõi của SSM | **Closed** (Không đưa vào roadmap phát triển) |
| **Mẫu xuất file Excel chuẩn Bộ GD&ĐT (ISS-10)** | Cần chuẩn hóa sau khi có dữ liệu thi GK1 thực tế | **Next Month** (Xem xét đưa vào Batch #03 Tháng 11/2026) |
| **Badge nhắc nhở hạn chốt điểm (ISS-11)** | Đang trong giai đoạn thiết kế và lấy ý kiến người dùng | **Observe / Next Month** (Chuyển sang chu kỳ tiếp theo) |

---

### 6. KHÓA CỨNG PHẠM VI (SCOPE FREEZE DECLARATION — SECTION 31)

> **BATCH #02 SCOPE: FROZEN**  
> Số lượng hạng mục được duyệt: **ĐÚNG 3 MỤC (IMP-004, IMP-005, IMP-006)**.  
> Tuyệt đối không bổ sung thêm bất kỳ tính năng hay refactor nào ngoài phạm vi trên.  
> Toàn bộ 3 hạng mục đều đạt tiêu chí **RỦI RO THẤP (LOW RISK)**, không chạm vào CSDL hay backend routing.
