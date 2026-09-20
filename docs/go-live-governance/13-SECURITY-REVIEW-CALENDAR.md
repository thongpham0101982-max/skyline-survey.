# 13. SECURITY AUDIT & RBAC REVIEW CALENDAR

---

## 1. LỊCH RÀ SOÁT BẢO MẬT ĐỊNH KỲ NĂM HỌC
- **Hàng tháng:**
  - Quét lỗ hổng các gói thư viện (`npm audit`).
  - Kiểm tra log stream xác nhận không có dữ liệu nhạy cảm rò rỉ (`[REDACTED]` check).
- **Đầu mỗi học kỳ (Tháng 8 & Tháng 1):**
  - Rà soát toàn bộ tài khoản người dùng: Vô hiệu hóa tài khoản giáo viên/nhân viên đã nghỉ việc.
  - Cập nhật phân quyền kiêm nhiệm: Gỡ bỏ các quyền Tổ trưởng, Trưởng ban cũ đối với các vị trí luân chuyển.
  - Thu hồi toàn bộ phiên đăng nhập đang mở của các tài khoản quản trị cấp cao.
- **Định kỳ 6 tháng:**
  - Thay đổi khóa bí mật phiên làm việc (`NEXTAUTH_SECRET`) và token xác thực cơ sở dữ liệu (`TURSO_AUTH_TOKEN`) theo quy trình xoay vòng khóa không gián đoạn dịch vụ.
