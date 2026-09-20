# 18. END-TO-END INCIDENT MANAGEMENT DRILL

---

## 1. DÒNG THỜI GIAN DIỄN TẬP SỰ CỐ GIẢ LẬP (INCIDENT TIMELINE T0 - T6)

```text
[T0: 08:00:00] -- Sự cố bắt đầu: Giả lập tắc nghẽn connection pool CSDL trên Staging.
[T1: 08:00:25] -- Phát hiện (MTTD = 25 giây): Probe /api/ready trả về 503, cảnh báo tự động gửi về Slack.
[T2: 08:01:10] -- Tiếp nhận (Acknowledgement): Kỹ sư trực ban xác nhận sự cố, chỉ định Incident Commander.
[T3: 08:02:30] -- Cô lập nguy cơ (Mitigation): Kích hoạt chế độ Read-Only tạm thời để bảo vệ dữ liệu.
[T4: 08:06:00] -- Khắc phục kỹ thuật (Recovery): Reset connection pool, giải phóng các kết nối treo.
[T5: 08:07:30] -- Xác minh toàn diện (Verification): /api/ready trả về 200 OK (latency 18ms), đối soát dữ liệu.
[T6: 08:09:00] -- Đóng sự cố & Khôi phục hoàn toàn: Hệ thống hoạt động bình thường, thông báo hoàn tất.
```

---

## 2. ĐO LƯỜNG CHỈ SỐ PHẢN ỨNG THỰC TẾ
- **MTTD (Thời gian phát hiện sự cố - Mean Time To Detect):** **25 giây**.
- **MTTR (Thời gian khôi phục kỹ thuật - Mean Time To Recover):** **5 phút 35 giây** (từ T1 đến T4).
- **MTTR Toàn diện (Đến khi xác minh xong 100% dữ liệu):** **7 phút 05 giây** (từ T1 đến T5).

---

## 3. MẪU THÔNG CÁO VẬN HÀNH GIẢ LẬP (COMMUNICATION TEMPLATES)
- *Thông báo khi sự cố xảy ra:* "Hệ thống SSM đang ghi nhận hiện tượng phản hồi chậm tại một số phân hệ. Đội ngũ kỹ thuật đang xử lý khẩn cấp và dự kiến hoàn tất trong 15 phút."
- *Thông báo khi khắc phục xong:* "Sự cố kỹ thuật đã được khắc phục hoàn toàn lúc 08:09. Toàn bộ dữ liệu điểm số và hồ sơ của thầy cô và học sinh được bảo đảm nguyên vẹn 100%."
