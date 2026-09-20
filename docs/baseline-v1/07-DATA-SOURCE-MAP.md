# 07. SƠ ĐỒ NGUỒN DỮ LIỆU HỢP NHẤT (DATA SOURCE MAP)
## SINGLE SOURCE OF TRUTH VÀ RANH GIỚI TRUY XUẤT TOÀN SSM

---

| Lĩnh vực dữ liệu | Phân hệ chủ quản (Owner) | Bảng Prisma cơ sở | Ranh giới truy xuất |
|---|---|---|---|
| Hồ sơ học sinh & MOET | Hồ sơ 360° | `Student`, `Parent`, `StudentProfile` | Single Source of Truth |
| Đánh giá & Tiết dạy dự giờ | Dự giờ CM | `ObservationSlot`, `ObservationRegistration` | Single Source of Truth |
| Mục tiêu & Khoảng cách GAP | Cố vấn học tập | `StudentAcademicTarget`, `calculateSubjectGap()` | Single Source of Truth |
| Theo dõi can thiệp học sinh | Hỗ trợ & Tâm lý | `LearningSupportAssignment`, `StudentHelpRequest` | Single Source of Truth |
| Đánh giá dự án thực địa | Hoạt động trải nghiệm | `ActivityRecord`, `ActivityParticipant` | Single Source of Truth |
| Điểm kiểm tra & Phổ điểm | Khảo thí & ĐBCL | `Exam`, `ExamStudent`, `StudentAssessmentScore` | Single Source of Truth |
| Bảng điều hành tổng thể | Dashboard & Reporting | *Không lưu bảng mới* (Đọc tổng hợp từ 6 module trên) | Read / Aggregate Only |
