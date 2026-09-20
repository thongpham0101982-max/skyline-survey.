# 12. PHÂN QUYỀN BẢO MẬT TRÊN DASHBOARD (RBAC & PRIVACY)
## PHÂN TÁCH SCOPE VÀ BẢO VỆ DỮ LIỆU NHẠY CẢM

---

### 1. Cơ chế Enforce Scope ở Tầng API
- Không bao giờ trả về toàn bộ dữ liệu hệ thống xuống trình duyệt rồi dùng frontend để lọc theo vai trò.
- Quyền hạn truy xuất dữ liệu được khóa chặt ở backend:
  - Giáo viên chỉ nhận dữ liệu các lớp mình phụ trách.
  - Tổ trưởng chỉ nhận dữ liệu giáo viên và môn trong tổ.
  - Giám đốc cơ sở chỉ nhận dữ liệu trong cơ sở của mình.

### 2. Bảo mật Dữ liệu Nhạy cảm (Privacy Baseline)
- Dashboard quản lý chỉ hiển thị số lượng tổng hợp (`Support Active Count`), tuyệt đối **không hiển thị ghi chú tâm lý nhạy cảm, nội dung tư vấn riêng tư** của học sinh lên màn hình dashboard điều hành.
