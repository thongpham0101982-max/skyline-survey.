# 21. OPERATIONS RUNBOOK & SYSTEM MAINTENANCE MANUAL

---

## 1. BẢNG TRA CỨU CÁC LỆNH VẬN HÀNH THƯỜNG NHẬT (DAY-2 OPERATIONS)

### A. Kiểm tra nhanh tình trạng hệ thống
```bash
# Kiểm tra liveness probe
curl -i https://ssm.skyline.edu.vn/api/health

# Kiểm tra readiness probe và kết nối CSDL
curl -i https://ssm.skyline.edu.vn/api/ready
```

### B. Kiểm tra và đồng bộ Prisma Client
```bash
# Tạo Prisma Client mới nhất tương thích LibSQL
npx prisma generate
```

### C. Quản lý tài khoản & Khóa quyền khẩn cấp
- Trong trường hợp nghi ngờ tài khoản bị lộ thông tin:
  1. Đăng nhập trang quản trị hệ thống với quyền `SUPER_ADMIN`.
  2. Truy cập module **Quản trị người dùng** -> Tìm kiếm mã người dùng.
  3. Chọn hành động: **Thu hồi phiên đăng nhập ngay lập tức (Force Revoke Session)** và **Khóa tài khoản tạm thời**.

---

## 2. BẢO TRÌ ĐỊNH KỲ NĂM HỌC
- **Đóng niên khóa cũ:** Kích hoạt tính năng "Archive Academic Year" chuyển dữ liệu năm học cũ về trạng thái `READ_ONLY`.
- **Khởi tạo niên khóa mới:** Thiết lập cấu hình năm học, phân công lớp chủ nhiệm và danh sách môn học cho 5 cơ sở trường trước ngày 15 tháng 8 hàng năm.
