# 03. MÔ HÌNH DỮ LIỆU HOẠT ĐỘNG (ACTIVITY MODEL)
## CẤU TRÚC VÀ TRẠNG THÁI VÒNG ĐỜI

---

### 1. Phân loại hoạt động (Activity Categories)
Hệ thống chuẩn hóa 5 nhóm hoạt động chính:
- **STEM / NCKH**: Nghiên cứu khoa học, ngày hội STEM, chế tạo robot, dự án kỹ thuật số.
- **Hoạt động Thiện nguyện & Xã hội**: Dự án cộng đồng, quyên góp, thăm hỏi trung tâm bảo trợ, bảo vệ môi trường.
- **Văn hóa - Thể thao - Nghệ thuật**: Hội thao trường, giải bóng đá, biểu diễn âm nhạc, triển lãm mỹ thuật.
- **Kỹ năng sống & Dã ngoại**: Hội trại, hành quân dã ngoại, rèn luyện kỹ năng sinh tồn, kỹ năng thoát hiểm.
- **Hướng nghiệp & Khởi nghiệp**: Tham quan doanh nghiệp, ngày hội nghề nghiệp, dự án giả lập kinh doanh.

### 2. Vòng đời trạng thái (Activity Lifecycle States)
```
DRAFT (Bản nháp)
  ↓ (Quản lý hoàn tất cấu hình tiêu chí & phân công)
READY (Sẵn sàng / Đã công bố)
  ↓ (Bắt đầu diễn ra hoạt động, mở cổng đánh giá)
IN_PROGRESS (Đang diễn ra / Đang đánh giá)
  ↓ (Tất cả lớp đã nộp kết quả)
COMPLETED (Đã hoàn tất đánh giá)
  ↓ (BGH phê duyệt chính thức)
PUBLISHED (Đã công bố vào Hồ sơ 360°)
```

### 3. Cấu trúc trường dữ liệu (Schema Mapping)
- `ActivityCatalog`: Danh mục hoạt động mẫu cấp trường/hệ thống (`id`, `code`, `name`, `typeId`, `groupId`, `level`).
- `ActivityRecord`: Bản ghi đợt tổ chức cụ thể (`id`, `catalogId`, `name`, `date`, `semester`, `academicYearId`, `teacherId`, `status`).
- `ActivityParticipant`: Chi tiết tham gia của từng học sinh (`id`, `recordId`, `studentId`, `roleId`, `evalLevelId`, `achievementId`, `absenceReasonId`, `note`).
