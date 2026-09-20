# 09. KIỂM TOÁN BẢO MẬT & PHÂN QUYỀN (RBAC & PRIVACY)
## PHÂN TÁCH SCOPE VÀ BẢO VỆ DỮ LIỆU NHẠY CẢM TOÀN HỆ THỐNG

---

### 1. Ma trận Phân quyền Cốt lõi
- **Giáo viên (GV/GVCN)**: Chỉ có quyền xem và nhập liệu trên các lớp mình phụ trách giảng dạy hoặc chủ nhiệm.
- **Tổ trưởng Chuyên môn (TTCM)**: Có quyền giám sát và duyệt hồ sơ thuộc tổ chuyên môn của mình.
- **Giám đốc Cơ sở (GĐCS)**: Có quyền điều hành toàn diện trong phạm vi cơ sở mình quản lý.
- **Ban KT&ĐBCL / BGH**: Toàn quyền giám sát đối chuẩn và kiểm định chất lượng toàn hệ thống.

### 2. Kiểm toán Bảo vệ Dữ liệu Tâm lý Nhạy cảm
- Các ghi chú tư vấn tâm lý riêng tư (`Psychology Case Notes`) tuyệt đối không bị hiển thị trên màn hình Dashboard tổng thể hay rò rỉ qua tooltip.
- API chỉ trả về các chỉ số đếm số lượng tổng hợp (`Support Active Count`) cho các cấp quản lý điều hành.
