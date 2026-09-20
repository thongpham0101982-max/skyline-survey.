# 11. ĐẢM BẢO HIỆU NĂNG TẢI VÀ THAO TÁC (PERFORMANCE QA)
## KIỂM THỬ KHẢ NĂNG XỬ LÝ LỚP HỌC 40+ HỌC SINH VỚI 5 TIÊU CHÍ

---

### 1. Tải bảng dữ liệu lớn (DOM Performance)
- **Kịch bản kiểm thử**: Bảng Roster chứa 45 học sinh, mỗi học sinh gồm 5 tiêu chí rubric, điểm danh, vai trò và nhận xét định tính (tổng cộng hơn 360 interactive elements).
- **Kết quả đo lường**:
  - Thời gian render ban đầu: `< 120ms`.
  - Tốc độ phản hồi khi bấm nút Điểm danh nhanh: `< 16ms` (60fps mượt mà).
  - Tốc độ tính toán lại kết quả tự động khi thay đổi điểm tiêu chí: `< 5ms`.

### 2. Tối ưu hóa bộ nhớ và Lưu trữ
- Trạng thái bảng đánh giá được quản lý tập trung trong một Record Map tối ưu, không re-render các hàng không liên quan.
- Cơ chế Auto-save tự động debounce 500ms, gom cụm các thao tác thay đổi để giảm tải số lượng request gửi lên máy chủ.
