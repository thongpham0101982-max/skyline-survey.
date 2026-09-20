# 07. THUẬT TOÁN VÀ CÔNG THỨC TÍNH KẾT QUẢ (RESULT CALCULATION)
## QUY TẮC TÍNH ĐIỂM, ĐIỂM THƯỞNG VAI TRÒ VÀ ĐIỀU KIỆN CÔNG NHẬN

---

### 1. Công thức tính điểm trung bình tiêu chí có trọng số
$$\text{Điểm tiêu chí (Base Score)} = \frac{\sum (\text{Điểm Tiêu chí } i \times \text{Trọng số } i)}{\sum \text{Trọng số}}$$

### 2. Điểm thưởng vai trò (Role Bonus)
Để ghi nhận đóng góp dẫn dắt và trách nhiệm vượt trội của ban điều hành học sinh:
- **Trưởng nhóm (Leader) / Trưởng ban tổ chức**: $+0.5$ điểm.
- **Phó nhóm (Vice Leader) / Phụ trách kỹ thuật/hậu cần**: $+0.2$ điểm.
- **Thành viên tích cực / Thành viên**: $+0.0$ điểm.
*Lưu ý: Điểm tổng kết sau khi cộng thưởng không được vượt quá mức trần tối đa ($10.0$ điểm).*

### 3. Điểm phạt chuyên cần (Attendance Penalty)
- **Có mặt (PRESENT)**: Không trừ điểm ($0$).
- **Đi trễ (LATE)**: Trừ $0.5$ điểm chuyên cần.
- **Vắng có phép (ABSENT_EXCUSED)**: Miễn trừ đánh giá hoặc bảo lưu kết quả theo quy chế.
- **Vắng không phép (ABSENT_UNEXCUSED)**: Điểm tổng kết bằng $0$, tự động xếp loại `NOT_PASS` (Chưa đạt).

### 4. Thuật toán phân loại kết quả chung cuộc (Classification)
1. **Kiểm tra vi phạm tiêu chí bắt buộc**:
   Nếu tồn tại bất kỳ tiêu chí nào có cờ `isRequired = true` mà điểm $< 4.0$:
   $$\rightarrow \text{Xếp loại: } \mathbf{NOT\_PASS} \text{ (Chưa đạt - Không đạt tiêu chí bắt buộc)}$$
2. **Nếu không vi phạm, xếp loại theo điểm tổng kết**:
   - $\ge 9.0$: **Xuất sắc (EXCELLENT)**
   - $7.0 - 8.9$: **Tốt (GOOD)**
   - $5.0 - 6.9$: **Đạt (SATISFACTORY)**
   - $< 5.0$: **Chưa đạt (NOT_PASS)**
