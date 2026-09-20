# ASSIGNMENT-AUDIT: KIỂM TOÁN QUY TRÌNH PHÂN CÔNG ĐÁNH GIÁ
## ĐẢM BẢO KHÔNG BỎ SÓT LỚP HỌC VÀ HỌC SINH

---

### 1. Cơ chế giám sát lớp chưa phân công (Unassigned Detection)
Hệ thống cung cấp widget cảnh báo trực quan cho Quản lý hoạt động:
- Hiển thị danh sách các lớp thuộc đối tượng tham gia nhưng chưa có GVCN tiếp nhận.
- Cảnh báo các lớp đã diễn ra hoạt động nhưng tiến độ chấm điểm `evaluationStatus = NOT_STARTED`.

### 2. Quy trình điều chuyển người chấm (Reassignment Workflow)
- Trong trường hợp GVCN vắng mặt hoặc đi công tác, Quản lý có thể chỉ định Giáo viên thay thế (Substitute Evaluator) với quyền hạn tạm thời mà không ảnh hưởng tới dữ liệu phân công gốc của năm học.
