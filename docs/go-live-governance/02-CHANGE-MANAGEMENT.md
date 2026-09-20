# 02. CHANGE MANAGEMENT POLICY & APPROVAL WORKFLOW

---

## 1. PHÂN LOẠI CÁC DẠNG THAY ĐỔI (CHANGE TYPES)
Mọi thay đổi trên hệ thống SSM bắt buộc phải được gắn đúng nhãn phân loại:

1. **BUG:** Sai lệch hành vi so với đặc tả kỹ thuật/nghiệp vụ đã duyệt.
2. **HOTFIX:** Khắc phục khẩn cấp sự cố P0/P1 gây gián đoạn vận hành.
3. **UI/UX IMPROVEMENT:** Cải tiến trải nghiệm dựa trên phản hồi và số liệu drop-off (tuân thủ Design System tokens).
4. **BUSINESS RULE CHANGE:** Thay đổi công thức tính GAP, trọng số đánh giá, quy trình duyệt phiếu, trạng thái niên khóa.
5. **NEW FEATURE:** Chức năng nghiệp vụ mới hoàn toàn chưa từng có trong Baseline.
6. **DATA CHANGE:** Hiệu chỉnh dữ liệu danh mục môn học, chuyển lớp hàng loạt, cấu hình năm học mới.
7. **API CHANGE:** Thêm trường dữ liệu, thay đổi endpoint hoặc contract dữ liệu.
8. **RBAC CHANGE:** Điều chỉnh ma trận quyền hạn, phân bổ phạm vi cơ sở (campus scoping).
9. **INFRASTRUCTURE CHANGE:** Cấu hình Vercel, Turso LibSQL cluster, DNS, caching rules.
10. **SECURITY PATCH:** Vá lỗi thư viện phụ thuộc, cập nhật chứng chỉ bảo mật.
11. **TECHNICAL DEBT:** Tái cấu trúc mã nguồn, dọn dẹp hàm thừa, tối ưu hóa query.

---

## 2. MA TRẬN PHÊ DUYỆT THAY ĐỔI (APPROVAL MATRIX)

| Dạng thay đổi | Người đề xuất (Requester) | Thẩm định kỹ thuật (Technical) | Thẩm định dữ liệu/ĐBCL | Người phê duyệt cuối (Final Approval) |
|:---|:---|:---|:---|:---|
| **Hotfix (P0/P1)** | Kỹ sư On-call | Technical Lead | Báo cáo sau triển khai | Giám đốc Kỹ thuật (CTO) |
| **Bug thông thường** | Người dùng / QA | Tech Lead | QA Lead | Technical Lead |
| **UI/UX Improvement** | GV / TTCM / GĐCS | UI/UX Lead | Product Owner | Business Owner |
| **Business Rule Change**| Ban Giám hiệu / TTCM | Lead Architect | Trưởng ban KT&ĐBCL | Giám đốc Chất lượng Giáo dục |
| **RBAC / Data Change** | Phòng Nhân sự / Đào tạo | Security Lead | Data Owner | Trưởng ban ĐBCL |
| **New Feature** | Ban Lãnh đạo Sky-Line | Lead Architect | Trưởng ban KT&ĐBCL | Ban Giám đốc Hệ thống |
