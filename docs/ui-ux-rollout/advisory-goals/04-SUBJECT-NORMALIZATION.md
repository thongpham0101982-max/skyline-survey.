# CHUẨN HÓA MÔN HỌC & ĐIỂM SỐ (SUBJECT NORMALIZATION)
## Kiến Trúc Phân Giải Văn Bản Thô Thành Mã Môn và Điểm Mục Tiêu

---

### 1. NGUYÊN TẮC BẤT BIẾN

1. **Bảo tồn Text gốc (`raw_input`):** Không bao giờ ghi đè hoặc làm biến mất chuỗi nhập liệu ban đầu của học sinh.
2. **Không tự suy đoán (No Guessing):** Khi một chuỗi chứa nhiều môn học hoặc không rõ nghĩa, hệ thống **không tự ý gán môn** mà đánh dấu cờ `isAmbiguous: true` và hiển thị *"Cần xác nhận môn học"*.
3. **Phân tích tập trung (Single Location):** Toàn bộ logic so khớp alias và phân giải điểm số nằm duy nhất tại `src/lib/advisory/subjectNormalization.ts`.

---

### 2. SƠ ĐỒ CHUYỂN HÓA DỮ LIỆU

```
Chuỗi nhập thô của HS (Raw Input)
        │  VD: "Toán: 7.5", "Tiếng Anh 8,0", "Học tốt môn Hóa 7.5"
        ▼
Xóa dấu & Chuẩn hóa Unicode (removeVietnameseTones)
        │
        ▼
So khớp từ điển Alias (CANONICAL_SUBJECTS)
        │
   ┌────┴───────────────────────────┐
   ▼                                ▼
Khớp đúng 1 môn              Khớp 0 hoặc >1 môn
   │                                │
Lấy Subject Code / ID         Đánh dấu isAmbiguous: true
   │                                │
Trích xuất điểm (Regex)       Ghi lý do: "Cần xác nhận môn học"
   │  VD: 7.5 / 7,5 / 8
   ▼
Trả về ParsedSubjectGoalResult
```

---

### 3. BẢNG MẪU PHÂN TÍCH THỰC TẾ (VALIDATION TEST CASES)

| Chuỗi nhập thô của học sinh | Môn chuẩn | Mã môn | Điểm trích xuất | Trạng thái phân tích |
| :--- | :--- | :---: | :---: | :--- |
| `Toán: 7.5` | Toán | `MAT` | `7.5` |  Thành công (Khớp chính xác) |
| `Toán 7,5` | Toán | `MAT` | `7.5` |  Thành công (Chuyển đổi dấu phẩy) |
| `Môn Toán: 8` | Toán | `MAT` | `8.0` |  Thành công (Số nguyên sang thập phân) |
| `English 7` | Tiếng Anh | `ENG` | `7.0` |  Thành công (Khớp alias tiếng Anh) |
| `Tiếng Anh: 7.0` | Tiếng Anh | `ENG` | `7.0` |  Thành công (Khớp tên chuẩn) |
| `Ngữ Văn - 8` | Ngữ văn | `LIT` | `8.0` |  Thành công (Xử lý dấu gạch ngang) |
| `Văn 8.0` | Ngữ văn | `LIT` | `8.0` |  Thành công (Khớp tên rút gọn) |
| `Anh 7.5` | Tiếng Anh | `ENG` | `7.5` |  Thành công (Khớp tên tắt) |
| `KHTN 8.0` | Khoa học tự nhiên | `SCI` | `8.0` |  Thành công (Khớp môn tích hợp THCS) |
| `Học giỏi Toán và Tiếng Anh 8.0`| *Không gán* | *null* | `8.0` | ⚠️ **Đa nghĩa (Ambiguous):** Cần xác nhận môn học |
| `Ngủ trước 22h tối mỗi ngày` | *Không gán* | *null* | *null* |  Mục tiêu phi môn học (Không tính điểm) |
| `Toán 15` | Toán | `MAT` | *null* | ⚠️ **Điểm ngoài thang (0-10):** Bỏ qua điểm |
| `Toán -2` | Toán | `MAT` | *null* | ⚠️ **Điểm âm:** Bỏ qua điểm |
| `Toán abc` | Toán | `MAT` | *null* | ⚠️ **Điểm không hợp lệ:** Bỏ qua điểm |\n