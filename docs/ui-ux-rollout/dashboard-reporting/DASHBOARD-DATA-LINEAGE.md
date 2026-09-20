# TRUY VẾT DÒNG DỮ LIỆU DASHBOARD (DASHBOARD DATA LINEAGE)
## BẢO ĐẢM NGUỒN GỐC VÀ CHỦ QUẢN CỦA MỌI CHỈ SỐ

---

| Chỉ số Dashboard | Phân hệ hiển thị | Module nguồn gốc | API / Dataset nguồn | Chủ quản công thức |
|---|---|---|---|---|
| Lượt & Tiến độ dự giờ | GV, TTCM, GĐCS, QA | Dự giờ CM | `/api/admin/du-gio/...` | Module Dự giờ |
| Tỷ lệ đạt mục tiêu & GAP | GV, TTCM, GĐCS, QA | Cố vấn học tập | `calculateSubjectGap()` | Module Cố vấn (Wave 2) |
| Số HS theo dõi can thiệp | GVCN, GĐCS, QA | Hỗ trợ & Tâm lý | `/api/teacher-student-records` | Module Hỗ trợ (Wave 3) |
| Đánh giá Hoạt động trải nghiệm | GV, GĐCS, QA | Trải nghiệm | `calculateStudentActivityResult()` | Module Trải nghiệm (Wave 4) |
| Phổ điểm & Đối chuẩn cơ sở | TTCM, GĐCS, QA | Khảo thí & ĐBCL | `/api/admin/ktdbcl/grade-analytics` | Module Khảo thí (Wave 5) |
| Tiến độ nộp sổ điểm | TTCM, GĐCS, QA | Khảo thí & ĐBCL | `/api/admin/ktdbcl/gradebook-lock` | Ban KT&ĐBCL |
