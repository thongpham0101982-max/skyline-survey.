# 05. SLA / SLO / SLI GOVERNANCE FRAMEWORK

---

## 1. ĐỊNH NGHĨA KHÁI NIỆM CHUẨN MỰC
- **SLI (Service Level Indicator):** Chỉ số đo lường thực tế hệ thống thu thập được qua telemetry (ví dụ: Tỷ lệ uptime thực tế tháng qua là 99.95%).
- **SLO (Service Level Objective):** Mục tiêu chất lượng nội bộ mà đội ngũ kỹ thuật hướng tới (ví dụ: Mục tiêu API error rate < 0.1%).
- **SLA (Service Level Agreement):** Cam kết dịch vụ chính thức có tính pháp lý/quy chế giữa Đội ngũ Vận hành CNTT và Ban Lãnh đạo Hệ thống Sky-Line.

---

## 2. DANH MỤC CHỈ SỐ SLI / SLO CHUẨN HÓA

| Dịch vụ đo lường | Chỉ số đo lường (SLI) | Mục tiêu nội bộ (SLO) | Cửa sổ đánh giá |
|:---|:---|:---|:---:|
| **Tính sẵn sàng của Hệ thống (Availability)** | Số phút hệ thống hoạt động / Tổng số phút | $\ge 99.9\%$ (không tính bảo trì định kỳ thông báo trước) | Hàng tháng |
| **Độ trễ phản hồi API (Latency)** | Tỷ lệ các request có response time < 300ms | $\ge 95.0\%$ tổng số request (p95 < 300ms) | Hàng tuần |
| **Tỷ lệ thành công của API (Success Rate)** | Số request thành công (2xx, 3xx, 4xx) / Tổng request | $\ge 99.9\%$ (Tỷ lệ lỗi 5xx < 0.1%) | Hàng tuần |
| **Thời gian phát hiện sự cố (MTTD)** | Thời gian từ lúc lỗi phát sinh đến lúc cảnh báo kích hoạt | $\le 2$ phút đối với sự cố P1, $\le 30$s đối với P0 | Theo từng sự cố |
| **Thời gian phục hồi dịch vụ (MTTR)** | Thời gian từ lúc xác nhận lỗi đến khi khôi phục hoạt động | $\le 30$ phút đối với P1, $\le 15$ phút đối với P0 | Theo từng sự cố |
