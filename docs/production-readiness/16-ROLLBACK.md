# 16. INSTANT ROLLBACK PLAYBOOK & DRILL

---

## 1. ĐIỀU KIỆN KÍCH HOẠT ROLLBACK KHẨN CẤP
Rollback tức thì được thực hiện ngay lập tức mà không cần họp bàn nếu xuất hiện một trong các dấu hiệu sau trong vòng 15 phút sau khi release:
1. Tỷ lệ lỗi 5xx trên production vượt quá 1.0%.
2. Endpoint `/api/ready` trả về lỗi hoặc độ trễ p95 vượt quá 1,500ms liên tục.
3. Xuất hiện lỗi sai lệch dữ liệu điểm số, mục tiêu hoặc rò rỉ quyền truy cập giữa các cơ sở.

---

## 2. QUY TRÌNH THỰC HIỆN ROLLBACK (THỰC THI < 2 PHÚT)
1. **Bước 1 — Điều hướng Traffic tức thời (Instant Rollback):**
   - Trên dashboard điều phối (Vercel / Reverse Proxy), chọn bản release ổn định liền trước (Previous Known Good Deployment) và nhấn **Promote to Production**.
   - Thời gian kích hoạt: **< 10 giây**.
2. **Bước 2 — Xác minh trạng thái sau Rollback:**
   - Chạy kiểm tra curl `/api/ready` và `/api/health`.
   - Kiểm tra log stream xem tỷ lệ lỗi có lập tức trở về 0% hay không.
3. **Bước 3 — Thông báo & Điều tra:**
   - Khóa nhánh release, gửi thông báo cho đội ngũ kỹ thuật và lập biên bản Post-Mortem.
