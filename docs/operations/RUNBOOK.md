# SSM OPERATIONS RUNBOOK — DAY-2 MANAGEMENT GUIDE

**Hệ thống:** Sky-Line Educational Quality Management System (SSM)  
**Phiên bản:** Production Baseline v1.0  

---

## 1. QUẢN LÝ DỊCH VỤ THƯỜNG NHẬT
- **Khởi động lại dịch vụ:** Thực hiện qua Vercel redeploy hoặc `pm2 reload ssm-service`.
- **Kiểm tra trạng thái:**
  - `curl -s https://ssm.skyline.edu.vn/api/health | jq .`
  - `curl -s https://ssm.skyline.edu.vn/api/ready | jq .`

## 2. QUẢN TRỊ BẢN QUYỀN VÀ TRUY CẬP ĐA CƠ SỞ
- Cấp quyền người dùng mới thông qua giao diện Quản trị hệ thống.
- Luôn kiểm tra gán đúng mã `campusId` tương ứng (`riverside`, `central`, `international`, `hoian`, `hill`).
