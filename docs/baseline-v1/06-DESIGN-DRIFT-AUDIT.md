# 06. KIỂM TOÁN LỆCH CHUẨN THIẾT KẾ (DESIGN DRIFT AUDIT)
## KẾT QUẢ RÀ SOÁT MÀU SẮC, KHOẢNG CÁCH VÀ TYPOGRAPHY

---

### 1. Đánh giá Mức độ Lệch chuẩn
- **Màu sắc tự do (Arbitrary hex/rgb)**: Các phân hệ mới (Wave 1 đến Wave 6) đã được chuẩn hóa 100% về token màu Deep Pine và bảng semantic tokens của Tailwind.
- **Khoảng cách (Spacing)**: Toàn bộ padding, margin của các card và table container được chuẩn hóa về thang `p-3`, `p-4`, `space-y-4` (tương ứng 12px, 16px).
- **Bộ nút bấm (CTA Hierarchy)**: Loại bỏ các trang có quá nhiều nút Primary cạnh tranh; mỗi màn hình chỉ duy trì 1 Primary CTA duy nhất (ví dụ: "Lưu kết quả", "Nộp bảng điểm").
