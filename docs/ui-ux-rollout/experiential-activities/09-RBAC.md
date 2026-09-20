# 09. KIỂM SOÁT TRUY CẬP VÀ BẢO MẬT (RBAC & PRIVACY)
## PHÂN TÁCH ĐẶC QUYỀN VÀ BẢO VỆ NHẬN XÉT

---

### 1. Phân cấp đặc quyền (Access Hierarchy)
- **Role Admin / BGH**:
  - Truy cập toàn bộ hoạt động trên tất cả các cơ sở.
  - Phê duyệt chính thức và đóng/mở đợt đánh giá.
- **Role Manager (Quản lý trải nghiệm / Đoàn Đội)**:
  - Khởi tạo hoạt động và tiêu chí đánh giá.
  - Phân công lớp và chỉ định người chấm điểm.
- **Role Teacher (GVCN / Giám khảo)**:
  - Chỉ xem và đánh giá các lớp được phân công cụ thể.
  - Không thể sửa đổi tiêu chí hay xóa hoạt động.
- **Role Student / Parent**:
  - Chỉ xem kết quả cá nhân của học sinh khi hoạt động đã được `PUBLISHED`.

### 2. Khóa dữ liệu và ghi vết lịch sử (Audit Trail)
- Khi GVCN nhấn "Hoàn tất nộp điểm", trạng thái chuyển thành `SUBMITTED`, giao diện GVCN chuyển sang chế độ Chỉ đọc (Read-only view).
- Mọi chỉnh sửa sau khi nộp phải có yêu cầu mở khóa gửi tới BGH/Quản lý.
- Nhật ký hệ thống ghi nhận thời gian chấm, người chấm và các lần cập nhật điểm số.
