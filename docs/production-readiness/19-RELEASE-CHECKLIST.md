# 19. PRE-FLIGHT RELEASE CHECKLIST & QUALITY GATES

Trước khi gắn thẻ release chính thức `SSM-v1.0.0-PROD`, người phụ trách phát hành (Release Manager) bắt buộc phải tích chọn đủ 100% các mục:

---

### I. KIỂM ĐỊNH MÃ NGUỒN & TEST
- [x] Nhánh `main` đã merge đủ các commit được phê duyệt.
- [x] Lệnh `npx tsc --noEmit` chạy không có bất kỳ lỗi kiểu dữ liệu nào (Exit code 0).
- [x] Tất cả unit tests và integration tests đều xanh (100% pass).
- [x] Không còn file tạm, debug console log hoặc TODO trọng yếu trong mã nguồn.

### II. BẢO MẬT & MÔI TRƯỜNG
- [x] Toàn bộ biến môi trường production đã được nạp đủ trên dashboard quản trị.
- [x] Không có secret, api key hoặc connection string nào bị commit lên git repo.
- [x] Endpoint `/api/health` và `/api/ready` trả về 200 OK và không để lộ thông tin nhạy cảm.
- [x] CSDL Turso production đã được kiểm tra tính năng sao lưu tự động WAL.

### III. TRẢI NGHIỆM NGƯỜI DÙNG & GIAO DIỆN
- [x] 17 Shared UI Primitives tuân thủ đúng chuẩn SSM Design System tokens.
- [x] Hệ thống hiển thị hoàn hảo trên các độ phân giải: Mobile, Tablet, Desktop 1080p và 2K.
- [x] Phông chữ hiển thị mượt mà, không bị nhảy layout (CLS < 0.1).

### IV. PHÊ DUYỆT & KẾ HOẠCH HỖ TRỢ
- [x] Trưởng nhóm kỹ thuật ký phê duyệt (Technical Lead Sign-off).
- [x] Giám đốc chất lượng giáo dục ký phê duyệt (Educational Quality Sign-off).
- [x] Đội ngũ On-call trực vận hành sẵn sàng trong 24 giờ đầu sau phát hành.
