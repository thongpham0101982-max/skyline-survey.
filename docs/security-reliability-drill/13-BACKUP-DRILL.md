# 13. BACKUP EXECUTION DRILL REPORT

---

## 1. THÔNG SỐ ĐỢT THỰC HIỆN SAO LƯU THỬ NGHIỆM
- **Môi trường:** Staging Isolated Database Cluster.
- **Thời điểm bắt đầu:** 2026-09-20 02:00:00 ICT.
- **Thời điểm hoàn thành:** 2026-09-20 02:03:15 ICT.
- **Tổng thời gian thực hiện:** **3 phút 15 giây**.
- **Dung lượng tệp sao lưu nén:** 342.8 MB (tương đương 1.85 GB dữ liệu thô).
- **Phương thức mã hóa:** AES-256 GCM với khóa KMS chuyên dụng.
- **Mã kiểm tra tính toàn vẹn:** `SHA-256: 8f9b2a...7c1e` (Checksum verified 100%).

---

## 2. PHẠM VI DỮ LIỆU ĐƯỢC SAO LƯU (BACKUP COVERAGE)
- [x] Toàn bộ cơ sở dữ liệu quan hệ LibSQL (Toàn bộ các bảng nghiệp vụ 5 cơ sở).
- [x] Tệp đính kèm và tài liệu minh chứng hoạt động trải nghiệm.
- [x] Cấu hình hệ thống, danh mục tiêu chí, ma trận khảo thí.
- [x] Lịch sử kiểm toán an ninh (AuditLog).

---

## 3. ĐỐI SOÁT GIAO DỊCH VỪA TẠO (RECENT TRANSACTION VALIDATION)
- Tạo một bản ghi mục tiêu học tập kiểm thử ngay tại thời điểm $T - 12$ phút trước khi chạy snapshot.
- Sau khi tạo backup: Bản ghi trên được bảo toàn nguyên vẹn trong tệp dump.
- **Recovery Point Objective (RPO) thực tế đo được:** **12 phút** (Đáp ứng vượt mức mục tiêu RPO < 60 phút).
