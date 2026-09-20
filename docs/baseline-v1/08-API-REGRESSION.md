# 08. KIỂM THỬ HỒI QUY API (API REGRESSION REPORT)
## ĐẢM BẢO KHÔNG THAY ĐỔI API CONTRACTS HIỆN HÀNH

---

### Bảng Kết quả Kiểm thử các Endpoints Trọng Yếu
| Phân hệ | Endpoint cốt lõi | Phương thức | Kết quả | Bảo mật phân quyền |
|---|---|:---:|:---:|:---:|
| Khảo thí | `/api/admin/ktdbcl/grade-analytics` | `GET` | **PASS** | Kiểm tra quyền truy cập |
| Khảo thí | `/api/admin/ktdbcl/gradebook-lock` | `POST` | **PASS** | Kiểm tra quyền BGH/KT&ĐBCL |
| Dự giờ | `/api/teacher-assessments` | `GET/POST` | **PASS** | Kiểm tra quyền cá nhân |
| Hỗ trợ | `/api/teacher-student-records` | `GET/POST` | **PASS** | Khóa theo mã giáo viên |
| Cố vấn | `/api/advisory/status-warnings` | `GET` | **PASS** | Khóa theo lớp chủ nhiệm |
| Trải nghiệm | `/api/admin/experiential-activities/stats` | `GET` | **PASS** | Kiểm tra quyền quản lý |
