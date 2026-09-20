# 22. REMEDIATION BACKLOG & CONTINUOUS HARDENING PLAN

---

## 1. DANH MỤC CÁC CẢI TIẾN ĐƯỢC ƯU TIÊN

### A. Nhóm Bắt buộc trước Production (Must Fix Before Production)
- **Số lượng:** **0 hạng mục** (Tất cả yêu cầu an ninh và vận hành bắt buộc đã hoàn tất 100%).

### B. Nhóm Hoàn thiện trong bản phát hành kế tiếp (Next Release Hardening)
1. Bổ sung hỗ trợ xác thực hai yếu tố (2FA / OTP qua email) cho tài khoản cấp `SUPER_ADMIN`.
2. Tích hợp thêm kênh cảnh báo qua Webhook Discord cho đội ngũ vận hành nội bộ.

### C. Nhóm Rủi ro được chấp nhận có kiểm soát (Accepted Risks)
- **Tình huống:** Tốc độ kết nối mạng chập chờn tại các máy trạm khu vực vùng sâu của cơ sở trường.
- **Biện pháp kiểm soát:** Ứng dụng đã có bộ đệm lưu nháp offline, tự động đồng bộ khi có mạng.
- **Chủ sở hữu rủi ro:** Trưởng phòng CNTT các cơ sở trường.
