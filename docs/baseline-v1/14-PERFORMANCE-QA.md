# 14. BẢO ĐẢM HIỆU NĂNG TOÀN DIỆN (PERFORMANCE QA)
## ĐO LƯỜNG THỜI GIAN PHẢN HỒI VÀ TỐI ƯU HÓA TẢI TRANG

---

### Bảng Chỉ số Đo lường Thực tế:
| Tác vụ kiểm thử | Thời gian đo lường | Tiêu chuẩn mục tiêu | Đánh giá |
|---|:---:|:---:|:---:|
| Tải ban đầu Dashboard điều hành | `~1.2s` | `< 2.0s` | **PASS** |
| Render biểu đồ phổ điểm khảo thí | `~60ms` | `< 100ms` | **PASS** |
| Mở ngăn kéo DetailDrawer câu hỏi | `~16ms` (60fps) | `< 50ms` | **PASS** |
| Thao tác điểm danh 1-click lớp 40 HS | `~12ms` | `< 30ms` | **PASS** |
| Xác thực tệp nạp điểm Excel 500 dòng | `~75ms` | `< 200ms` | **PASS** |
