# 06. FILE UPLOAD & BATCH IMPORT SECURITY AUDIT

---

## 1. QUY TRÌNH KIỂM SOÁT NHẬP DỮ LIỆU 5 BƯỚC (5-STEP IMPORT PIPELINE)

```text
[BƯỚC 1: TẢI TỆP LÊN (UPLOAD)]
  └─ Kiểm tra Content-Type thực tế, dung lượng giới hạn (< 10MB), phần mở rộng (.xlsx, .csv).
         │
         ▼
[BƯỚC 2: XÁC THỰC MẪU (VALIDATE)]
  └─ Đọc file trong bộ nhớ tạm (không ghi file thực thi), kiểm tra cấu trúc cột, kiểu dữ liệu từng ô.
         │
         ▼
[BƯỚC 3: XEM TRƯỚC VÀ ĐỐI SOÁT (PREVIEW)]
  └─ Hiển thị danh sách dòng hợp lệ và cảnh báo các dòng lỗi (thiếu mã HS, sai môn, sai cơ sở).
         │
         ▼
[BƯỚC 4: NGƯỜI DÙNG XÁC NHẬN (CONFIRM)]
  └─ Người dùng xem trước kết quả đối soát và nhấn "Xác nhận nhập dữ liệu".
         │
         ▼
[BƯỚC 5: LƯU TRỮ GIAO DỊCH (PERSIST)]
  └─ Chạy trong Prisma $transaction; ghi Audit Log đầy đủ số dòng thành công/thất bại.
```

---

## 2. KẾT QUẢ THỬ NGHIỆM DỮ LIỆU DỊ THƯỜNG (MALFORMED DATA DRILL)

| Dạng dữ liệu thử nghiệm | Hành vi của hệ thống | Đánh giá |
|:---|:---|:---:|
| **File Excel chứa Macro / Script VBA** | Trình đọc `xlsx` chỉ parse dữ liệu thô dạng text, vô hiệu hóa hoàn toàn mã nhúng | **PASS** |
| **Dòng dữ liệu cực dài (> 10,000 ký tự)** | Bị cắt ngắn và báo lỗi validate tại ô tương ứng, không gây tràn bộ nhớ | **PASS** |
| **Dòng thiếu mã học sinh (Missing ID)** | Đánh dấu lỗi dòng cụ thể, cho phép bỏ qua hoặc sửa, không làm hỏng cả tệp | **PASS** |
| **Dòng chứa mã cơ sở không thuộc quyền** | Bị từ chối tự động bởi rào chắn Scoping, không nhập chéo cơ sở | **PASS** |
| **Tên tệp chứa ký tự độc hại (`../../evil.xlsx`)** | Tên tệp được chuẩn hóa bằng uuid ngẫu nhiên `upload_[uuid].xlsx` an toàn | **PASS** |
