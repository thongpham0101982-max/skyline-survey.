# BÁO CÁO KIỂM THỬ HỒI QUY (REGRESSION TEST REPORT)
## Đánh Giá Tính Toàn Vẹn Của Hệ Thống Sau Khi Triển Khai Wave 3

---

### 1. KẾT QUẢ ĐỐI SOÁT CHỨC NĂNG

* **Tạo đối tượng theo dõi:** Hoạt động chính xác, lưu đúng phân loại và năm học.
* **Phân công giáo viên phụ trách:** Lưu đúng quan hệ `teacherId` và `targetId`.
* **Ghi nhận theo dõi tuần:** Ghi nhận thời gian thực, cập nhật trục Timeline ngay lập tức.
* **Lập đánh giá tháng:** Lưu trữ trọn vẹn kết luận và quyết định của hội đồng.
* **Đề xuất và phê duyệt chấm dứt:** Chuyển trạng thái sang `TERMINATED` mượt mà, không làm mất dữ liệu cũ.
* **Quy tắc chuyển tiếp năm học:** Kiểm thử chính xác trường hợp loại trừ học sinh chuyển trường.
* **Tích hợp Hồ sơ 360°:** Hiển thị tóm tắt đúng, không rò rỉ thông tin nhạy cảm.\n