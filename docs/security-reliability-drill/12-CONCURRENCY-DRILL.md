# 12. CONCURRENCY & DOUBLE SUBMIT DRILL REPORT (DRILL 8)

---

## 1. DIỄN TẬP THAO TÁC NHẤN ĐÔI LIÊN TIẾP (DOUBLE SUBMIT DRILL)
- **Tình huống:** Người dùng nhấn liên tục nhiều lần vào nút "Lưu đánh giá", "Nộp phiếu mục tiêu", hoặc "Điểm danh hoạt động" khi kết nối mạng có độ trễ cao.
- **Cơ chế phòng ngừa đã thiết lập:**
  1. *Client-side:* Nút bấm lập tức chuyển sang trạng thái `disabled` và hiển thị icon loading ngay trong lần click đầu tiên (`isSubmitting = true`).
  2. *Server-side:* Sinh mã định danh giao dịch duy nhất (Idempotency Key); nếu request thứ hai có cùng key gửi tới trong vòng 5 giây sẽ bị từ chối hoặc trả về kết quả của request đầu.
- **Kết quả:** Không tạo ra bất kỳ bản ghi trùng lặp nào trong CSDL.

---

## 2. DIỄN TẬP CẬP NHẬT ĐỒNG THỜI (CONCURRENT MODIFICATION DRILL)
- **Tình huống:** Hai thành viên ban giám hiệu cùng mở và chỉnh sửa cùng một phiếu dự giờ vào cùng một thời điểm.
- **Cơ chế:** Kiểm tra trường `updatedAt` / version của bản ghi.
- **Kết quả:** Bản ghi được cập nhật an toàn theo nguyên tắc bảo toàn lịch sử; hệ thống cảnh báo người dùng thứ hai nếu dữ liệu nguồn đã có sự thay đổi mới hơn trước khi lưu đè.
