# 07. TECHNICAL DEBT & AGING REVIEW — 2026-Q3
## RÀ SOÁT NỢ KỸ THUẬT VÀ QUẢN TRỊ RỦI RƠ MÃ NGUỒN

---

### 1. BẢNG THEO DÕI NỢ KỸ THUẬT QUÝ 3/2026

| Mã nợ | Tên nợ kỹ thuật | Phân loại | Tuổi nợ (Aging) | Mức độ rủi ro | Phân hệ ảnh hưởng | Tình trạng hiện tại | Biện pháp giải quyết |
|---|---|---|:---:|:---:|---|:---:|---|
| **TD-01** | Bổ sung index kép cho bảng khảo thí lịch sử | Performance | 60 ngày | Thấp | Khảo thí | **ĐÃ XỬ LÝ (Phase 14)** | Migration index hoàn tất |
| **TD-02** | Chuẩn hóa toàn bộ schema Zod input form | Security | 45 ngày | Thấp | Khảo thí / Cố vấn | **ĐÃ XỬ LÝ (Phase 15)** | Zod validation toàn diện |
| **TD-03** | Mở rộng bộ test tự động luồng GAP Analysis | Testing | 30 ngày | Trung bình | Cố vấn / Khảo thí | **ĐÃ HOÀN THÀNH (Batch #01)** | 26 test assertions passed |
| **TD-04** | Dọn dẹp các selector CSS dư thừa của layout cũ | UI Debt | 20 ngày | Rất thấp | Shared Styles | **ĐANG THEO DÕI (WATCH)** | Đưa vào Monthly Batch #02 |

---

### 2. ĐÁNH GIÁ NỢ KỸ THUẬT GÂY NGUY CƠ HỒI QUY
- **Nợ gây lỗi lặp lại (Repeated Incident Risk):** **0 mục**. Không có khoản nợ kỹ thuật nào từng gây sự cố P0/P1 hoặc đe dọa sự ổn định dữ liệu.
- **Tuổi nợ trung bình (Average Debt Age):** Giảm từ 45 ngày xuống **20 ngày**.
- **Kết luận:** Tình trạng nợ kỹ thuật ở trạng thái **CONTROLLED & HEALTHY (ĐÃ ĐƯỢC KIỂM SOÁT HOÀN TOÀN)**.
