# 06. OPERATIONAL REVIEW CADENCE & SYSTEM HEALTH AUDIT

---

## 1. LỊCH TRÌNH ĐÁNH GIÁ ĐỊNH KỲ (REVIEW CADENCE)

```text
+-----------------------------------------------------------------------------------+
| HÀNG NGÀY (DAILY STANDUP - 10 PHÚT)                                                |
| - Kiểm tra Uptime, Health Probes (/api/ready), Tỷ lệ lỗi 5xx trong 24h qua        |
| - Điểm danh các vé hỗ trợ P0/P1 tồn đọng                                          |
+-----------------------------------------------------------------------------------+
                                         │
+-----------------------------------------------------------------------------------+
| HÀNG TUẦN (WEEKLY OPS REVIEW - 45 PHÚT)                                           |
| - Tổng kết sự cố, phân tích Root Cause các lỗi phát sinh                          |
| - Đánh giá hiệu năng truy vấn CSDL, kiểm tra dung lượng lưu trữ                   |
| - Rà soát các ca nhập liệu lỗi, bất thường dữ liệu                                |
+-----------------------------------------------------------------------------------+
                                         │
+-----------------------------------------------------------------------------------+
| HÀNG THÁNG (MONTHLY SERVICE REVIEW - 1.5 GIỜ)                                     |
| - Báo cáo SLA/SLO thực tế đạt được                                                |
| - Báo cáo chỉ số tiếp nhận người dùng (Adoption Report) & Task Success Rate       |
| - Rà soát sổ đăng ký Nợ Kỹ thuật (Technical Debt Register)                        |
| - Lập kế hoạch phát hành phiên bản Minor kế tiếp                                  |
+-----------------------------------------------------------------------------------+
                                         │
+-----------------------------------------------------------------------------------+
| HÀNG QUÝ (QUARTERLY ARCHITECTURE & SECURITY - NỬA NGÀY)                           |
| - Kiểm toán an ninh toàn diện: Rà soát phân quyền RBAC, kiểm tra tài khoản        |
| - Diễn tập phục hồi thảm họa (Disaster Recovery Drill)                            |
| - Đánh giá năng lực tải (Capacity Planning) phục vụ kỳ thi hoặc sự kiện lớn       |
+-----------------------------------------------------------------------------------+
```
