# 06. THU NHẬN & ĐỐI SOÁT KẾT QUẢ THI (RESULT INTAKE)
## LUỒNG NẠP ĐIỂM ĐA NGUỒN VÀ CHÍNH SÁCH KIỂM SOÁT DỮ LIỆU

---

### 1. Quy trình Nạp điểm chuẩn 8 bước
```text
Tải tệp Excel / Kết xuất từ LMS
        ↓
Nhận diện định dạng cột & kỳ đánh giá
        ↓
Đối soát Student ID với cơ sở dữ liệu nhà trường (Không match bằng tên)
        ↓
Khớp môn học bằng Canonical Subject ID (Toán, Văn, Anh...)
        ↓
Kiểm tra tính hợp lệ của điểm số (Thang 0.0 - 10.0, định dạng thập phân)
        ↓
Phát hiện học sinh vắng (Đánh dấu VẮNG, không tự chuyển thành điểm 0)
        ↓
Phát hiện điểm trùng lặp & Áp dụng chính sách Overwrite (Keep / Replace)
        ↓
Xác nhận nạp và ghi vết lịch sử (Audit Trail)
```

### 2. Chính sách xử lý trùng lặp điểm số (Overwrite Policy)
Khi một học sinh đã có điểm của kỳ đánh giá đó:
- **Ghi đè bằng điểm mới (Replace)**: Áp dụng khi khảo thí phúc khảo hoặc nhập lại bảng điểm chính thức đã qua rà soát.
- **Giữ nguyên điểm cũ (Keep)**: Bỏ qua dòng mới, giữ an toàn dữ liệu đã có.
- Hệ thống hiển thị rõ ràng trên bảng Preview: `Điểm cũ vs Điểm mới` trước khi người dùng nhấn nút xác nhận lưu.
