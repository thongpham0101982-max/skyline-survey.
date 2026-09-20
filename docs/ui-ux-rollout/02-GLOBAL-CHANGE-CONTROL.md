# QUY TRÌNH KIỂM SOÁT THAY ĐỔI TOÀN CỤC (GLOBAL CHANGE CONTROL)
## Cơ chế Quản lý Rủi ro và Phòng chống Design Drift trong SSM

---

### 1. NGUYÊN TẮC THIẾT LẬP BASELINE

Kể từ sau khi hoàn thành Phase 5, toàn bộ:
* Bộ **Design Tokens** trong `src/app/globals.css`
* Thư viện **Shared Components** trong `src/components/ui/` và `src/components/layout/`
được đóng băng ở trạng thái **BASELINE LOCKED**. Mọi phân hệ từ Wave 1 đến Wave 6 đều phải kế thừa trực tiếp từ Baseline này.

---

### 2. QUY TRÌNH THAY ĐỔI DESIGN SYSTEM (DESIGN SYSTEM CHANGE REQUEST - DSCR)

Nghiêm cấm việc tự ý thay đổi mã nguồn trong `globals.css` hoặc các component dùng chung khi đang làm việc trong một Wave cụ thể. Nếu phát hiện nhu cầu cấp thiết, phải lập phiếu **DSCR** gồm các thông tin:
1. **Current Rule:** Quy tắc hiện tại đang áp dụng là gì?
2. **Proposed Change:** Nội dung đề xuất thay đổi cụ thể.
3. **Why:** Lý do kỹ thuật/nghiệp vụ không thể giải quyết bằng các token/prop hiện có.
4. **Modules Affected:** Danh sách các phân hệ bị ảnh hưởng (bao gồm cả Pilot Dự giờ và các Wave đã hoàn tất).
5. **Compatibility:** Khả năng tương thích ngược (Backward Compatibility).
6. **Risk Analysis:** Đánh giá rủi ro hồi quy.
7. **Regression Required:** Kế hoạch kiểm thử hồi quy trên các module đã release.

---

### 3. KIỂM SOÁT DESIGN DRIFT (CHỐNG LỆCH CHUẨN GIAO DIỆN)

Cuối mỗi Wave, hệ thống sẽ thực hiện quét đối soát mã nguồn nhằm phát hiện và loại bỏ các biểu hiện của Design Drift:
* [x] Phát hiện các mã màu HEX lạ nằm ngoài bảng màu chuẩn Deep Pine và Semantic Status.
* [x] Phát hiện các khoảng cách (spacing), padding, margin tùy tiện ngoài 8pt grid.
* [x] Phát hiện các thẻ HTML `<button>`, `<input>`, `<select>` trần không qua Shared Component.
* [x] Phát hiện các thẻ `Badge` hoặc `Status` tự định nghĩa style.
* [x] Phát hiện các Modal hoặc Drawer tự viết không dùng Dialog/Drawer chuẩn.

Nếu không có lý do nghiệp vụ đặc thù được phê duyệt, toàn bộ phải được quy hoạch lại về Shared Components.

---

### 4. QUẢN LÝ NỢ GIAO DIỆN (UI DEBT CONTROL)

Mỗi Wave đều duy trì một tập tin `UI-DEBT.md` nhằm ghi nhận các thành phần chưa thể dọn dẹp triệt để trong phiên làm việc:
* Các component cũ đang ở giai đoạn `Deprecated`.
* Các đoạn adapter dữ liệu tạm thời.
* Các CSS legacy đang chờ giải phóng khi toàn bộ hệ thống hoàn tất.

---

### 5. CHIẾN LƯỢC NHÁNH VÀ CAM KẾT MÃ NGUỒN (GIT DISCIPLINE)

* **Nhánh triển khai:** Mỗi Wave được triển khai trên nhánh định danh rõ ràng: `ui-rollout/<module-name>`.
* **Quy ước Commit:** Commit theo từng cụm mục tiêu rõ ràng:
  * `feat(ui-shell): chuẩn hóa PageShell và Header`
  * `feat(ui-filters): áp dụng FilterBar chuẩn`
  * `refactor(ui-table): thay thế bảng dữ liệu bằng DataTable & StatusBadge`
  * `fix(ui-responsive): tinh chỉnh responsive trên màn hình laptop 1366x768`
  * `test(qa): kiểm thử hồi quy dữ liệu và phân quyền`
* **Tuyệt đối không dùng commit chung chung kiểu "update UI" cho hàng loạt tệp tin.**\n