# KẾ HOẠCH VÀ BIÊN BẢN PHÁT HÀNH (RELEASE TEMPLATE)

**Phiên bản phát hành (Version):** `vX.Y.Z`  
**Ngày phát hành dự kiến:** `YYYY-MM-DD HH:mm`  
**Người phụ trách phát hành (Release Owner):** `[Họ và tên - Vị trí]`  
**Phân loại phát hành (Release Type):** `[HOTFIX | PATCH | MINOR | MAJOR]`  

---

### 1. PHẠM VI NỘI DUNG PHÁT HÀNH (SCOPE & CHANGES)
- **Tính năng mới bổ sung (Added):**
  - `...`
- **Cải tiến và thay đổi (Changed):**
  - `...`
- **Các lỗi đã khắc phục (Fixed):**
  - `...`
- **Vá lỗi bảo mật (Security):**
  - `...`

---

### 2. KẾ HOẠCH TRIỂN KHAI & DIỄN TẬP ROLLBACK
- **Mã commit Git:** `[commit-hash]`
- **Kiểm tra tương thích ngược CSDL:** `[Đạt / Không có thay đổi DB]`
- **Bản build ổn định liền trước:** `[commit-hash-trước-đó]`
- **Thời gian Rollback ước tính:** `< 2 phút`

---

### 3. BIÊN BẢN KIỂM TRA NHANH SAU PHÁT HÀNH (POST-RELEASE SMOKE TEST)
- [ ] Đăng nhập thành công với tài khoản Giáo viên và Admin.
- [ ] Endpoint `/api/health` trả về `pass` (200 OK).
- [ ] Endpoint `/api/ready` trả về `ready` (200 OK, latency < 50ms).
- [ ] Mở trang Hồ sơ học sinh 360° và Dashboard tổng thể hoạt động trơn tru.
- [ ] Tỷ lệ lỗi 5xx trên hệ thống giám sát duy trì ở mức 0.00%.
