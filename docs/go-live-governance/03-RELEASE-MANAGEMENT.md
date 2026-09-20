# 03. RELEASE MANAGEMENT, VERSIONING & PIPELINE

---

## 1. QUY ƯỚC ĐÁNH SỐ PHIÊN BẢN (SEMANTIC VERSIONING)
Hệ thống SSM tuân thủ nghiêm ngặt chuẩn **SemVer (MAJOR.MINOR.PATCH)**:
- **PATCH (ví dụ `1.0.1`):** Các bản vá lỗi nhỏ, tối ưu hiệu năng không làm thay đổi API contract hay giao diện lớn.
- **MINOR (ví dụ `1.1.0`):** Bổ sung tính năng mới, cải tiến UI/UX backward-compatible (tương thích ngược 100%).
- **MAJOR (ví dụ `2.0.0`):** Thay đổi kiến trúc lớn, cấu trúc dữ liệu niên khóa mới có ảnh hưởng workflow.

> [!CAUTION]
> Tuyệt đối cấm sử dụng các định danh phiên bản tự phát như: `final`, `final_fix`, `v1_new`, `production-ok`.

---

## 2. CÁC THỜI ĐIỂM ĐÓNG BĂNG PHÁT HÀNH (CHANGE FREEZE WINDOWS)
Trong các giai đoạn cao điểm nhạy cảm của năm học, áp dụng chính sách **Change Freeze** (chỉ cho phép Hotfix sự cố P0/P1 có văn bản phê duyệt đặc biệt):
- **Giai đoạn Kiểm tra Giữa kỳ (GK) & Cuối kỳ (CK):** 2 tuần trước và trong tuần thi.
- **Giai đoạn Khảo sát Chất lượng (KSCL) toàn hệ thống:** Toàn bộ thời gian tổ chức khảo thí.
- **Giai đoạn Giáo viên nhập điểm & Xét duyệt học tập cuối kỳ:** 10 ngày trước hạn đóng sổ điểm.
- **Giai đoạn Xuất báo cáo tổng kết năm học:** 2 tuần cuối tháng 5.
