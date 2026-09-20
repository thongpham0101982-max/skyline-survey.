# 12. DATA BACKUP & SNAPSHOT STRATEGY

---

## 1. CHIẾN LƯỢC SAO LƯU DỮ LIỆU ĐA TẦNG (MULTI-TIER BACKUP)

```text
+-----------------------------------------------------------------------------------+
| TẦNG 1: CONTINUOUS WAL REPLICATION (RPO ~ 0 - 15 phút)                             |
| - Turso LibSQL tự động đồng bộ Write-Ahead Log liên tục về cloud storage an toàn. |
+-----------------------------------------------------------------------------------+
                                         │
+-----------------------------------------------------------------------------------+
| TẦNG 2: HOURLY LOGICAL SNAPSHOTS (RPO < 1 giờ)                                    |
| - Định kỳ mỗi 1 giờ xuất dump nén mã hóa AES-256 sang AWS S3 / Cloudflare R2.     |
+-----------------------------------------------------------------------------------+
                                         │
+-----------------------------------------------------------------------------------+
| TẦNG 3: DAILY COLD ARCHIVE (Lưu trữ lịch sử năm học)                              |
| - Bản sao lưu toàn vẹn cuối ngày (02:00 AM) lưu trữ trong 365 ngày (WORM policy). |
+-----------------------------------------------------------------------------------+
```

---

## 2. NGUYÊN TẮC BẢO MẬT BẢN SAO LƯU
- Tất cả các bản backup đều được mã hóa bằng khóa riêng `KMS AES-256`.
- Quyền truy cập kho backup được cô lập độc lập với quyền chạy ứng dụng web.
- Tự động kiểm tra tính toàn vẹn Checksum SHA-256 ngay sau khi hoàn thành sao lưu.
