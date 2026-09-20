# 04. QUẢN LÝ THƯ VIỆN CÂU HỎI (QUESTION BANK)
## KIỂM SOÁT METADATA, MỨC ĐỘ TƯ DUY VÀ PHÁT HIỆN TRÙNG LẶP

---

### 1. Phân loại mức độ tư duy chuẩn Bộ GD&ĐT
1. **Nhận biết (NHAN_BIET)**: Tái hiện kiến thức, định nghĩa, công thức cơ bản.
2. **Thông hiểu (THONG_HIEU)**: Giải thích, phân biệt, áp dụng trực tiếp vào bài toán mẫu.
3. **Vận dụng (VAN_DUNG)**: Kết hợp nhiều đơn vị kiến thức để giải quyết bài toán mới.
4. **Vận dụng cao (VAN_DUNG_CAO)**: Tư duy phản biện, giải quyết vấn đề thực tiễn phức tạp.

### 2. Nguyên tắc hiển thị giao diện Thư viện câu hỏi (High Data-Density UX)
- **Không đưa toàn bộ nội dung câu hỏi dài vào dòng Table**: Bảng chỉ hiển thị Mã câu, Môn học, Khối, Chủ đề, Mức độ, Loại câu, Tác giả và Trạng thái.
- **Xem trước qua DetailDrawer**: Khi nhấp vào hàng câu hỏi, hệ thống mở ngăn kéo `DetailDrawer` bên phải hiển thị toàn văn câu hỏi, các phương án A/B/C/D, đáp án đúng (tô màu xanh kèm icon kiểm tra), lời giải chi tiết và danh sách các đề thi đã từng sử dụng câu hỏi này.
- **Bảo toàn lịch sử đề thi (Versioning)**: Khi một câu hỏi đã từng xuất hiện trong đề thi chính thức trong quá khứ được chỉnh sửa, hệ thống tự động sinh phiên bản mới (`version 2`) mà không làm thay đổi nội dung lịch sử của đề thi cũ.
