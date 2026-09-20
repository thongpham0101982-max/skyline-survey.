# 04. PRODUCTION RELEASE CHECKLIST & USER-FACING NOTES

---

## 1. BẢNG KIỂM TRA PHÁT HÀNH BẮT BUỘC (PRE-RELEASE CHECKLIST)
Mỗi đợt phát hành lên Production bắt buộc phải hoàn thành 100% các tiêu chí:

- [ ] **Scope xác nhận:** Danh sách Change Requests trong bản phát hành đã được ký duyệt đầy đủ.
- [ ] **Kiểm tra Schema CSDL:** Đảm bảo tương thích ngược 100% với bản build cũ nếu phải rollback.
- [ ] **Kiểm tra API Contract:** Không làm gãy các endpoint đang phục vụ client.
- [ ] **Kiểm tra RBAC:** Xác nhận không có rò rỉ quyền hoặc thay đổi phân bổ cơ sở ngoài ý muốn.
- [ ] **Build & Test tự động:** `npx tsc --noEmit` đạt Exit Code 0; toàn bộ test suite màu xanh.
- [ ] **Kiểm tra Backup:** Có bản snapshot CSDL gần nhất tạo trong vòng < 60 phút.
- [ ] **Kế hoạch Rollback:** Bản build ổn định liền trước đã được định danh sẵn sàng revert trong < 2 phút.
- [ ] **Release Notes:** Đã soạn thảo đầy đủ Release Notes kỹ thuật và hướng dẫn người dùng.
- [ ] **Giám sát viên trực chiến:** Kỹ sư phụ trách release túc trực theo dõi telemetries trong 30 phút đầu.

---

## 2. TIÊU CHUẨN THÔNG BÁO CHO NGƯỜI DÙNG (USER-FACING RELEASE NOTES)
Khi phát hành bản cập nhật cho Giáo viên, Cán bộ quản lý và Học sinh, tài liệu hướng dẫn bắt buộc phải súc tích, trực quan và trả lời đúng 3 câu hỏi:
1. **Có gì mới?** (Tóm tắt tính năng mới bằng 1–2 gạch đầu dòng rõ nghĩa).
2. **Điều gì thay đổi?** (Giao diện hoặc vị trí nút bấm nào được tinh chỉnh).
3. **Tôi cần làm gì?** (Hành động cụ thể: ví dụ chỉ cần nhấn F5 hoặc tiếp tục sử dụng bình thường).
