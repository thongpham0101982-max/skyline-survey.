# 07. TECHNICAL DEBT STATUS & DESIGN DRIFT AUDIT

---

## 1. RÀ SOÁT SỔ ĐĂNG KÝ NỢ KỸ THUẬT (TECHNICAL DEBT REGISTER)

| Mã Nợ Kỹ thuật | Phân hệ | Mức độ rủi ro | Trạng thái hiện tại | Đánh giá tuổi thọ (Aging) | Kế hoạch xử lý |
|:---:|:---|:---:|:---:|:---:|:---|
| **TD-01** | Database Indexing | Low | **ĐÃ HOÀN THÀNH (CLOSED)** | 5 ngày | Tối ưu hóa composite index bảng `ExamScore` |
| **TD-02** | Frontend SWR Cache | Low | **ĐÃ HOÀN THÀNH (CLOSED)** | 7 ngày | Cache metadata tĩnh (danh mục cơ sở, môn học) |
| **TD-03** | E2E Test Suite | Medium | **ĐANG TIẾN HÀNH (IN PROGRESS)** | 14 ngày | Mở rộng test tự động cho khảo thí (Target v1.1.0) |
| **TD-04** | PDF Background Worker| Low | **ĐÃ LẬP KẾ HOẠCH (PLANNED)** | 20 ngày | Chuyển dịch vụ sinh PDF sang worker (Target v1.2.0) |

---

## 2. KIỂM TOÁN TRÔI DẠT THIẾT KẾ (DESIGN SYSTEM DRIFT AUDIT)
- **Mã màu tùy tiện (Hardcoded Colors):** 0 trường hợp mới phát sinh sau Baseline v1.0.
- **Component tự chế (Arbitrary Button/Modal/Table):** 0 component ngoại lệ (100% tái sử dụng `src/components/ui/`).
- **Khoảng cách và Typography:** 100% tuân thủ CSS variables của SSM Tokens.
- **Kết luận:** **Zero Design Drift (Không có trôi dạt thiết kế)**.
