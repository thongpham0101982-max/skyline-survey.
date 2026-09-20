# 07. DEPENDENCY SECURITY & SUPPLY CHAIN AUDIT

---

## 1. KIỂM TOÁN DANH MỤC THƯ VIỆN (SUPPLY CHAIN AUDIT)
- **Cơ chế khóa phiên bản:** Tệp `package.json` và lockfile được khóa phiên bản nghiêm ngặt.
- **Nguồn gói (Registry):** 100% gói được cài đặt từ `registry.npmjs.org` chính thống qua kết nối HTTPS bảo mật.
- **Kiểm tra mã độc lúc cài đặt:** Loại trừ các package chứa `install scripts` không rõ nguồn gốc.

---

## 2. PHÂN LOẠI & ĐÁNH GIÁ CÁC GÓI TRỌNG YẾU

| Thư viện | Phiên bản | Phân loại | Tầm ảnh hưởng thực tế (Reachability) | Quyết định kỹ thuật |
|:---|:---:|:---:|:---|:---|
| `next` | 16.2.2 | Core Web | SSR, App Router, Route Handlers | **Giữ nguyên bản ổn định** |
| `react` / `react-dom` | 19.2.4 | UI Engine | Client & Server Components | **Giữ nguyên bản ổn định** |
| `@prisma/client` | 5.20.0 | Data Layer | Type-safe ORM queries | **Giữ nguyên bản ổn định** |
| `@libsql/client` | 0.8.0 | DB Driver | Turso LibSQL TLS client | **Giữ nguyên bản ổn định** |
| `bcryptjs` | 3.0.3 | Crypto | Băm và kiểm tra mật khẩu an toàn | **Giữ nguyên bản ổn định** |
| `xlsx` | 0.18.5 | Parser | Đọc file Excel nội bộ | **Giữ nguyên (Isolated parser)**|

---

## 3. NGUYÊN TẮC QUYẾT ĐỊNH NÂNG CẤP (DECISION FRAMEWORK)
- Tuyệt đối KHÔNG nâng cấp gói thư viện chỉ vì có phiên bản mới hơn trên thị trường.
- Chỉ xem xét cập nhật khi có lỗ hổng bảo mật nghiêm trọng (CVE Critical) đã được chứng minh có khả năng bị khai thác trực tiếp trên kiến trúc hiện tại của SSM.
