# 08. SƠ ĐỒ NGUỒN DỮ LIỆU & ÁNH XẠ SCHEMA (DATA SOURCE MAP)
## SINGLE SOURCE OF TRUTH VÀ RANH GIỚI TRUY XUẤT

---

### 1. Ánh xạ Prisma Schema
| Thành phần giao diện SSM | Model Prisma | Trường dữ liệu tương ứng | Ranh giới |
|---|---|---|---|
| Danh mục loại hoạt động | `ActivityCategory` | `id`, `type`, `code`, `name`, `status`, `sortOrder` | Read-only |
| Danh mục chuẩn hoạt động | `ActivityCatalog` | `id`, `code`, `name`, `groupId`, `typeId`, `themeId`, `level` | Read-only |
| Bản ghi đợt tổ chức | `ActivityRecord` | `id`, `code`, `name`, `catalogId`, `date`, `semester`, `academicYearId`, `teacherId`, `status` | Read / Write |
| Bảng điểm danh & Chấm điểm | `ActivityParticipant` | `id`, `recordId`, `studentId`, `roleId`, `evalLevelId`, `achievementId`, `absenceReasonId`, `note` | Read / Write |
| Hồ sơ 360° học sinh (Tab Projects) | `StudentProjectExperience` | `studentId`, `teacherId`, `teacherName`, `projectName`, `role`, `result`, `notes` | Single Source of Truth |

### 2. API Endpoints
- `GET /api/teacher-student-records?action=getActivities`: Lấy danh sách hoạt động phân công cho giáo viên.
- `GET /api/teacher-student-records?action=getActivityRoster&recordId=X&classId=Y`: Lấy danh sách học sinh kèm trạng thái chấm điểm của lớp.
- `POST /api/teacher-student-records?action=saveProjectExperience`: Lưu kết quả đánh giá trải nghiệm của học sinh.
- `POST /api/teacher-student-records?action=bulkSaveActivityRoster`: Lưu đồng loạt bảng đánh giá lớp.
