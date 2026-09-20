# 11. BẢO MẬT & KIỂM SOÁT TRUY CẬP (RBAC & SECURITY)
## BẢO VỆ TÍNH TOÀN VẸN CỦA ĐỀ THI VÀ SỔ ĐIỂM

---

### 1. Quy tắc Bảo mật Đề thi (Confidentiality)
- Đề thi và Đáp án chỉ được phép hiển thị cho Người ra đề, Tổ trưởng chuyên môn và Cán bộ Khảo thí được phân công.
- Giáo viên bộ môn chỉ được tiếp cận đề thi tại thời điểm mở cổng thi theo quy định.
- Nghiêm cấm lưu trữ toàn văn đề thi, đáp án hoặc danh sách điểm đầy đủ vào bộ nhớ tạm trình duyệt (`localStorage` / `IndexedDB`).

### 2. Quy trình Khóa sổ & Phê duyệt Mở khóa (Gradebook Lock Workflow)
1. Khi hết hạn nộp điểm theo kế hoạch, sổ điểm tự động chuyển sang trạng thái `LOCKED`.
2. Mọi thao tác chỉnh sửa sau thời điểm khóa đều bị từ chối ở tầng backend API.
3. Giáo viên cần sửa điểm phải gửi yêu cầu mở khóa (`TeacherGradebookUnlockRequest`) kèm lý do chi tiết.
4. Ban KT&ĐBCL hoặc BGH xem xét phê duyệt mở khóa trong khoảng thời gian nhất định (ví dụ: mở khóa trong 24 giờ).
