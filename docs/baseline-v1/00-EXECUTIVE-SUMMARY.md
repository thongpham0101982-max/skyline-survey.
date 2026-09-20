# BÁO CÁO ĐIỀU HÀNH: SSM UI/UX BASELINE v1.0
## HỢP NHẤT TOÀN HỆ THỐNG VÀ ĐÓNG BĂNG TIÊU CHUẨN (FROZEN BASELINE)

---

### 1. Bối cảnh & Tầm nhìn Hoàn thành
Qua chuỗi 12 giai đoạn triển khai từ Foundation, Pilot Dự giờ đến 6 Wave của Rollout Framework (Hồ sơ học sinh 360°, Cố vấn & GAP, Hỗ trợ học tập, Hoạt động trải nghiệm, Khảo thí & Chất lượng, và Dashboard & Reporting), Hệ thống Quản lý Chất lượng Giáo dục Sky-Line (SSM) đã hoàn thành tái cấu trúc và chuẩn hóa toàn diện.

Giai đoạn **Phase 13 — System-Wide Consolidation & Final QA** không phải là giai đoạn redesign mới, mà là mốc chốt hạ chiến lược:
> **CONSOLIDATE → CLEAN → STANDARDIZE → VERIFY → REGRESSION → HARDEN → DOCUMENT → FREEZE BASELINE.**

### 2. Các Trụ Cột Đã Hợp Nhất Thành Công (The "ONE" Architecture)
1. **ONE Design System**: Chuẩn hóa toàn bộ Design Tokens (Màu Deep Pine `#003B3A`, thang màu trạng thái ngữ nghĩa, typography scale, spacing 8pt, radius 8/12px).
2. **ONE App Shell & Navigation**: Bố cục khung ứng dụng thống nhất giữa các phân hệ, loại bỏ hoàn toàn sự lệch lạc layout giữa Admin, Giáo viên và Phụ huynh.
3. **ONE Shared Component Strategy**: Bộ 17 UI primitives tại `src/components/ui/` đóng vai trò nền tảng dùng chung cho toàn bộ 83 components của hệ thống.
4. **ONE Subject Mapping**: Tái sử dụng đồng bộ `Canonical Subject ID` từ Wave 2 (`src/lib/advisory/subjectNormalization.ts`), triệt tiêu việc join môn học bằng chuỗi tự do.
5. **ONE GAP Strategy**: Một công thức tính khoảng cách mục tiêu $\mathbf{GAP} = 	ext{Target} - 	ext{Current}$ duy nhất (`src/lib/advisory/advisoryGapService.ts`), xóa bỏ hoàn toàn lỗi hiển thị `NaN`.
6. **ONE Source of Truth per Domain**: Mỗi phân hệ nghiệp vụ là chủ quản duy nhất của dữ liệu mình phụ trách (Dự giờ, Cố vấn, Hỗ trợ, Trải nghiệm, Khảo thí); Hồ sơ 360° và Dashboard chỉ đóng vai trò Read + Aggregate + Drill-down.
7. **ONE Metric Catalog**: Danh mục chỉ số điều hành chuẩn mực, mỗi KPI có định nghĩa, công thức và chu kỳ đồng bộ duy nhất.
8. **ONE RBAC & Privacy Model**: Phân quyền phân tách rõ rệt 5 nhóm vai trò (GV, TTCM, QLCM, GĐCS, Ban KT&ĐBCL), bảo vệ tuyệt đối dữ liệu ghi chú tâm lý nhạy cảm.

### 3. Trạng thái Đóng băng (Baseline Freeze)
Hệ thống chính thức khóa chuẩn mực **SSM UI/UX Baseline v1.0**. Mọi phát triển tính năng mới trong tương lai bắt buộc phải kế thừa nền tảng này và tuân thủ quy trình Change Control chặt chẽ.
