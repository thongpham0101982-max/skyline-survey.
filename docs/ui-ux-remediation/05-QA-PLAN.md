# SSM COMPREHENSIVE QA & VERIFICATION PLAN (PHASE 5)
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Kế hoạch Kiểm định Toàn diện:** 7 Chiều Kiểm thử Đảm bảo Tiêu chuẩn Vận hành Giáo dục  
**Trạng thái Thực hiện:** PLANNING ONLY (READ-ONLY)

---

## 1. MỤC TIÊU VÀ NGUYÊN TẮC KIỂM ĐỊNH

Giai đoạn QA đóng vai trò chốt chặn cuối cùng nhằm xác minh rằng toàn bộ các cải tiến UI/UX đã giải quyết triệt để các vấn đề được nêu trong Audit, đồng thời bảo đảm hệ thống vận hành mượt mà, chính xác tuyệt đối về số liệu và an toàn về phân quyền.

Kiểm định được thực hiện toàn diện trên **7 Chiều đo lường (7 Dimensions of Quality)**:

```
+-----------------------------------------------------------------------------+
|  7 CHIỀU KIỂM THỬ CHẤT LƯỢNG (QA DIMENSIONS):                               |
|  1. Hồi quy Chức năng (Functional Regression)                                |
|  2. Tương thích Đa Màn hình & Responsive                                     |
|  3. Tiêu chuẩn Trợ năng (Accessibility - WCAG 2.1 AA)                       |
|  4. Hiệu năng Giao diện & Core Web Vitals                                    |
|  5. Trải nghiệm Phân quyền Bảo mật (Permission & RBAC UX)                   |
|  6. Tương thích Đa Trình duyệt (Cross-browser)                               |
|  7. Toàn vẹn Dữ liệu & Tính toán Chính xác (Data Accuracy)                   |
+-----------------------------------------------------------------------------+
```

---

## 2. MA TRẬN KIỂM ĐỊNH CHI TIẾT 7 CHIỀU

### Chiều 1: Hồi quy Chức năng (Functional Regression Testing)
- **Mục tiêu:** Đảm bảo toàn bộ các luồng nghiệp vụ hiện tại vẫn hoạt động chính xác 100%, không phát sinh lỗi gãy luồng.
- **Kịch bản kiểm thử trọng điểm:**
  1. Giáo viên đăng ký tiết dạy -> TTCM duyệt -> Người dự chấm 11 tiêu chí -> Ký phản hồi 2 chiều -> Đóng phiếu.
  2. Mở hồ sơ học sinh -> Chuyển qua lại giữa 9 tabs -> Xem biểu đồ Radar -> Nhấn in A4.
  3. Ghi nhận biên bản cố vấn học sinh SOS -> Bấm lưu -> Kiểm tra dữ liệu được lưu đúng vào DB.
  4. Nhập điểm vào Sổ điểm môn Toán -> Tính trung bình môn tự động -> Lưu sổ điểm.
- **Tiêu chí Đạt (Pass Criteria):** 100% test cases nghiệp vụ thực hiện trơn tru, không có lỗi 4xx/5xx từ API.

### Chiều 2: Tương thích Đa Màn hình & Responsive
- **Mục tiêu:** Loại bỏ hoàn toàn lỗi vỡ khung hình, nút bị che khuất hoặc thanh cuộn kép.
- **Thiết bị & Độ phân giải kiểm thử:**
  - Laptop giáo viên (Phổ biến nhất): `1366 x 768` và `1280 x 800`.
  - Màn hình bàn văn phòng: `1920 x 1080` (Full HD).
  - Máy tính bảng thị sát (iPad Air/Pro, Galaxy Tab): `768 x 1024` và `810 x 1080`.
  - Điện thoại di động (Kiểm tra xem nhanh): `375 x 812` (iPhone X/13/15) và `412 x 915`.
- **Tiêu chí Đạt:**
  - Không có hiện tượng nút bấm bị đẩy khỏi màn hình (Button Clipping).
  - Không xuất hiện cuộn ngang ngoài ý muốn trên toàn trang (Zero Horizontal Body Overflow).
  - Thanh 9 tabs và các bảng ma trận co giãn mượt mà.

### Chiều 3: Tiêu chuẩn Trợ năng (Accessibility - WCAG 2.1 AA)
- **Mục tiêu:** Đảm bảo độ tương phản thị giác rõ nét và khả năng điều hướng bằng bàn phím cho giáo viên lớn tuổi.
- **Tiêu chí kiểm định:**
  - **Tỷ lệ Tương phản Màu sắc (Color Contrast Ratio):** Tối thiểu `4.5:1` cho văn bản thông thường và `3:1` cho văn bản lớn / nút bấm. Chữ trên nền Navy `#002D62` và Gold `#D4AF37` phải tuyệt đối rõ ràng.
  - **Điều hướng Bàn phím (Keyboard Navigation):** Nhấn phím `Tab` để di chuyển qua lại giữa các ô form có vòng sáng Focus Ring (`focus:ring-2 focus:ring-navy-600`) rõ nét.
  - **Nhãn ARIA:** Mọi nút bấm chỉ có icon (như nút X đóng modal, nút ba chấm) đều phải có thuộc tính `aria-label`.

### Chiều 4: Hiệu năng Giao diện & Core Web Vitals
- **Mục tiêu:** Giao diện phản hồi tức thì, không gây mỏi mắt hay giật lag khi cuộn dữ liệu lớn.
- **Chỉ số đo lường (Đo trên mạng 4G / Wi-Fi trường học):**
  - **LCP (Largest Contentful Paint):** `< 2.5 giây`.
  - **CLS (Cumulative Layout Shift):** `< 0.05` (Triệt tiêu hiện tượng các khối nhảy vị trí khi load).
  - **INP (Interaction to Next Paint):** `< 150ms` (Phản hồi click chuột ngay lập tức).
  - **DOM Node Count:** Giữ dưới 1,500 nodes trên mỗi màn hình nhờ áp dụng ảo hóa (Virtualization).

### Chiều 5: Trải nghiệm Phân quyền Bảo mật (Permission & RBAC UX)
- **Mục tiêu:** Ngăn chặn tuyệt đối việc hiển thị nhầm nút bấm hoặc để lộ thông tin vượt thẩm quyền.
- **Kịch bản kiểm thử:**
  1. Đăng nhập bằng tài khoản **Giáo viên thường**: Tuyệt đối không nhìn thấy nút Duyệt lịch dự giờ của TTCM, không sửa được điểm của môn khác, không thấy mục Phê duyệt mở khóa cố vấn.
  2. Đăng nhập bằng tài khoản **Tổ trưởng chuyên môn**: Chỉ thấy dữ liệu của tổ bộ môn mình phụ trách.
  3. Đăng nhập bằng tài khoản **Giám đốc Cơ sở**: Thấy toàn cảnh cơ sở mình quản lý, không can thiệp sâu vào phân quyền kỹ thuật hệ thống.

### Chiều 6: Tương thích Đa Trình duyệt (Cross-browser)
- **Mục tiêu:** Hoạt động đồng nhất trên các trình duyệt thực tế được giáo viên và nhân viên Sky-Line sử dụng.
- **Danh sách trình duyệt kiểm thử:**
  - Google Chrome (Phiên bản mới nhất trên Windows & macOS).
  - Microsoft Edge (Mặc định trên máy tính phòng học Windows 10/11).
  - Apple Safari (Trên iPad và MacBook của BGH).
  - Mozilla Firefox.

### Chiều 7: Toàn vẹn Dữ liệu & Tính toán Chính xác (Data Accuracy)
- **Mục tiêu:** Các cải tiến về giao diện không làm sai lệch dù chỉ 0.1 điểm số học sinh hoặc xếp loại tiết dạy.
- **Tiêu chí kiểm định:**
  - Điểm tổng 11 tiêu chí K12 và xếp loại (Tốt: 36-40, Khá: 32-35.5, Đạt: 28-31.5, Chưa đạt: <28) tính toán tự động khớp 100% với công thức Bộ GD&ĐT / Sky-Line.
  - Điểm trung bình môn học và chỉ số BMI trong Hồ sơ học sinh hiển thị chính xác theo dữ liệu gốc.
  - Tính năng Auto-save LocalStorage khôi phục chính xác từng ký tự trong bản nháp khi tải lại trang.

---

## 3. DANH MỤC BIỂU MẪU NGHIỆM THU (QA SIGN-OFF CHECKLIST)

Trước khi bàn giao bất kỳ module nào sang môi trường thực tế, biên bản nghiệm thu kỹ thuật phải được đánh dấu hoàn thành đầy đủ:

```
[ ] 1. Toàn bộ 12 lỗi P0 đã được kiểm chứng giải quyết triệt để.
[ ] 2. Không phát hiện bất kỳ lỗi hồi quy chức năng (Zero Regression Bugs).
[ ] 3. Kiểm thử thành công trên độ phân giải laptop 1366x768 (Không clipping, không vỡ layout).
[ ] 4. Điểm trợ năng Lighthouse Accessibility đạt >= 95/100.
[ ] 5. Kiểm thử phân quyền RBAC thành công cho cả 6 vai trò.
[ ] 6. Xác nhận không có bất kỳ dòng code nào can thiệp DB Schema hay Backend Business Logic.
```

---

## 4. KẾT LUẬN

Bộ kế hoạch **UI/UX Remediation Plan (Giai đoạn 2)** đã hoàn tất đầy đủ 6 tài liệu, cung cấp lộ trình kỹ thuật chuẩn xác, an toàn và toàn diện để nâng cấp hệ thống SSM lên tầm vóc tiêu chuẩn chất lượng cao.
