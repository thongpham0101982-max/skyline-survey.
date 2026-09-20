# 08. DESIGN SYSTEM & SHARED COMPONENTS REVIEW — 2026-Q3
## KIỂM TOÁN TÍNH ĐỒNG BỘ THIẾT KẾ VÀ COMPONENT CHUNG

---

### 1. KIỂM TOÁN ĐỘ TRÔI DẠT THIẾT KẾ (DESIGN DRIFT AUDIT)

| Tiêu chí kiểm toán | Trạng thái ghi nhận | Kết quả đối soát | Đánh giá |
|---|---|:---:|:---:|
| **Bảng màu chuẩn (Color Tokens)** | 100% sử dụng CSS variables từ `design-system/ssm/MASTER.md` | **0 màu lạ (No drift)** | **STABLE** |
| **Nút bấm & Tương tác (Button Variants)** | Duy trì 4 biến thể chuẩn: `primary`, `secondary`, `outline`, `ghost` | **0 nút lệch chuẩn** | **STABLE** |
| **Bảng dữ liệu (Table Patterns)** | Chuẩn hóa header nền `sky-50`, hover `sky-50/40`, pagination đồng nhất | **Đồng bộ 100%** | **STABLE** |
| **Thẻ thông tin (Card Layouts)** | Bo góc chuẩn `rounded-xl`, đổ bóng nhẹ `shadow-sm`, border `slate-200` | **Đồng bộ 100%** | **STABLE** |
| **Hệ thống trạng thái (Status Badges)** | 5 mã chuẩn: `status-success`, `status-warning`, `status-danger`, `status-info`, `status-neutral` | **Đồng bộ 100%** | **STABLE** |
| **Khoảng cách & Bố cục (Spacing/Grid)** | Hệ thống lưới responsive 12 cột, padding/gap theo bước 4px (`p-4`, `p-6`) | **Đồng bộ 100%** | **STABLE** |

---

### 2. PHÂN LOẠI TRẠNG THÁI SHARED COMPONENTS

| Tên Component | Vị trí thư mục | Tần suất tái sử dụng | Trạng thái phân loại | Đề xuất quý tiếp theo |
|---|---|:---:|:---:|---|
| **StudentGoalCard** | `src/components/advisory/StudentGoalCard.tsx` | 214 lớp, Dashboard HS | **STABLE** | Duy trì ổn định |
| **SubjectGapTable** | `src/components/advisory/SubjectGapTable.tsx` | Khảo thí & Cố vấn | **STABLE** | Duy trì ổn định |
| **AdjustmentRequestPanel** | `src/components/advisory/AdjustmentRequestPanel.tsx` | Điều chỉnh mục tiêu | **STABLE** | Duy trì ổn định |
| **MetricCard / KpiSummary** | `src/components/dashboard/` | 4 cấp quản lý | **STABLE** | Duy trì ổn định |
| **ActivityCard / RosterTable** | `src/components/experiential/` | Hoạt động trải nghiệm | **STABLE** | Duy trì ổn định |
| **PsychologyAssessmentForm** | `src/components/support/` | Tư vấn tâm lý | **STABLE** | Duy trì ổn định |

- **Kết luận:** **Zero component bị DEPRECATED hoặc yêu cầu MIGRATION REQUIRED.** Thiết kế giao diện SSM đạt độ trưởng thành và đồng nhất rất cao.
