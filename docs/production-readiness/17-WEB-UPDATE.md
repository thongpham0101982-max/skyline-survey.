# 17. WEB CLIENT UPDATE & CACHE INVALIDATION STRATEGY

---

## 1. QUẢN LÝ TÀI NGUYÊN TĨNH & HASHING (STATIC ASSET VERSIONING)
- Tất cả file JS, CSS, Media được xuất ra kèm theo Content Hash duy nhất (ví dụ: `app-[hash].js`).
- Thiết lập header HTTP:
  - `Cache-Control: public, max-age=31536000, immutable` cho các file có hash.
  - `Cache-Control: no-cache, no-store, must-revalidate` cho file `index.html` và route RSC data payloads.

---

## 2. CƠ CHẾ CẬP NHẬT TỰ ĐỘNG CHO TRÌNH DUYỆT (SERVICE WORKER & PWA)
- Khi có bản release mới, ứng dụng tự động nhận diện version mismatch qua header phiên bản API.
- Hiển thị toast thông báo nhẹ nhàng: *"Hệ thống có phiên bản mới cập nhật. Nhấn [Làm mới] để áp dụng."*
- Tự động clear các cache cũ trong IndexedDB / CacheStorage khi nâng cấp phiên bản để tránh xung đột dữ liệu offline.
