# 11. EMAIL & EXTERNAL INTEGRATION FAILURE DRILL (DRILL 3)

---

## 1. KỊCH BẢN THỬ NGHIỆM: MÁY CHỦ EMAIL / N8N MẤT KẾT NỐI
- **Tình huống giả lập:** Cổng gửi email SMTP và webhook n8n bị ngắt kết nối hoàn toàn trong lúc Ban Giám hiệu thực hiện thao tác "Phê duyệt phiếu dự giờ giáo viên".
- **Nguyên tắc cốt lõi:** *Thông báo email chỉ là tác vụ phụ (side-effect), không bao giờ được làm chặn hoặc hủy bỏ giao dịch nghiệp vụ cốt lõi.*

---

## 2. KẾT QUẢ KIỂM CHỨNG
1. **Giao dịch chính (Core Transaction):**
   - Phiếu dự giờ vẫn được chuyển trạng thái `APPROVED` thành công vào CSDL.
   - Điểm số và nhận xét của giáo viên được lưu trữ đầy đủ.
   - Giao diện người dùng phản hồi thành công tức thì: *"Phê duyệt phiếu dự giờ thành công."*
2. **Xử lý tác vụ gửi email thất bại:**
   - Exception gửi mail được bọc trong khối `try-catch` riêng biệt.
   - Thao tác gửi mail được đẩy vào hàng đợi chờ gửi lại (Retry Queue).
   - Ghi nhận bản ghi cảnh báo vào hệ thống log để theo dõi.
   - Sau khi máy chủ mail hoạt động trở lại: Hàng đợi tự động gửi thông báo với cơ chế chống gửi lặp (no duplicate spam).
3. **Đánh giá:** **100% PASS**.
