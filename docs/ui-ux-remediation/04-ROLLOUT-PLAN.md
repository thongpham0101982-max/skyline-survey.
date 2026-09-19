# SSM REMAINING MODULES ROLLOUT PLAN (PHASE 4)
**Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM)**  
**Kế hoạch Triển khai Nhân rộng:** Thứ tự Rollout, Kế hoạch Tích hợp & Kiểm soát Rủi ro  
**Trạng thái Thực hiện:** PLANNING ONLY (READ-ONLY)

---

## 1. NGUYÊN TẮC PHÂN LÀN VÀ THỨ TỰ ROLLOUT (WAVE STRATEGY)

Sau khi nghiệm thu thành công Phân hệ Pilot (Dự giờ), các phân hệ còn lại của SSM sẽ được nâng cấp theo **5 Đợt (Waves)** kế tiếp nhau dựa trên mức độ ưu tiên nghiệp vụ và mức độ phụ thuộc linh kiện:

```
[ WAVE 1 ] Hồ sơ Học sinh Toàn diện (Triệt tiêu 4.8k dòng code trùng lặp)
    │
    ▼
[ WAVE 2 ] Cố vấn Học tập & Can thiệp SOS (3-Pane Workspace & Triage Board)
    │
    ▼
[ WAVE 3 ] Dashboards Quản trị & Bàn làm việc Tác nghiệp Giáo viên
    │
    ▼
[ WAVE 4 ] Sổ điểm & Đánh giá Định kỳ (Excel-like Keyboard Navigation)
    │
    ▼
[ WAVE 5 ] Tuyển sinh Khảo sát, Ngân hàng Đề thi & Quản trị Hệ thống
```

---

## 2. MA TRẬN KẾ HOẠCH CHI TIẾT TỪNG ĐỢT ROLLOUT

### ĐỢT 1 (WAVE 1): HỒ SƠ HỌC SINH TOÀN DIỆN (STUDENT 360°)
- **Trọng tâm kỹ thuật:** Hợp nhất 2 file `admin/ho-so-hoc-sinh/client.tsx` (2,577 dòng) và `teacher/ho-so-hoc-sinh/page.tsx` (2,283 dòng) vào 1 component dùng chung duy nhất: `@/components/students/StudentProfileMasterView.tsx`.
- **Nội dung xử lý:**
  1. Thay thế thanh 9 tabs bằng `SmartTabs` chống vỡ dòng.
  2. Bật tính năng Lazy Loading cho 8 tabs chuyên sâu (chỉ tải tab Tổng quan ban đầu).
  3. Bổ sung đường đối chuẩn Trung bình Khối (Benchmark) trên biểu đồ Radar Năng lực.
  4. Chuẩn hóa CSS in ấn `@media print` cho bản in A4 gửi phụ huynh.
- **Tác động:** Giảm ngay hơn **3,500 dòng code dư thừa**, tăng tốc độ mở hồ sơ học sinh lên gấp 3 lần.

### ĐỢT 2 (WAVE 2): CỐ VẤN HỌC TẬP & CAN THIỆP HỌC ĐƯỜNG
- **Trọng tâm kỹ thuật:** Phân rã monolith `teacher/co-van-hoc-tap/page.tsx` (4,365 dòng) thành 5 sub-components chuyên trách theo mô hình **3-Pane Workspace**.
- **Nội dung xử lý:**
  1. Thiết lập bảng cảnh báo `High-Priority SOS Triage Board` nổi bật trên đầu trang.
  2. Tích hợp Auto-save LocalStorage cho form biên bản phỏng vấn 1-1.
  3. Xây dựng Drawer trượt cạnh phải `StudentQuickContext` tra cứu điểm số tức thì.
  4. Chuyển đổi bộ chọn đợt cố vấn thành thanh `Horizontal Sprint Timeline Bar`.
- **Tác động:** Bảo vệ dữ liệu phỏng vấn an toàn 100%, chấm dứt nguy cơ bỏ sót học sinh SOS.

### ĐỢT 3 (WAVE 3): DASHBOARDS QUẢN TRỊ VÀ BÀN LÀM VIỆC TÁC NGHIỆP
- **Trọng tâm kỹ thuật:** Nâng cấp `admin/page.tsx` (1,095 dòng) và `teacher/page.tsx` (652 dòng).
- **Nội dung xử lý:**
  1. Loại bỏ bộ chọn năm học trùng lặp trong body Admin Dashboard, đồng bộ hóa với Header.
  2. Chuẩn hóa màu sắc thẻ KPI theo Sky-Line Semantic Colors.
  3. Bổ sung Segmented Campus Control cho Ban giám hiệu chuyển đổi giữa 4 cơ sở trường học.
  4. Viết lại Teacher Dashboard thành **Bàn làm việc Tác nghiệp (Daily Workbench)** với widget Thời khóa biểu thời gian thực và Hàng đợi việc cần xử lý gấp (Action Items Queue).
- **Tác động:** Biến Dashboard thành công cụ tác nghiệp thực chất hàng ngày của giáo viên và lãnh đạo.

### ĐỢT 4 (WAVE 4): SỔ ĐIỂM & ĐÁNH GIÁ ĐỊNH KỲ
- **Trọng tâm kỹ thuật:** Tối ưu hóa bảng nhập điểm trong `teacher/so-diem/` và `admin/bang-diem/`.
- **Nội dung xử lý:**
  1. Tích hợp cơ chế điều hướng bằng bàn phím giống Excel (`Excel-like Keyboard Navigation`: Mũi tên lên/xuống/trái/phải, phím Tab, Enter để nhảy ô).
  2. Thay thế các hộp thoại alert trình duyệt bằng thông báo lỗi Inline trực tiếp tại ô điểm nhập sai (ví dụ điểm > 10).
  3. Cố định cột STT, Mã HS và Họ tên học sinh khi cuộn ngang xem danh sách nhiều cột điểm.
- **Tác động:** Tăng 50% tốc độ vào điểm của giáo viên cuối mỗi học kỳ.

### ĐỢT 5 (WAVE 5): CÁC PHÂN HỆ PHỤ TRỢ CÒN LẠI
- **Trọng tâm kỹ thuật:** Khảo sát đầu vào tuyển sinh, Ngân hàng đề thi, Quản trị phân quyền.
- **Nội dung xử lý:**
  1. Tối ưu hóa form chấm phỏng vấn trên iPad/Tablet cho giáo khảo khảo sát đầu vào.
  2. Tích hợp Split-screen Live Preview cho công thức KaTeX trong Ngân hàng đề thi.
  3. Tinh gọn ma trận phân quyền RBAC thành dạng nhóm chức năng có ô tìm kiếm.
- **Tác động:** Hoàn thiện 100% diện mạo đồng nhất cho toàn bộ hệ sinh thái phần mềm Sky-Line.

---

## 3. CƠ CHẾ KIỂM SOÁT RỦI RO VÀ TƯƠNG THÍCH NGƯỢC (SAFEGUARD STRATEGY)

Để đảm bảo quá trình chuyển đổi không gây ảnh hưởng đến vận hành của nhà trường, 3 biện pháp an toàn bắt buộc phải áp dụng:
1. **Feature Flags / Parallel Components:** Các component mới được xây dựng độc lập song song với component cũ. Chỉ trỏ route chính sang component mới sau khi đã vượt qua vòng QA nội bộ.
2. **Zero-Database-Touch Guarantee:** Tuyệt đối không thực hiện bất kỳ lệnh `prisma migrate`, sửa chữa bảng hay cập nhật schema cơ sở dữ liệu.
3. **Rollback Plan Sẵn sàng:** Mỗi đợt nâng cấp đều được gắn thẻ Git Tag rõ ràng. Nếu phát sinh sự cố đột xuất trong giờ dạy học, hệ thống có thể hoàn tác ngay lập tức trong vòng 60 giây.
