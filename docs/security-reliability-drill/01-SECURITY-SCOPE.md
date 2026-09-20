# 01. SECURITY SCOPE & THREAT MODELING

---

## 1. PHẠM VI KIỂM TOÁN AN NINH (SECURITY VECTORS)
Hệ thống SSM được kiểm định toàn diện trên 20 chiều kích bảo mật chuyên sâu:

1. **Authentication (Xác thực):** Cơ chế đăng nhập đa định danh (Email, Mã giáo viên, Mã phụ huynh), mật khẩu bcrypt, chống vét cạn (brute-force).
2. **Authorization (Ủy quyền):** Cơ chế phân quyền RBAC kết hợp Scoping đa cơ sở và kiêm nhiệm (Union Scope Principle).
3. **RBAC 4 Lớp:** Kiểm soát tại Navigation, Route, Frontend UI Action, và Backend API Handler.
4. **Session & Token Management:** Quản lý JWT Token, Session Cookie (HttpOnly, Secure, SameSite=Lax), thu hồi phiên (revocation).
5. **Direct URL Access:** Thử nghiệm truy cập trực tiếp các route đặc quyền qua trình duyệt và HTTP client.
6. **API Permission:** Xác thực token, role scope, và campus scope tại từng route handler.
7. **Cross-Campus Isolation:** Ngăn chặn tuyệt đối người dùng cơ sở này xem/sửa dữ liệu cơ sở khác (Riverside, Central, International, Hội An, Hill).
8. **Student Privacy (Quyền riêng tư học sinh):** Cách ly hồ sơ học sinh A khỏi học sinh B, phụ huynh A khỏi phụ huynh B.
9. **Sensitive Psychology Data:** Bảo vệ dữ liệu theo dõi tâm lý, can thiệp học sinh yếu và cam kết đầu vào.
10. **Assessment Confidentiality:** Bảo mật thư viện câu hỏi, ma trận đề, mã đề thi và đáp án chấm điểm.
11. **Input Validation:** Xác thực dữ liệu đầu vào bằng Zod schema trên cả client và server.
12. **Output Encoding / Content Safety:** Ngăn chặn tấn công XSS, injection khi hiển thị nhận xét và nội dung người dùng nhập.
13. **File Upload Security:** Kiểm tra MIME type, kích thước file, sanitized file name và đường dẫn lưu trữ.
14. **Import/Export Security:** Kiểm tra luồng Import Excel/CSV/QTI/GIFT qua 5 bước kiểm soát.
15. **Frontend Secrets Audit:** Quét bundle client-side loại trừ 100% credentials, API private keys.
16. **Environment Variable Audit:** Phân tách rõ ràng server-only secrets và public configuration.
17. **Dependency Security:** Kiểm toán mã độc và lỗ hổng trong package lockfile (supply chain review).
18. **Logging Privacy:** Masking tự động `[REDACTED]` thông tin nhạy cảm trong hệ thống log.
19. **Audit Trail Integrity:** Ghi nhận bất biến các thao tác đăng nhập, phân quyền, duyệt phiếu và xuất dữ liệu.
20. **Operational Access Control:** Phân định quyền truy cập công cụ quản trị và endpoint bảo trì.

---

## 2. MA TRẬN MỐI ĐE DỌA (THREAT MATRIX)

```text
+-----------------------+-----------------------------+------------------------------------+
| Tác nhân đe dọa       | Mục tiêu tiềm ẩn            | Cơ chế phòng vệ của SSM            |
+-----------------------+-----------------------------+------------------------------------+
| Học sinh tò mò        | Xem đề thi, đổi điểm, xem HS| Deny API, không tải đáp án client, |
|                       | khác                        | Scoped profile endpoint            |
+-----------------------+-----------------------------+------------------------------------+
| Giáo viên cơ sở A     | Xem/sửa số liệu của cơ sở B | Scoped campusIds enforce ở Prisma  |
+-----------------------+-----------------------------+------------------------------------+
| Kẻ tấn công ngoài     | Chiếm quyền Admin, brute-   | Bcrypt, rate limit, không rò rỉ    |
|                       | force, lấy token            | secrets, HttpOnly secure cookies   |
+-----------------------+-----------------------------+------------------------------------+
| Nhân viên rời vị trí  | Lạm dụng phiên đăng nhập cũ | Auto session expiry, instant revoke|
+-----------------------+-----------------------------+------------------------------------+
```
