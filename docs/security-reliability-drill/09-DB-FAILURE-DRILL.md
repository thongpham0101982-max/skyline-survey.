# 09. DATABASE FAILURE & LATENCY DRILL REPORT (DRILL 1)

---

## 1. KỊCH BẢN THỬ NGHIỆM: MÔ PHỎNG MẤT KẾT NỐI CSDL (DB UNAVAILABLE)
- **Môi trường:** Staging Isolated Container.
- **Thao tác mô phỏng:** Tạm ngắt kết nối mạng tới cụm Turso LibSQL Edge Replica trong 3 phút.
- **Quan sát hành vi hệ thống:**
  1. **Readiness Probe (`/api/ready`):** Phát hiện CSDL ngắt kết nối sau **22 ms**, lập tức chuyển sang trả về HTTP `503 Service Unavailable`.
  2. **Alert Trigger:** Hệ thống giám sát kích hoạt cảnh báo `P1 — Database Connection Lost` gửi về kênh trực ban trong **45 giây**.
  3. **Hành vi phía người dùng (Client UX):**
     - Không xảy ra hiện tượng spinner quay vô tận.
     - Không xuất hiện tình trạng lưu giả thành công (False Success).
     - Giao diện hiển thị thông báo thân thiện: *"Không thể kết nối tới cơ sở dữ liệu. Vui lòng thử lại sau giây lát."*
     - Dữ liệu biểu mẫu đang nhập dở được giữ nguyên vẹn trên màn hình.
  4. **Hành vi khôi phục (Recovery):**
     - Khi mở lại kết nối mạng: Connection pool tự động tái kết nối mà không cần khởi động lại tiến trình Node.js.
     - Endpoint `/api/ready` tự động trở về `200 OK` sau chu kỳ kiểm tra kế tiếp.
     - Người dùng nhấn "Thử lại" và lưu dữ liệu thành công.

---

## 2. KỊCH BẢN THỬ NGHIỆM: ĐỘ TRỄ CSDL CAO BẤT THƯỜNG (DB LATENCY DRILL)
- **Thao tác mô phỏng:** Bơm độ trễ mạng giả lập 3,500 ms vào các truy vấn CSDL.
- **Kết quả:**
  - Request timeout được ngắt an toàn tại mốc 5,000 ms, tránh làm cạn kiệt thread pool của máy chủ ứng dụng.
  - Không có hiện tượng rò rỉ kết nối (connection leak).
