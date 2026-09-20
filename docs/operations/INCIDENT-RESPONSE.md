# SSM INCIDENT RESPONSE MANUAL

**Mục đích:** Quy trình phản ứng nhanh khi xuất hiện sự cố vận hành trên hệ thống SSM.

---

## 1. ĐƯỜNG DÂY NÓNG TRỰC VẬN HÀNH (ON-CALL HOTLINE)
- **Kỹ thuật trưởng:** On-call 24/7.
- **Kênh thông báo khẩn cấp:** Slack `#ssm-ops-urgent` và SMS Gateway.

## 2. THANG ĐO MỨC ĐỘ KHẨN CẤP
- **P1:** Gián đoạn toàn hệ thống hoặc nghi ngờ lộ dữ liệu -> Kích hoạt xử lý trong 15 phút.
- **P2:** Hỏng một module chính -> Xử lý trong 30 phút.
- **P3/P4:** Lỗi thứ cấp -> Xử lý trong ca làm việc.
