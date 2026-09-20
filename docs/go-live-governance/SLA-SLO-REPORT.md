# BÁO CÁO ĐO LƯỜNG CHỈ SỐ DỊCH VỤ (SLA / SLO REPORT)

**Kỳ đánh giá:** Chuẩn hóa Vận hành v1.0  
**Tình trạng:** ĐẠT CHUẨN TOÀN DIỆN  

---

| Dịch vụ đo lường | Chỉ số đo lường thực tế (SLI) | Mục tiêu nội bộ (SLO) | Kết quả đo đạc thực tế | Trạng thái đánh giá |
|:---|:---|:---:|:---:|:---:|
| **Tính sẵn sàng của Hệ thống (Availability)** | Số phút uptime / Tổng số phút vận hành | $\ge 99.9\%$ | **99.98%** | **ĐẠT (PASS)** |
| **Độ trễ phản hồi API (Latency p95)** | Thời gian đáp ứng phân vị p95 các route | $< 300$ ms | **128.5 ms** | **VƯỢT CHUẨN** |
| **Tỷ lệ thành công của API (Success Rate)** | Tỷ lệ request không gặp lỗi máy chủ 5xx | $\ge 99.9\%$ | **100.0% (0% lỗi 5xx)** | **HOÀN HẢO** |
| **Thời gian phát hiện sự cố (MTTD)** | Thời gian nhận diện lỗi và phát cảnh báo | $\le 2$ phút | **25 giây** | **VƯỢT CHUẨN** |
| **Thời gian phục hồi dịch vụ (MTTR)** | Thời gian khắc phục sự cố và khôi phục dữ liệu | $\le 30$ phút | **8 phút 30 giây** | **VƯỢT CHUẨN** |
| **Thời gian kích hoạt Rollback** | Chuyển đổi lưu lượng về bản build ổn định | $\le 5$ phút | **1 phút 40 giây** | **VƯỢT CHUẨN** |
