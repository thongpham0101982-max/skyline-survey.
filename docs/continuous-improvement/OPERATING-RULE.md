# SSM — POST-PHASE 17 OPERATING RULE
## NGUYÊN TẮC BẤT BIẾN: STABLE BY DEFAULT — CHANGE BY EVIDENCE

**Hệ thống:** Sky-Line Educational Quality Management System (SSM)  
**Tình trạng áp dụng:** BẮT BUỘC & VĨNH VIỄN  
**Ngày ban hành:** 2026-09-20  

---

## 1. LỆNH ĐÓNG BĂNG GIAI ĐOẠN (NO PHASE 18 BY DEFAULT)
Sau khi hoàn thành Phase 17:
- **TUYỆT ĐỐI KHÔNG TẠO PHASE 18 HOẶC WAVE MỚI THEO MẶC ĐỊNH.**
- Hệ thống chính thức bước vào trạng thái **Vận hành Ổn định Dài hạn**.
- Chuyển giao hoàn toàn sang mô hình:
  - **HÀNG THÁNG (MONTHLY):** Gói cải tiến nhỏ (Small Improvement Batch), có bằng chứng thực tế.
  - **HÀNG QUÝ (QUARTERLY):** Rà soát chiến lược toàn diện (Strategic Review) & Quyết định thay đổi lớn.

---

## 2. NGUYÊN TẮC CỐT LÕI: STABLE BY DEFAULT, CHANGE BY EVIDENCE
```text
HỆ THỐNG ĐÃ ỔN ĐỊNH THÌ MẶC ĐỊNH GIỮ ỔN ĐỊNH
```
Chỉ thực hiện thay đổi khi thỏa mãn đồng thời 6 điều kiện:
1. **Có vấn đề thật (Real Problem):** Phản ánh từ người dùng hoặc hệ thống đo kiểm.
2. **Có bằng chứng định lượng (Evidence):** Không thay đổi chỉ vì *"có thể tối ưu thêm"*.
3. **Có phạm vi rõ ràng (Clear Scope):** Tập trung, không lan man sang các module khác.
4. **Có tiêu chí hoàn thành (Acceptance Criteria):** Xác định trước khi viết code.
5. **Có kế hoạch kiểm thử hồi quy (Regression Plan):** Đảm bảo an toàn cho 5 cơ sở.
6. **Có phương pháp đo lường kết quả (Measurable Before/After):** Chứng minh hiệu quả sau phát hành.

---

## 3. CẤM NÂNG CẤP VÀ REFACTOR TIỆN TAY (NO OPPORTUNISTIC REFACTOR)
- Trong quá trình sửa lỗi hoặc tối ưu hóa một tác vụ được phê duyệt, nếu phát hiện cơ hội refactor hoặc vấn đề ở module khác:
  - **TUYỆT ĐỐI KHÔNG SỬA LUÔN.**
  - **Quy trình bắt buộc:** `Document → Classify → Estimate impact → Add to backlog → STOP`.
  - Đưa vào Technical Debt Register hoặc Backlog tương ứng để xem xét trong chu kỳ tiếp theo.

---

## 4. BẢO VỆ COMPONENT DÙNG CHUNG & DESIGN SYSTEM
- Sau Baseline v1.0, nghiêm cấm tạo các component biến thể tự phát như `ButtonV2`, `TableNew`, `NewDrawer`, `ModernCard`, `BetterModal`.
- Mọi nhu cầu giao diện mới phải:
  - Tái sử dụng component hiện có trong `src/components/ui/`.
  - Mở rộng thông qua props/variants an toàn hoặc module-specific wrapper.
  - Không phá vỡ CSS Variables và Spacing Tokens của SSM Design System.

---

## 5. BẢO TỒN NGUỒN SỰ THẬT DUY NHẤT (ONE SOURCE OF TRUTH)
Các gói cải tiến hàng tháng tuyệt đối không được:
- Tạo bảng dữ liệu hoặc nguồn tính toán trùng lặp.
- Tự chế công thức GAP mới ngoài mô hình đã đóng băng.
- Tạo danh mục môn học unmapped.
- Làm sai lệch hợp đồng dữ liệu giữa phân hệ nguồn và Dashboard Ban Giám đốc.

---

## 6. QUY CHUẨN CẤU TRÚC HỒ SƠ VẬN HÀNH

### Cấu trúc thư mục Tháng (`YYYY-MM/`):
```text
YYYY-MM/
├── 00-INPUT-SUMMARY.md
├── 01-PRIORITY.md
├── 02-APPROVED-BATCH.md
├── 03-IMPLEMENTATION.md
├── 04-QA-RESULT.md
├── 05-RELEASE.md
└── 06-POST-RELEASE-MEASUREMENT.md
```

### Cấu trúc thư mục Quý (`YYYY-QX/`):
```text
YYYY-QX/
├── 00-EXECUTIVE-REVIEW.md
├── 01-SYSTEM-HEALTH.md
├── 02-ADOPTION.md
├── 03-DATA-QUALITY.md
├── 04-SECURITY.md
├── 05-PERFORMANCE.md
├── 06-TECHNICAL-DEBT.md
├── 07-UX-DESIGN-SYSTEM.md
└── 08-NEXT-QUARTER-DECISIONS.md
```

---

## 7. CHỈ THỊ DỪNG DÀNH CHO TRỢ LÝ AI (ANTIGRAVITY STOP RULE)
Antigravity phải **DỪNG LẠI NGAY LẬP TỨC** khi:
- Mục tiêu của batch đã hoàn thành.
- Acceptance criteria đã đạt.
- Test hồi quy và build đã pass.
- Bản phát hành đã được kiểm chứng.

Nghiêm cấm tự ý tiếp tục:
- *"Nhân tiện refactor mã nguồn..."*
- *"Nhân tiện nâng cấp kiến trúc..."*
- *"Nhân tiện thiết kế lại giao diện..."*
- *"Nhân tiện dọn dẹp API..."*
Mọi hành vi vượt phạm vi phê duyệt đều bị coi là vi phạm nghiêm trọng quy chế vận hành sản xuất của Hệ thống Giáo dục Sky-Line.
