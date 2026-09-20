# 05. INCIDENT & RUNTIME ERROR AUDIT

---

## 1. SỔ TỔNG HỢP SỰ CỐ TỪ KHI GO-LIVE (INCIDENT LOG)

| Mã sự cố | Mức độ | Phân hệ bị ảnh hưởng | Nguyên nhân gốc rễ (Root Cause) | Lặp lại? | Biện pháp đã thực hiện |
|:---|:---:|:---|:---|:---:|:---|
| **INC-01** | **P2** | Email / Webhook | Webhook n8n gửi mail thông báo bị timeout 15 phút do mạng nhà mạng | **Không** | Tự động retry theo hàng đợi, không ảnh hưởng giao dịch SSM |
| **INC-02** | **P3** | Giao diện iPad | Thanh cuộn ngang bảng điểm bị ẩn trên iPad đời cũ tại cơ sở Hội An | **Không** | Bổ sung class `overflow-x-auto` và touch-scrolling |
| **INC-03** | **P3** | Đăng nhập | Giáo viên gõ nhầm chữ hoa/thường mã định danh giáo viên | **Không** | Bộ xử lý auth đã tự động chuẩn hóa `.trim().toUpperCase()` |

---

## 2. PHÂN TÍCH LỖI HỆ THỐNG RUNTIME (ERROR REVIEW)
- **Lỗi 5xx:** 0 bản ghi trong 30 ngày qua.
- **Lỗi xác thực (401/403):** 18 trường hợp do session hết hạn sau thời gian nhàn rỗi (idle timeout) đúng thiết kế an ninh.
- **Import Errors:** 0 lỗi làm sập hệ thống (mọi file lỗi format đều bị chặn ở Bước 2 Preview).
- **Timeout Errors:** 0 truy vấn CSDL bị chạm ngưỡng timeout 5,000 ms.
