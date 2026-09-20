# KIỂM SOÁT PHÂN QUYỀN VÀ BẢO MẬT (RBAC & PRIVACY)
## Báo Cáo Thẩm Định An Toàn Dữ Liệu Nhạy Cảm Wave 3

---

### 1. PHÂN CẤP ĐỘ BẢO MẬT THÔNG TIN

1. **Cấp độ 1: Tổng quan (Public within School):**
   * Tên học sinh, lớp, loại hỗ trợ (Học tập / Tâm lý), trạng thái chung (`Đang theo dõi`).
2. **Cấp độ 2: Tác nghiệp (Operational Detail):**
   * Ngày bắt đầu, tên giáo viên phụ trách, tần suất theo dõi tuần/tháng, ngày đánh giá tiếp theo.
3. **Cấp độ 3: Nhạy cảm đặc biệt (Sensitive Notes):**
   * Lời tâm sự của học sinh, hoàn cảnh gia đình riêng tư, nhật ký khủng hoảng, chẩn đoán tâm lý.
   * **Chỉ người được phân công trực tiếp và lãnh đạo phê duyệt mới có quyền đọc.**

---

### 2. THẨM ĐỊNH KỸ THUẬT CHỐNG RÒ RỈ DỮ LIỆU

* [x] **API Filter:** API `GET /api/ktdbcl/support?action=getTargets` tự động lọc bỏ các trường `notes`, `comment` nhạy cảm khi người gọi là giáo viên bộ môn không liên quan.
* [x] **Export Control:** Tệp Excel xuất danh sách chung không chứa cột ghi chú nhạy cảm.
* [x] **Anti-IDOR:** Chặn hoàn toàn việc mở hồ sơ bằng cách sửa `targetId` trên URL khi không thuộc quyền quản lý.\n