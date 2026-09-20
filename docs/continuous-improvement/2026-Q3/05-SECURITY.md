# 05. SECURITY & PRIVACY AUDIT — 2026-Q3
## KIỂM TOÁN BẢO MẬT, KIỂM SOÁT TRUY CẬP VÀ BẢO VỆ DỮ LIỆU HỌC SINH

---

### 1. BẢNG KIỂM TOÁN TRỤ CỘT BẢO MẬT HỆ THỐNG

| Trụ cột kiểm toán | Hiện trạng kiểm tra Q3/2026 | Kết quả đánh giá | Ghi chú vận hành |
|---|---|:---:|---|
| **Kiểm soát truy cập (RBAC Matrix)** | Kiểm tra 8 vai trò (Admin, BGH, HT, GVBM, GVCN, Specialist, Parent, Student) | **PASS (100%)** | Quyền hạn phân định nghiêm ngặt, không leo thang đặc quyền |
| **Cách ly dữ liệu cơ sở (Cross-Campus)** | Thử nghiệm truy cập chéo giữa 5 cơ sở trường qua API/IDOR test | **PASS (100%)** | Dữ liệu lọc đúng `campusId` từ server session |
| **Quyền riêng tư học sinh (Student Privacy)** | Rà soát hiển thị thông tin gia đình, liên lạc, đánh giá hạnh kiểm | **PASS (100%)** | Tuân thủ nguyên tắc Privacy-by-design |
| **Dữ liệu tâm lý nhạy cảm (Psychology)** | Mã hóa AES-256 các trường ghi chú tư vấn tâm lý Tier 2 / Tier 3 | **PASS (100%)** | Chỉ BGH và Chuyên viên tư vấn được giải mã |
| **Quản lý phiên & Mật khẩu (Session/Auth)** | Thuật toán băm mật khẩu bcrypt 12 rounds; phiên hết hạn an toàn | **PASS (100%)** | Session timeout tự động sau 8 giờ không hoạt động |
| **Quản lý Secrets & Biến môi trường** | Rà soát repo Git: không lộ file `.env` hay credentials nhạy cảm | **PASS (100%)** | Toàn bộ secret được nạp qua Vault/Environment an toàn |
| **Quản lý Dependencies & Lỗ hổng** | Chạy kiểm tra quét mã nguồn và thư viện ngoài | **PASS (100%)** | 0 Critical, 0 High vulnerabilities |
| **Nhật ký kiểm toán (Audit Logs)** | Ghi log đầy đủ mọi thao tác sửa điểm, duyệt kế hoạch, xuất báo cáo | **PASS (100%)** | Log được lưu trữ bảo vệ, không thể bị xóa sửa |

---

### 2. KẾT LUẬN AN NINH QUÝ 3/2026
Hệ thống đạt trạng thái **SECURITY COMPLIANT** ở mức cao nhất, sẵn sàng đáp ứng mọi yêu cầu kiểm tra tuân thủ an toàn thông tin ngành giáo dục.
