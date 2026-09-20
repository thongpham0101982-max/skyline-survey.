# 09. PHÂN TÍCH KHOẢNG CÁCH MỤC TIÊU (GAP ANALYSIS)
## KẾT NỐI KẾT QUẢ KHẢO THÍ VỚI MỤC TIÊU HỌC SINH TỪ WAVE 2

---

### 1. Công thức và Quy ước dấu
$$\mathbf{GAP} = \text{Target (Mục tiêu HS)} - \text{Current (Điểm thi thực tế)}$$
- $\mathbf{GAP} \le 0$: Học sinh đã **Đạt hoặc Vượt mục tiêu** (Tô màu Xanh lục).
- $0 < \mathbf{GAP} \le 0.5$: Học sinh **Tiệm cận mục tiêu** (Tô màu Xanh lam).
- $\mathbf{GAP} > 0.5$: Học sinh **Cần nỗ lực** (Tô màu Vàng hổ phách / Đỏ).

### 2. Triệt tiêu hoàn toàn mã lỗi NaN
Tuân thủ chuẩn mực từ Wave 2:
- Nếu chưa có điểm thực tế: Hiển thị ký hiệu `—` và nhãn `Chưa có điểm`.
- Nếu học sinh chưa đặt mục tiêu: Hiển thị nhãn `Chưa thiết lập mục tiêu`.
- Tuyệt đối không để xảy ra hiện tượng hiển thị chuỗi `NaN` hoặc `undefined` trên giao diện người dùng.
