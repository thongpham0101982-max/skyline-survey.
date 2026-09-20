# 06. INCIDENT & ERROR LOG — MONTH 1
## NHẬT KÝ THEO DÕI SỰ CỐ VÀ LỖI HỆ THỐNG TRONG THÁNG ĐẦU TIÊN

---

### 1. BẢNG PHÂN LOẠI SỰ CỐ THEO MỨC ĐỘ NGHIỆP VỤ

| Cấp độ sự cố | Tiêu chí định nghĩa | Số lượng Month 1 | Xử lý & Khắc phục | Thời gian xử lý trung bình (MTTR) |
|---|---|:---:|---|:---:|
| **P0 (Critical)** | Hệ thống ngưng trệ toàn bộ hoặc mất mát dữ liệu nghiêm trọng | **0 vụ** | Không phát sinh | - |
| **P1 (High)** | Phân hệ chính bị gián đoạn, ảnh hưởng diện rộng không có workaround | **0 vụ** | Không phát sinh | - |
| **P2 (Medium)** | Chức năng quan trọng bị chậm hoặc lỗi nhưng có phương án thay thế | **1 vụ** | Chậm tải ảnh minh chứng mạng 4G $\rightarrow$ Khắc phục trong Batch #01 | 1 ngày làm việc |
| **P3 (Low)** | Bất tiện nhỏ về thao tác giao diện, không làm sai lệch dữ liệu | **2 vụ** | Nhập điểm cần dùng chuột $\rightarrow$ Đã giải quyết trong Batch #01 | Đưa vào chu kỳ cải tiến |

---

### 2. PHÂN BỔ SỰ CỐ THEO DANH MỤC CHUẨN (INCIDENT CATEGORIES)
- `AUTH`: 0 | `RBAC`: 0 | `DATA`: 0 | `API`: 0 | `DATABASE`: 0 | `INFRASTRUCTURE`: 0.
- `PERFORMANCE`: 1 vụ (P2 - Tải ảnh ngoại khóa 4G).
- `FRONTEND`: 2 vụ (P3 - Thao tác phím nhập điểm).
- `EMAIL`: 1 vụ (P3 - Cấu hình SPF/DKIM hòm thư phụ huynh).
- `IMPORT / EXPORT`: 0 vụ.

---

### 3. KẾT LUẬN
Toàn bộ các sự cố nhỏ P2/P3 phát sinh đều đã được xử lý triệt để và kiểm chứng an toàn qua bản phát hành `v1.0.1`. Không có lỗi lặp lại đe dọa sự ổn định của hệ thống.
