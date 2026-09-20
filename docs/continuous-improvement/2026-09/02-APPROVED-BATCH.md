# 02. APPROVED IMPROVEMENT BATCH (THÁNG 10/2026)

---

### 1. PHẠM VI GÓI CẢI TIẾN NHỎ ĐÃ ĐƯỢC PHÊ DUYỆT (SEMVER v1.0.1-PATCH)
- **Tên gói:** `SSM-v1.0.1-OCTOBER-PATCH`
- **Số lượng:** 2 cải tiến tinh gọn có tác động trực tiếp:
  1. *Phím tắt điều hướng nhập điểm khảo thí:* Thêm handler phím mũi tên và Enter để nhảy ô nhập điểm kế tiếp.
  2. *Tối ưu hóa ảnh minh chứng:* Thiết lập thuộc tính `loading="lazy"` và giới hạn kích thước preview 800px.
- **Tiêu chí nghiệm thu (Acceptance Criteria):**
  - Thao tác bàn phím mượt mà không cần chuột.
  - Thời gian tải trang hoạt động có 20 ảnh giảm xuống dưới 1.5 giây.
  - 100% không làm thay đổi API contract hoặc schema CSDL.
