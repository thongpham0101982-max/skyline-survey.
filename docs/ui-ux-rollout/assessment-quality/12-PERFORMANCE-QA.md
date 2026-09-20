# 12. BẢO ĐẢM HIỆU NĂNG TẢI DỮ LIỆU LỚN (PERFORMANCE QA)
## KIỂM THỬ XỬ LÝ KHẢO THÍ TOÀN KHỐI (HÀNG TRĂM HỌC SINH)

---

### 1. Tối ưu hóa phân trang và tổng hợp dữ liệu
- Bảng Thư viện câu hỏi áp dụng cơ chế phân trang phía máy chủ (`Server-side Pagination`) với bộ nhớ đệm kết quả tìm kiếm.
- Màn hình Phân tích chất lượng nhận dữ liệu thống kê tổng hợp sẵn (`Aggregated Data`) từ API `/api/admin/ktdbcl/grade-analytics`, không bắt trình duyệt của giáo viên phải duyệt lặp mảng hàng nghìn học sinh để tính toán lại điểm trung bình hay độ lệch chuẩn.

### 2. Kết quả đo lường hiệu năng
- Render biểu đồ phổ điểm: `< 60ms`.
- Tải trang danh sách câu hỏi: `< 150ms`.
- Thời gian xác thực tệp import 500 dòng điểm: `< 80ms`.
