# 02. KIỂM KÊ VÀ PHÂN LOẠI ĐƯỜNG DẪN (ROUTE INVENTORY)
## BẢN ĐỒ ĐIỀU HƯỚNG VÀ DANH MỤC TRẠNG THÁI ROUTE

---

### 1. Danh mục Routes Chính Yếu (Core Active Routes)
| Tuyến đường (Route Path) | Phân hệ trực thuộc | Vai trò người dùng | Trạng thái |
|---|---|:---:|:---:|
| `/admin/ktdbcl/exams` | Khảo thí — Danh sách kỳ thi | Ban KT&ĐBCL, TTCM | `ACTIVE` |
| `/admin/ktdbcl/results` | Khảo thí — Nhập điểm & Kết quả | Ban KT&ĐBCL, Giáo vụ | `ACTIVE` |
| `/admin/ktdbcl/diem-nhan-xet` | Khảo thí — Sổ điểm & Phân tích | Ban KT&ĐBCL, GĐCS | `ACTIVE` |
| `/admin/ho-tro-hoc-tap` | Theo dõi hỗ trợ học tập | QLCM, BGH | `ACTIVE` |
| `/teacher` | Dashboard điều hành cá nhân | Giáo viên | `ACTIVE` |
| `/teacher/du-gio` | Dự giờ & Phát triển chuyên môn | Giáo viên | `ACTIVE` |
| `/teacher/ho-so-hoc-sinh` | Hồ sơ học sinh 360° | GVCN, Cố vấn | `ACTIVE` |
| `/teacher/co-van-hoc-tap` | Cố vấn & Mục tiêu học sinh | GVCN, Cố vấn | `ACTIVE` |
| `/teacher/ho-tro-hoc-tap` | Theo dõi hỗ trợ học tập & Tâm lý | GVCN, GV Bộ môn | `ACTIVE` |
| `/teacher/du-an-trai-nghiem` | Hoạt động trải nghiệm học sinh | GVCN, Phụ trách | `ACTIVE` |
| `/teacher/so-diem-nhan-xet` | Sổ điểm & Nhận xét bộ môn | GV Bộ môn | `ACTIVE` |

### 2. Kiểm soát Tuyến đường Di sản (Orphan / Legacy Routes)
- Toàn bộ 111 routes đều được liên kết trực tiếp vào hệ thống thanh điều hướng Sidebar hoặc menu chức năng.
- Không phát hiện "Orphan route" (tuyến đường mồ côi không có liên kết điều hướng).
- Tuyệt đối giữ nguyên vẹn đường dẫn URL hiện hành để không làm hỏng bookmark hay liên kết thông báo của nhà trường.
