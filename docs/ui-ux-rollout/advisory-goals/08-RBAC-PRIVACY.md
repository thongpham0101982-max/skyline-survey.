# KIỂM SOÁT PHÂN QUYỀN VÀ BẢO VỆ RIÊNG TƯ (RBAC & PRIVACY)
## Báo Cáo Thẩm Định Bảo Mật Cho Wave 2

---

### 1. CÁC TIÊU CHÍ BẢO MẬT ĐÃ KIỂM THỬ

1. **Kiểm tra chống IDOR (Insecure Direct Object Reference):**
   * Học sinh thử gọi API `/api/advisory/profile-360?studentId=OTHER_STUDENT_ID` → Hệ thống chặn lại với lỗi `403 Forbidden`.
   * Học sinh thử gửi yêu cầu mở phiếu cho bạn khác qua `/api/advisory/goals/adjustment-request` → Server kiểm tra token session và từ chối.
2. **Kiểm tra vượt phạm vi lớp của Giáo viên:**
   * GVCN lớp 10/1 thử xem hoặc duyệt yêu cầu của học sinh lớp 10/2 → Server truy vấn bảng `Class` và chặn hành động.
3. **Bảo vệ quyền riêng tư của Học sinh:**
   * Danh sách lớp không công khai các mục tiêu nhạy cảm (vấn đề tâm lý, khó khăn gia đình) lên bảng chung. Những thông tin này chỉ hiển thị trong khung làm việc riêng giữa GVCN và học sinh đó.\n