# 18. DESKTOP WRAPPER UPDATE & OFFLINE RESILIENCE

---

## 1. CƠ CHẾ CẬP NHẬT ỨNG DỤNG DESKTOP (ELECTRON / DESKTOP SHELL)
Đối với các máy trạm chuyên dụng tại phòng khảo thí và văn phòng các cơ sở:
- Áp dụng cơ chế **Auto-Update bất đồng bộ** ở chế độ nền (Background Download).
- Sau khi tải xong bản vá, ứng dụng sẽ nhắc nhở người dùng khởi động lại vào cuối ngày hoặc tự động áp dụng trong lần khởi chạy kế tiếp.
- Chữ ký điện tử (Code Signing Certificate) bắt buộc để đảm bảo tệp thực thi không bị can thiệp.

---

## 2. QUY TẮC ĐỒNG BỘ NGOẠI TUYẾN (OFFLINE BUFFERING RULES)
- Trong trường hợp mất kết nối mạng cục bộ tại cơ sở:
  - Cho phép lưu tạm (local buffer) các thao tác điểm danh và chấm điểm dự giờ vào Local Encrypted Storage.
  - Tự động đồng bộ (Retry Backoff) ngay khi kết nối Internet được phục hồi.
  - Có cơ chế phát hiện xung đột ghi (Conflict Detection) theo timestamp mới nhất.
