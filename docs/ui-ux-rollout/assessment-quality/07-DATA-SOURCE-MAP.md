# 07. SƠ ĐỒ NGUỒN DỮ LIỆU KHẢO THÍ (DATA SOURCE MAP)
## SINGLE SOURCE OF TRUTH VÀ RANH GIỚI TRUY XUẤT

---

### 1. Bảng ánh xạ Schema
| Thành phần nghiệp vụ | Bảng Prisma tương ứng | Trường dữ liệu cốt lõi | Quyền truy cập |
|---|---|---|---|
| Danh mục kỳ thi & Đợt thi | `Exam`, `ExamCategory`, `ExamRound` | `id`, `code`, `name`, `grade`, `academicYearId`, `startDate`, `endDate` | Read / Write |
| Điểm số kỳ thi & Thành tích | `ExamStudent`, `Achievement` | `id`, `examId`, `studentId`, `score`, `award`, `notes` | Read / Write |
| Sổ điểm môn học chính khóa | `StudentAssessmentScore` | `studentId`, `subjectId`, `scores`, `comments`, `updatedAt` | Single Source of Truth |
| Cấu hình ngưỡng chuẩn Benchmark | `SubjectBenchmarkConfig` | `id`, `academicYearId`, `subjectId`, `grade`, `evaluationPeriod`, `benchmarkScore` | Read / Write |
| Khóa sổ & Xin mở khóa | `TeachingAssignment`, `TeacherGradebookUnlockRequest` | `isLocked`, `unlockRequestStatus`, `unlockReason`, `lockedAt` | Read / Write |

### 2. API Endpoints
- `GET /api/admin/ktdbcl/grade-analytics`: API tổng hợp phân tích phổ điểm, thống kê mô tả, ma trận dịch chuyển và đối chuẩn cơ sở.
- `GET /api/admin/ktdbcl/grade-benchmarks`: Cấu hình ngưỡng chuẩn chất lượng môn học theo khối và kỳ.
- `POST /api/admin/ktdbcl/gradebook-lock`: Khóa và mở khóa sổ điểm bộ môn.
- `POST /api/teacher/grade-entries`: Nhập điểm chi tiết từng bài kiểm tra của giáo viên bộ môn.
