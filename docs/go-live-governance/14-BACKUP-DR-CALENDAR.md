# 14. BACKUP VERIFICATION & DISASTER RECOVERY DRILL SCHEDULE

---

## 1. LỊCH TRÌNH KIỂM TRA SAO LƯU & DIỄN TẬP PHỤC HỒI
- **Kiểm tra tự động hàng ngày (Automated Daily Check):**
  - Hệ thống kiểm tra tính khả dụng của bản snapshot CSDL tạo lúc 02:00 AM và đối soát checksum SHA-256 tự động.
- **Diễn tập phục hồi hàng quý (Quarterly Restore Drill):**
  - Thực hiện nạp bản sao lưu snapshot vào cụm CSDL thử nghiệm độc lập.
  - Chạy script đối soát tính toàn vẹn 4,520 học sinh và các quan hệ ngoại khóa.
  - Đo lường và xác nhận chỉ số RTO thực tế duy trì dưới mốc 15 phút.
- **Diễn tập thảm họa hàng năm (Annual DR Simulation):**
  - Giả lập mất kết nối trung tâm dữ liệu chính, kích hoạt chuyển đổi dự phòng toàn diện.
