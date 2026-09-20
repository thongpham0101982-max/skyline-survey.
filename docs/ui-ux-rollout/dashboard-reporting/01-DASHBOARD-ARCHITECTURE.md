# 01. KIẾN TRÚC DỮ LIỆU DASHBOARD (DASHBOARD ARCHITECTURE)
## PHÂN TẦNG VÀ DÒNG CHẢY DỮ LIỆU TẬP TRUNG

```text
[SOURCE MODULES — CÁC PHÂN HỆ NGUỒN ĐÃ CHUẨN HÓA]
  - Dự giờ & Phát triển chuyên môn (Observation)
  - Cố vấn học tập & Mục tiêu học sinh (Advisory & GAP Engine)
  - Theo dõi hỗ trợ & Tâm lý học đường (Support & Intervention)
  - Quản lý hoạt động trải nghiệm (Experiential Activities)
  - Khảo thí & Đảm bảo chất lượng (Assessment & Quality Analytics)
  - Quản lý hồ sơ học sinh 360° (Student 360 Records)
        ↓
[DASHBOARD DATA CONTRACTS — HỢP ĐỒNG DỮ LIỆU CHUẨN]
  - Metric Definitions & Types (src/lib/dashboard/dashboardDataContract.ts)
  - Master Metric Catalog (Chỉ tiêu, Đơn vị, Tính chất cộng dồn, Chu kỳ đồng bộ)
        ↓
[AGGREGATION LAYER — LỚP TỔNG HỢP & PHÂN QUYỀN SCOPE]
  - dashboardAggregationService.ts
  - Server-side Aggregation (Giảm thiểu tính toán tại Client)
  - Scope Enforcement (Lọc đúng phạm vi thẩm quyền của Role)
        ↓
[ROLE-AWARE VIEWS — GIAO DIỆN PHÂN BIỆT THEO VAI TRÒ]
  - TeacherDashboardView (Tập trung việc cần làm & Lớp phụ trách)
  - TTCMDashboardView (Tiến độ & Đội ngũ giáo viên trong tổ)
  - QLCMDashboardView (So sánh giữa các tổ & Khối chuyên môn)
  - GDCSDashboardView (Executive Dashboard tổng thể cấp cơ sở)
  - QADashboardView (Giám sát toàn hệ thống & Chất lượng dữ liệu)
        ↓
[DRILL-DOWN & ACTION CENTER]
  - DrilldownDrawer (Xem chi tiết từng hàng)
  - Direct Action Links (Chuyển tiếp tác vụ không mất ngữ cảnh lọc)
```

---

### Nguyên tắc Bất biến:
- Dashboard không phải là nơi nhập liệu, không chứa form tạo mới/chỉnh sửa điểm số.
- Dashboard chỉ đọc từ các nguồn dữ liệu gốc để giữ trọn vẹn Single Source of Truth.
