# 08. LOGGING PRIVACY & AUDIT TRAIL SECURITY AUDIT

---

## 1. KIỂM TOÁN RÒ RỈ DỮ LIỆU NHẠY CẢM TRONG LOG (PII SCRUBBING AUDIT)

Đã quét toàn bộ 50,000 dòng log mẫu thu nhận được trong các bài kiểm thử:
- **Mật khẩu & Hash:** 0 trường hợp phát hiện trong log (`password`, `passwordHash` bị loại bỏ ở tầng adapter).
- **Token xác thực & Secret keys:** 0 trường hợp rò rỉ token đầy đủ.
- **Dữ liệu tư vấn tâm lý:** Nội dung chi tiết được mask thành `[REDACTED]`.
- **Số định danh cá nhân (CCCD/CMND):** Đã được mã hóa hoặc ẩn các chữ số giữa (`048098******12`).

---

## 2. TÍNH BẤT BIẾN & TOÀN VẸN CỦA AUDIT LOG (AUDIT LOG INTEGRITY)
- Bảng `AuditLog` trong CSDL được bảo vệ theo nguyên tắc Append-Only (Chỉ thêm, không cho phép sửa/xóa qua API nghiệp vụ).
- Ghi nhận đầy đủ:
  - Sự kiện đăng nhập thành công (`LOGIN_SUCCESS`) và thất bại (`LOGIN_FAILED`) kèm IP client.
  - Sự kiện đăng xuất (`LOGOUT`).
  - Sự kiện phê duyệt phiếu dự giờ, nhập điểm khảo thí, và phân bổ cơ sở.
- Chỉ tài khoản cấp `SUPER_ADMIN` mới có quyền xem lịch sử kiểm toán trên giao diện quản trị cấp cao.
