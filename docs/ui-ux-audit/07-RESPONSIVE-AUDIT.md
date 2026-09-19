# BÁO CÁO AUDIT UI/UX TOÀN DIỆN HỆ THỐNG SSM
## TÀI LIỆU 07: THIẾT KẾ ĐÁP ỨNG & THIẾT BỊ (RESPONSIVE & DEVICE AUDIT)

> **Mục tiêu:** Đánh giá hành vi hiển thị và tương tác trên các dải phân giải màn hình thực tế của giáo viên, cán bộ quản lý và phụ huynh Sky-Line.

---

### 1. Phân tầng Thiết bị & Ma trận Breakpoint Thực tế

| Thiết bị Thực tế | Dải phân giải (Breakpoint) | Đối tượng & Bối cảnh Sử dụng | Mức độ Ưu tiên trong SSM | Trạng thái Đáp ứng Hiện tại |
|:---|:---|:---|:---:|:---|
| **Máy tính Bàn (Desktop)** | \≥ 1440px\ | Quản trị viên, Khảo thí, Kế toán tại văn phòng | **Cao** | Tốt, không gian rộng rãi nhưng chữ bị nhỏ (\	ext-xs\) |
| **Laptop Tiêu chuẩn** | \1280px - 1439px\ | Giáo viên soạn bài, TTCM và BGH họp hội đồng | **CỰC KỲ CAO (Số 1)** | **Nhiều lỗi:** Bảng điểm 15 cột bị tràn lề, modal bị khuất chân |
| **Laptop Nhỏ / iPad ngang** | \1024px - 1279px\ | Giáo viên mang máy đi dự giờ, nhập điểm tại lớp | **CỰC KỲ CAO (Số 2)** | **Kém:** Sidebar chiếm 260px, nội dung bảng chỉ còn ~760px bị bóp nghẹt |
| **Máy tính bảng đứng (Tablet)**| \768px - 1023px\ | Giáo viên kiểm diện, chấm khảo sát đầu vào | **Trung bình** | **Kém:** Chưa có cơ chế chuyển bảng sang dạng Card view |
| **Điện thoại (Mobile)** | \< 768px\ | Tra cứu thời khóa biểu, xem thông báo, check-in | **Cao** | Khá ở trang chủ, nhưng hỏng hoàn toàn ở các trang bảng dữ liệu |

---

### 2. Các Lỗi Đáp ứng Trọng yếu Phát hiện (Critical Responsive Bugs)

#### 2.1. Ép Bảng Dữ liệu Lớn vào Màn hình Hẹp (Crammed Big Tables)
* Các trang như \dmin/ktdbcl/results\, \	eacher/so-diem-nhan-xet\, \dmin/tong-hop-du-gio\ có từ 12 đến 20 cột (Mã HS, Họ tên, Lớp, Điểm TX1, TX2, GK, CK, ĐTB, Xếp loại, Ghi chú, Thao tác,...).
* Khi xem trên màn hình Laptop 13-inch (1280x800) hoặc 14-inch (1366x768):
  * Cột bị bóp hẹp đến mức chữ bị ngắt dòng từng từ đơn lẻ (ví dụ chữ "Toán" bị ngắt thành "T" và "oán").
  * Toàn bộ thanh cuộn ngang bị ẩn dưới chân trang, giáo viên phải cuộn dọc xuống hàng thứ 45 mới thấy thanh cuộn ngang để kéo sang phải.
* *Giải pháp:* Thiết lập \	able-container\ có \overflow-x: auto\ độc lập với chiều cao cố định hoặc chuyển sang chế độ hiển thị Card View khi màn hình \< 1024px\.

#### 2.2. Modal Đánh giá Dự giờ Tràn Khung nhìn (Modal Viewport Overflow)
* Form đánh giá 11 tiêu chí K12 trong \src/app/teacher/du-gio/client.tsx\ được bọc trong một thẻ \div\ cố định có chiều cao lớn:
  * Khi mở trên laptop có thanh công cụ trình duyệt lớn hoặc độ phân giải dọc \768px\, phần chân modal (nơi đặt 2 nút tối quan trọng: *"Lưu nháp"* và *"Hoàn thành đánh giá"*) bị trôi ra ngoài màn hình.
  * Giáo viên không thể bấm Lưu nếu không bấm thu nhỏ tỷ lệ zoom trình duyệt về 80%.
* *Giải pháp:* Tách modal thành **Full-screen Evaluation Workspace** hoặc **Slide-over Drawer** với \header\ và \ooter\ cố định (\sticky\), chỉ cuộn riêng phần danh sách 11 tiêu chí ở giữa.

#### 2.3. Xung đột Thanh Điều hướng Đáy trên Di động (Bottom Nav Collision)
* \AdminMobileBottomNav\ và \TeacherMobileBottomNav\ chiếm 56px ở đáy màn hình di động (\ixed bottom-0 z-40\).
* Tuy nhiên, các trang nhập liệu lại có thanh công cụ nổi:
  \\\	sx
  <div className=\"fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] ...\">
  \\\
  Thanh tác vụ này đè trực tiếp lên 5 nút của Bottom Navigation, tạo ra vùng bấm chồng lấn (touch target overlap). Người dùng bấm nút "Lưu" thì lại bị nhảy sang trang "Khảo sát".
* *Giải pháp:* Bổ sung class kiểm tra màn hình: Khi \< md\, thanh tác vụ hàng loạt phải nâng vị trí lên \ottom-16\ để nhường khoảng trống an toàn cho Bottom Navigation.

---

### 3. Nguyên tắc Chuẩn hóa Thiết kế Đa Thiết bị cho SSM

1. **Ưu tiên Laptop Doanh nghiệp (Laptop First):**  
   Toàn bộ layout bảng dữ liệu, form chấm điểm và ma trận phải được tối ưu và kiểm thử nghiêm ngặt trên độ phân giải phổ biến nhất của giáo viên Sky-Line: **1366x768** và **1280x800**.
2. **Quy tắc Tự động Thu gọn Sidebar (Auto-Collapse at 1280px):**  
   Khi chiều rộng viewport nhỏ hơn 1280px, Sidebar tự động chuyển về dạng thu gọn (icon only) để giải phóng 200px chiều ngang quý giá cho bảng dữ liệu.
3. **Chuyển đổi Bảng sang Card trên Mobile (Adaptive Table-to-Card):**  
   Trên màn hình di động (\< 768px\), tuyệt đối không ép người dùng cuộn ngang bảng 15 cột. Mỗi hàng dữ liệu học sinh/tiết dạy phải tự động chuyển hóa thành một **thẻ tóm tắt (Compact Record Card)** hiển thị 3 thông tin chính (Tên, Lớp, Điểm TB), kèm nút mũi tên chạm để mở Drawer xem toàn bộ các cột điểm phụ.
