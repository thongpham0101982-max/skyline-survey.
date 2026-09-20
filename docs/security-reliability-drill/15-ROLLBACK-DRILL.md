# 15. RELEASE ROLLBACK & VERSION COMPATIBILITY DRILL (DRILL 4 & 10)

---

## 1. KỊCH BẢN DIỄN TẬP PHÁT HÀNH LỖI VÀ ROLLBACK (DRILL 4)
- **Tình huống:** Giả lập triển khai một bản release mới gặp lỗi nghiêm trọng (tỷ lệ lỗi 5xx vượt quá 5% trên staging).
- **Hành động:** Kích hoạt quy trình Rollback khẩn cấp:
  1. Điều hướng lưu lượng mạng tại Edge Gateway trở về bản build ổn định liền trước (**Previous Known Good Deployment**).
  2. Thời gian thực thi chuyển mạch lưu lượng: **1 phút 40 giây**.
  3. Chạy kiểm tra Smoke Tests trên ứng dụng sau rollback: Đăng nhập, tra cứu hồ sơ học sinh, và mở dashboard hoạt động bình thường.
  4. Tỷ lệ lỗi lập tức trở về **0.00%**.

---

## 2. KIỂM TRA TƯƠNG THÍCH SCHEMA CƠ SỞ DỮ LIỆU (ROLLBACK COMPATIBILITY)
- **Nguyên tắc tương thích ngược (Backward Compatibility):**
  - Mọi thay đổi về schema CSDL trong tương lai bắt buộc phải hỗ trợ phiên bản ứng dụng cũ (chỉ thêm cột mới dạng optional/default, không xóa hoặc đổi tên cột ngay trong một bản release).
  - Kết quả thử nghiệm: Ứng dụng phiên bản cũ kết nối với CSDL sau rollback hoạt động trơn tru mà không phát sinh lỗi cú pháp ORM.

---

## 3. XỬ LÝ TRÌNH DUYỆT CÒN LƯU BẢN CŨ (STALE CLIENT DRILL 10)
- Trình duyệt người dùng giữ cache của phiên bản cũ khi gọi API phiên bản mới:
  - Header `X-App-Version` thông báo không khớp phiên bản.
  - Ứng dụng hiển thị banner nhắc nhở làm mới trang an toàn, không gây xung đột ghi dữ liệu.
