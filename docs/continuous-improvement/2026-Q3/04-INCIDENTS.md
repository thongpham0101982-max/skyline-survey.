# 04. INCIDENT & RELIABILITY REVIEW — 2026-Q3
## BÁO CÁO PHÂN TÍCH SỰ CỐ VÀ ĐỘ TIN CẬY VẬN HÀNH

---

### 1. BẢNG TỔNG HỢP SỰ CỐ THEO PHÂN LOẠI TRONG QUÝ 3/2026

| Nhóm sự cố (Category) | Số lượng | Mức độ nghiêm trọng | Có lặp lại không? (Repeated) | Tác động thực tế (Impact) | Căn nguyên gốc rễ (Root Cause) |
|---|:---:|:---:|:---:|:---|:---|
| **Xác thực (Authentication)** | 0 | - | Không | Không có | Cơ chế NextAuth Session + JWT vận hành trơn tru |
| **Phân quyền (RBAC / IDOR)** | 0 | - | Không | Không có | Middleware và server actions kiểm tra quyền đa lớp chặt chẽ |
| **Tính toàn vẹn dữ liệu (Data Integrity)** | 0 | - | Không | Không có | Foreign keys và transactional consistency bảo đảm 100% |
| **API & Backend Logic** | 0 | - | Không | Không có | Rate limiting và Zod payload validation hoạt động tốt |
| **Cơ sở dữ liệu (Database)** | 0 | - | Không | Không có | Connection pool tối ưu, không có deadlocks |
| **Hiệu năng & Tải chậm (Performance)** | 1 | P3 (Minor) | Không | Giáo viên phản ánh tải ảnh hoạt động chậm ở mạng 4G sân bãi | Đã xử lý dứt điểm trong Batch #01 bằng Lazy loading |
| **Giao diện người dùng (Frontend UX)** | 2 | P3 (Minor) | Không | Thao tác nhập điểm bằng chuột tốn thời gian | Đã xử lý dứt điểm trong Batch #01 bằng phím Enter/Arrow |
| **Dịch vụ gửi Email (Mail/SMTP)** | 1 | P3 (Minor) | Không | 3 email thông báo phụ huynh vào hòm thư Spam | Đã cấu hình DKIM/SPF bản ghi DNS cơ sở trường |
| **Hạ tầng mạng & Máy chủ** | 0 | - | Không | Không có | Docker Container rolling update không downtime |

---

### 2. PHÂN TÍCH ĐỘ TIN CẬY & ỨNG VIÊN CĂN NGUYÊN (RELIABILITY & ROOT-CAUSE ANALYSIS)
- **Sự cố nghiêm trọng (P0/P1):** **0 vụ việc** trong suốt 90 ngày vận hành.
- **Hiện tượng lặp lại (Repeated Failure Pattern):** **KHÔNG CÓ.** Các vấn đề UX/Performance nhỏ phát sinh trong tháng 9 đều đã được xử lý triệt để trong Batch #01 và xác nhận đóng gói an toàn.
- **Đánh giá căn nguyên hệ thống:** Không có thành phần nào cần đánh dấu là `ROOT-CAUSE CANDIDATE` cho một đợt tái cấu trúc lớn.
