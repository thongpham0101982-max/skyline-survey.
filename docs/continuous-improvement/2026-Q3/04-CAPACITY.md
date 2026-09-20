# 04. QUARTERLY CAPACITY & INFRASTRUCTURE SIZING

---

## 1. ĐÁNH GIÁ NĂNG LỰC TẢI THỰC TẾ
- **Dung lượng CSDL Turso LibSQL:** 1.85 GB / 10 GB giới hạn ban đầu (Mức sử dụng 18.5% $ightarrow$ Còn rất nhiều dư địa).
- **Mức tiêu thụ CPU bình quân:** 18% (Đỉnh điểm lúc 08:30 AM đạt 42% $ightarrow$ Dư địa trên 55%).
- **Mức tiêu thụ RAM (RSS):** ~320 MB trên mỗi instance Node.js.
- **Kết luận:** Chưa cần mở rộng hạ tầng (No scaling required), kiến trúc hiện tại vận hành hoàn hảo.
