# 08. TECHNICAL DEBT REGISTER — MONTH 1
## SỔ THEO DÕI VÀ QUẢN TRỊ NỢ KỸ THUẬT VẬN HÀNH

---

### 1. DANH MỤC NỢ KỸ THUẬT ĐƯỢC XÁC NHẬN (CONFIRMED TECH DEBT)

| Mã nợ | Lĩnh vực | Bằng chứng thực tế | Mức rủi ro | Mức độ tác động | Phân hệ ảnh hưởng | Tình trạng xử lý |
|---|---|---|:---:|:---:|---|:---:|
| **TD-01** | Performance | Thiếu index kép trên bảng điểm lịch sử | Thấp | Không gây chậm đáng kể | Khảo thí | **ĐÃ GIẢI QUYẾT** |
| **TD-02** | Security | Cần chuẩn hóa toàn bộ Zod validation | Thấp | Không có rò rỉ dữ liệu | Khảo thí / Cố vấn | **ĐÃ GIẢI QUYẾT** |
| **TD-03** | Testing | Thiếu bộ test tự động luồng GAP Analysis | Trung bình | Tiềm ẩn rủi ro khi tính điểm GK1 | Cố vấn / Khảo thí | **ĐÃ HOÀN THÀNH (Batch #01)** |
| **TD-04** | UI Debt | Một số selector CSS dư thừa trong file global | Rất thấp | Tăng dung lượng bundle ~2KB | Shared Layout | **THEO DÕI (Duyệt cho Batch #02)** |

---

### 2. ĐÁNH GIÁ NGUY CƠ NỢ KỸ THUẬT
- Không có khoản nợ nào gây rủi ro P0/P1 hoặc đe dọa toàn vẹn CSDL.
- Số lượng nợ kỹ thuật tồn đọng giảm xuống chỉ còn **1 mục (TD-04)** với mức rủi ro rất thấp.
- **Tình trạng nợ kỹ thuật:** **CONTROLLED & HEALTHY**.
