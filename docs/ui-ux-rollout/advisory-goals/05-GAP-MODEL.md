# MÔ HÌNH TÍNH TOÁN KHOẢNG CÁCH MỤC TIÊU (GAP MODEL)
## Công Thức Chuẩn, Nguồn Dữ Liệu và Phân Tích Diễn Biến (Trend)

---

### 1. CÔNG THỨC TÍNH TOÁN CỐT LÕI

Khoảng cách mục tiêu (GAP) được định nghĩa theo công thức:

$$\text{GAP} = \text{Target Score} - \text{Current Score}$$

* **Nếu Current $\ge$ Target (GAP $\le 0$):** Học sinh đã **Đạt** hoặc **Vượt** mục tiêu đề ra.
* **Nếu Current < Target (GAP $> 0$):** Khoảng cách điểm số học sinh cần nỗ lực cải thiện để về đích.

> [!NOTE]
> Hệ thống hiển thị số GAP một cách khách quan và mang tính xây dựng, tuyệt đối **không tự ý gán nhãn nguy hiểm / tiêu cực** gây áp lực tâm lý cho học sinh.

---

### 2. PHÂN KỲ ĐÁNH GIÁ VÀ XÁC ĐỊNH CURRENT SCORE

Điểm hiện tại (`Current Score`) bắt buộc phải gắn liền với một kỳ đánh giá cụ thể theo trình tự thời gian của năm học:

```
[KSCL: Khảo sát chất lượng đầu năm]
                ↓
[GK1: Đánh giá Giữa Học kỳ 1]
                ↓
[CK1: Đánh giá Cuối Học kỳ 1]
                ↓
[GK2: Đánh giá Giữa Học kỳ 2]
                ↓
[CK2: Đánh giá Cuối Học kỳ 2]
```

Hệ thống tự động xác định điểm thi của kỳ mới nhất được công bố để làm `Current Score`. Tuyệt đối không so sánh mục tiêu cuối năm với điểm số không rõ nguồn gốc.

---

### 3. DIỄN BIẾN TIẾN ĐỘ THỜI GIAN (COMPACT TREND)

Thay vì chỉ hiển thị một con số GAP tĩnh, SSM cung cấp chuỗi diễn biến rút gọn giúp giáo viên và học sinh nhận biết xu hướng tiến bộ:

* **Ví dụ 1 (Xu hướng tiến bộ liên tục):**
  $$\text{KSCL: } 6.0 \rightarrow \text{GK1: } 6.7 \rightarrow \text{CK1: } 7.2 \rightarrow \text{Target: } 8.0 \quad (\text{GAP: } +0.8)$$
* **Ví dụ 2 (Đã hoàn thành mục tiêu sớm):**
  $$\text{KSCL: } 7.0 \rightarrow \text{GK1: } 8.0 \rightarrow \text{Target: } 8.0 \quad (\text{Trạng thái: Đã đạt mục tiêu})$$
* **Ví dụ 3 (Chưa có điểm thực tế):**
  $$\text{Mục tiêu: } 7.5 \quad (\text{Chưa có kết quả})$$

---

### 4. PHÂN LOẠI TRẠNG THÁI HIỂN THỊ

| Trạng thái | Điều kiện | Nhãn hiển thị | Biến thể màu SSM |
| :--- | :--- | :--- | :--- |
| **Đạt / Vượt mục tiêu** | $\text{Current} \ge \text{Target}$ | `Đã đạt mục tiêu` hoặc `Vượt mục tiêu (+X.X)` | `status-success` (Xanh lá) |
| **Tiệm cận mục tiêu** | $0 < \text{GAP} \le 0.5$ | `Tiệm cận (-X.X)` | `status-warning` (Hổ phách) |
| **Cần nỗ lực** | $\text{GAP} > 0.5$ | `GAP: +X.X` | `status-info` (Xanh dương) |
| **Chưa có điểm** | Chưa có bài kiểm tra | `Chưa có điểm thực tế` | `status-neutral` (Xám) |\n