# 05. MA TRẬN ĐỀ KIỂM TRA (EXAM MATRIX)
## QUY CHUẨN CẤU TRÚC ĐỀ VÀ KIỂM TRA TÍNH KHẢ DỤNG

---

### 1. Cấu trúc chuẩn của Ma trận đề
Mỗi ma trận đề thi phải định nghĩa chi tiết theo dạng bảng ma trận:
- **Chủ đề / Mạch kiến thức**: Phân rã theo chương trình học.
- **Mức độ tư duy**: Nhận biết / Thông hiểu / Vận dụng / Vận dụng cao.
- **Số lượng câu hỏi**: Số câu tương ứng với từng mức độ.
- **Điểm số trên mỗi câu**: Điểm thành phần.
- **Tổng điểm**: Bắt buộc chuẩn hóa tổng điểm bằng đúng **10.0 điểm**.

### 2. Thuật toán kiểm tra tính khả dụng kho câu hỏi (Matrix Validation)
1. **Kiểm tra quỹ câu hỏi trong thư viện**:
   $$\text{Available in Bank} \ge \text{Required by Matrix}$$
   - Nếu `Available < Required`: Báo lỗi chặn (`ERROR`) — Không thể tạo đề vì thiếu câu hỏi trong thư viện.
   - Nếu `Available < 2 * Required`: Báo cảnh báo (`WARNING`) — Quỹ câu hỏi chưa đủ dồi dào để sinh $\ge 05$ mã đề hoán vị an toàn.
2. **Kiểm tra độ lệch tổng điểm**:
   $$\Delta = |10.0 - \sum \text{Điểm các câu}|$$
   Nếu $\Delta > 0.01$: Báo lỗi chặn cấu hình điểm ma trận.
