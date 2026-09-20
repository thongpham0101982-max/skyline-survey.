# SSM BACKUP & RESTORE OPERATIONAL PROCEDURES

---

## 1. LỊCH SAO LƯU TỰ ĐỘNG
- **WAL Streaming:** Tự động đồng bộ liên tục từng transaction.
- **Snapshot Dump:** 02:00 AM hàng ngày, lưu trữ phân tán và mã hóa.

## 2. QUY TRÌNH PHỤC HỒI DỮ LIỆU
1. Tải bản dump từ kho lưu trữ an toàn.
2. Kiểm tra checksum SHA-256: `sha256sum backup-file.dump`.
3. Phục hồi vào cụm đích bằng công cụ quản trị Turso/LibSQL CLI.
4. Chạy script đối soát tính toàn vẹn foreign keys và bản ghi.
