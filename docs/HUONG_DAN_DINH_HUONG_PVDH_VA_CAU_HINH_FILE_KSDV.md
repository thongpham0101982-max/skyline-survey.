# Hướng dẫn Cấu hình & Vận hành Phiếu Phỏng vấn Định hướng HS–PHHS (Khối 1–12) và Cấu hình File Điểm Khảo sát Đầu vào

> **Lưu ý nghiệp vụ cốt lõi:**
> - Bộ 5 mẫu `PVDH-01` đến `PVDH-05` là **mẫu đề xuất phục vụ triển khai** trên SSM, giữ nguyên nội dung, thứ tự và nhóm đối tượng từ bộ *Phiếu phỏng vấn định hướng HS & PHHS Khối 1–12* (không gọi là biểu mẫu đã ban hành).
> - Phỏng vấn định hướng là **ghi nhận định tính**, **không quy đổi thành điểm số**, **không xếp loại đạt/trượt**, **không tự quyết định tiếp nhận**, và **không thay thế khảo sát 16 tiêu chí Khối 1 (`TCI`)**.
> - Kết quả các môn khảo sát tách biệt rõ 6 trạng thái: `Chưa nhập kết quả`, `Không làm`, `Không áp dụng`, `Được miễn`, `Không đạt`, `Đạt` (không biến ô trống thành `0` điểm hoặc `Không đạt`).

---

## 1. Quản trị Cấu hình File Điểm Khảo sát Đầu vào (`/admin/cau-hinh-file-diem-ksdv`)

Màn hình **Cấu hình file điểm khảo sát đầu vào** được tổ chức thành **4 tab nghiệp vụ** ngay dưới thanh tiêu đề chính:

### 1.1. Tab 1 — Mẫu định hướng HS và PHHS (`PVDH-01..05`)
Quản lý 5 mẫu đề xuất đã được khởi tạo sẵn:
- **`PVDH-01`**: Khối 1 (6 nhóm trao đổi HS, 4 trường ghi nhận GV, 5 nhóm trao đổi PHHS, Mục V định hướng & bàn giao; có ghi chú tách biệt khỏi 16 tiêu chí TCI).
- **`PVDH-02`**: Khối 2 và Khối 3.
- **`PVDH-03`**: Khối 4 và Khối 5.
- **`PVDH-04`**: Khối 6 đến Khối 9 (câu chuyển cấp hỗ trợ điều kiện nhấn mạnh định hướng sau THCS đối với Khối 9, giữ câu sở thích chung cho Khối 6–8).
- **`PVDH-05`**: Khối 10 đến Khối 12.

**Thao tác quản trị phiên bản:**
1. **Chỉnh nhãn / câu hỏi gợi mở / hướng dẫn / giới hạn ký tự / bắt buộc khi hoàn tất**: Chỉ sửa trực tiếp trên phiên bản `Nháp` hoặc phiên bản chưa có phiếu chốt.
2. **Tạo phiên bản mới (`v2.0`, `v3.0`...)**: Khi phiên bản đang dùng đã có hồ sơ hoàn tất/xác nhận, bấm **Tạo phiên bản mới** để chỉnh sửa và phát hành. Các phiếu đã khóa ở phiên bản cũ giữ nguyên bất biến.
3. **Nhân bản & Ngừng áp dụng**: Hỗ trợ tạo mẫu riêng cho hệ/chương trình hoặc cơ sở với **Thứ tự ưu tiên** tường minh. Hệ thống tự động chặn phát hành nếu hai mẫu trùng phạm vi (Khối + Hệ + Cơ sở + Thời gian) và cùng mức ưu tiên. Không cho xóa mẫu đã có hồ sơ tham chiếu.

### 1.2. Tab 2 — Mẫu kết quả môn khảo sát
- Phân biệt rõ **Môn khảo sát có điểm** (`Toán`, `Tiếng Việt`, `Ngữ văn`, `Tiếng Anh viết`, `EPT`...), **Đánh giá theo tiêu chí** (`TCI` — 16 tiêu chí Khối 1), và **Nội dung phỏng vấn định hướng** (`PDHDV`).
- Khi chọn `PDHDV`, hệ thống hiển thị cấu trúc định tính của mẫu `PVDH-01..05` theo khối đang chọn, không ép thành bảng cột điểm số.

### 1.3. Tab 3 — Mapping dữ liệu và mẫu file xuất
Quản lý cấu hình 3 lớp (**Schema dữ liệu** • **Quy tắc áp dụng** • **Mẫu xuất HTML/PDF/XLSX/DOCX**):
- Khai báo mapping từ biến nguồn hợp lệ (`student.*`, `period.*`, `score.*`, `tci.*`, `pvdh.*`) sang ô Excel (`Sheet!Cell`) hoặc placeholder biểu mẫu (`{{student_code}}`).
- Trình kiểm tra trực tiếp chặn các lỗi trước khi phát hành: trùng đích xuất, sai cú pháp ô Excel, thiếu trường bắt buộc, gán nhầm trường tổng điểm cho phiếu định hướng/TCI, công thức không an toàn, hoặc mẫu Rubric chưa được tích xác nhận tài liệu nguồn (`sourceVerified = false`).

### 1.4. Tab 4 — Phạm vi áp dụng và phiên bản
Bảng sổ cái tra cứu tập trung toàn bộ mẫu định hướng, mẫu kết quả môn và mẫu xuất file kèm phạm vi khối, hệ, cơ sở, hiệu lực thời gian, độ ưu tiên và phiên bản hiện hành.

---

## 2. Phân công Giáo viên & Quyền Truy cập

1. **Phân công theo đợt/môn nội dung**: Phân công giáo viên thực hiện nội dung `Phiếu định hướng đầu vào (PDHDV)` tại màn hình Quản lý & Phân công khảo sát đầu vào.
2. **Phân công tách riêng người phỏng vấn HS và người trao đổi PHHS**: Trên từng hồ sơ định hướng, người điều phối/kiểm tra có thể gán riêng tài khoản phỏng vấn học sinh (Mục II–III) và tài khoản trao đổi PHHS (Mục IV). Mỗi giáo viên chỉ sửa phần mình phụ trách, hệ thống lưu riêng người nhập và thời điểm nhập của từng phần mà không ghi đè nhau.
3. **Kiểm soát quyền dữ liệu nhạy cảm**:
   - Giáo viên chỉ truy cập được học sinh thuộc phân công của mình.
   - Cán bộ xét duyệt/điều phối cơ sở chỉ truy cập hồ sơ thuộc cơ sở mình phụ trách.
   - Tài khoản PHHS không được đọc ghi chú nội bộ hoặc nhận xét thô chưa công bố.

---

## 3. Nhập Phiếu, Kiểm tra, Trả lại Bổ sung & Khóa Phiếu

### 3.1. Dành cho Giáo viên được phân công (`/teacher/input-assessments`)
1. Chọn đợt khảo sát và nội dung **Phiếu định hướng đầu vào (`PDHDV`)**.
2. Tại dòng học sinh, bấm **Nhập định hướng** để mở đúng mẫu `PVDH-01..05` theo khối dự kiến tiếp nhận:
   - **I. Thông tin chung**: Tự động đồng bộ từ hồ sơ gốc (chỉ đọc; có liên kết sang nơi cập nhật chính thức nếu cần sửa thông tin gốc). Nhập thông tin người đại diện PHHS, kênh trao đổi và ngày phỏng vấn.
   - **II. Trao đổi với học sinh**: Nhập nội dung chia sẻ thực tế cho 6 nhóm câu hỏi gợi mở, hoặc tích **Chưa ghi nhận** và nhập rõ lý do (hệ thống không tự điền nội dung mẫu vào kết quả thực tế).
   - **III. Ghi nhận của giáo viên**: Nhập riêng 4 trường mô tả (*Điểm mạnh/sở thích*, *Cách giao tiếp*, *Mức độ tham gia*, *Nhu cầu hỗ trợ*).
   - **IV. Trao đổi với PHHS**: Nhập 5 nhóm nội dung trao đổi với gia đình (hoặc chọn *Chưa ghi nhận* kèm lý do).
   - **V. Thống nhất định hướng & hỗ trợ**:
     - Lựa chọn **Không** và các nội dung cần tìm hiểu thêm (*Học tập*, *Tiếng Anh*, *Thích nghi*, *Trao đổi bộ phận tâm lý theo đề nghị*, *Khác*) loại trừ lẫn nhau.
     - Khi chọn nội dung tìm hiểu thêm, bắt buộc nhập **Lý do đề nghị** và **Người/bộ phận tiếp nhận**.
     - **Mốc trao đổi lại** chỉ bắt buộc khi có hành động tiếp nối hoặc phối hợp.
     - Bảng hành động chi tiết tự động tổng hợp sang mục tiêu/hành động trên phiếu gốc để giáo viên không phải nhập lặp.
3. Bấm **Lưu nháp** (cho phép còn thiếu thông tin) hoặc **Hoàn tất phần được phân công** (nếu thiếu mục bắt buộc, hệ thống hiển thị danh sách lỗi và tự cuộn tới đúng trường cần bổ sung).
4. Nếu hai người cùng mở sửa một hồ sơ, cơ chế `lockVersion` sẽ cảnh báo xung đột để tải lại trước khi lưu, tránh mất dữ liệu.

### 3.2. Dành cho Người kiểm tra / Xét duyệt (`/admin/xet-duyet-ket-qua`, `/admin/ket-qua-khao-sat`)
- Mở phiếu qua nút **Nhập / Kiểm tra phiếu PVDH** hoặc biểu tượng định hướng trên bảng kết quả.
- **Trả lại bổ sung**: Nhập lý do cần bổ sung; phiếu chuyển sang trạng thái `Trả lại bổ sung` để giáo viên cập nhật.
- **Xác nhận & khóa phiếu**: Chốt dữ liệu và lưu bản chụp bất biến. Nếu đính kèm ảnh chữ ký giáo viên/cán bộ (không có chứng thư số CA), hệ thống ghi đúng nhãn **“Ký xác nhận bằng ảnh chữ ký”**.
- **Mở khóa lại phiếu đã xác nhận**: Chỉ dành cho vai trò có thẩm quyền, bắt buộc nhập lý do mở khóa, ghi nhận bản chụp trước/sau trong lịch sử kiểm toán và tự động vô hiệu hóa xác nhận cũ cho đến khi xác nhận lại.
- **Đổi khối dự kiến**: Nếu hồ sơ học sinh đổi khối sang nhóm mẫu khác (ví dụ Khối 5 sang Khối 6), hệ thống hiển thị cảnh báo lệch mẫu và cho phép chuyển mẫu có kiểm soát (giữ nguyên các câu trả lời cùng mã trường).

---

## 4. Xem trước, Xuất PDF A4, ZIP Hàng loạt & Excel Tổng hợp

- **Xem trước & Tải PDF cá nhân**: Trong form định hướng (tab **Xem trước phiếu**), bảng giáo viên hoặc tab Hồ sơ học sinh, bấm **Xem trước phiếu** hoặc **Tải PDF**.
  - Phiếu chưa xác nhận luôn đóng dấu mờ **“BẢN NHÁP – CHƯA XÁC NHẬN”**.
  - Bố cục chuẩn A4 dọc (2 phần trang rõ ràng, tự ngắt trang khi nội dung dài, hiển thị hộp kiểm `☑`/`☐` và 3 cột chữ ký cuối phiếu).
  - Tên file PDF chỉ chứa mã mẫu, mã hồ sơ, đợt và phiên bản (không chứa SĐT hay thông tin sức khỏe nhạy cảm).
- **Xuất hàng loạt (`/admin/ket-qua-khao-sat`)**:
  - **Xuất PDF định hướng (`.zip`)**: Kết xuất gói ZIP gồm các file PDF riêng theo danh sách hồ sơ được chọn/lọc trong phạm vi quyền.
  - **Xuất Excel tổng hợp định hướng (`.xlsx`)**: Xuất bảng tổng hợp trạng thái và nội dung định hướng đã qua lớp làm sạch chống Formula Injection (`=`, `+`, `-`, `@`).

---

## 5. Bàn giao cho Giáo viên Chủ nhiệm (GVCN) sau Nhập học

1. Sau khi phiếu định hướng đã ở trạng thái **Đã xác nhận & khóa** và học sinh đã được xếp lớp nhập học chính thức, cán bộ điều phối/kiểm tra bấm **Bàn giao GVCN** ngay trên phiếu định hướng (có tùy chọn bao gồm hoặc ẩn ghi chú nội bộ nhạy cảm).
2. **GVCN tiếp nhận**: Tại màn hình `/teacher/input-assessments` hoặc `/teacher/ho-so-hoc-sinh` (`/admin/ho-so-hoc-sinh`), GVCN bấm nút **Bàn giao định hướng (GVCN)** ở thanh công cụ để xem danh sách học sinh lớp mình chủ nhiệm đã được bàn giao, đọc phiếu định hướng A4 và bấm **Xác nhận đã đọc & tiếp nhận**.
