# BÁO CÁO AUDIT UI/UX TOÀN DIỆN HỆ THỐNG SSM
## TÀI LIỆU 01: KIẾN TRÚC THÔNG TIN (INFORMATION ARCHITECTURE - IA)

> **Mục tiêu:** Rà soát phân tầng điều hướng, phân nhóm chức năng, cấu trúc URL và giải quyết tình trạng phân mảnh/trùng lặp giữa các phân hệ.

---

### 1. Hiện trạng Kiến trúc Điều hướng Hiện tại

Hệ thống SSM hiện đang chia tách làm 4 không gian điều hướng chính dựa trên phân quyền phiên đăng nhập:
1. **Admin Workspace (\/admin/*\):** Bao gồm 7 danh mục lớn với 28 module cấp 1 và 23 submodule cấp 2.
2. **Teacher Workspace (\/teacher/*\):** Phân chia thành 5 nhóm chữ cái (A. Công tác GVCN, B. Công tác GVBM, C. Hoạt động trải nghiệm, D. Dự giờ & PTCM, E. Công việc khác).
3. **Student Workspace (\/hocsinh/*\):** Bao gồm Cổng thông tin học sinh (\/hocsinh/portal\) và Khảo sát học sinh (\/hocsinh/hs-khaosat\).
4. **Parent Workspace (\/parent/*\):** Không gian hồ sơ con em và khảo sát phụ huynh.

---

### 2. Các Lỗi Kiến trúc Thông tin Phát hiện (IA Defects)

#### 2.1. Trùng lặp Chức năng trên Điều hướng (Duplicate Navigation Items)
* **Sổ theo dõi Hướng nghiệp:** Xuất hiện đồng thời tại Nhóm A (Mục 6 - \/teacher/orientation\) và Nhóm B (Mục 3 - \/teacher/orientation\). GVCN và GVBM cùng nhìn thấy chức năng này ở 2 vị trí khác nhau trên cùng một thanh Sidebar.
* **Hồ sơ Học sinh:** Xuất hiện tại \/admin/ho-so-hoc-sinh\ (Admin), \/teacher/ho-so-hoc-sinh\ (Teacher), \/admin/student-info\ (Nhập thông tin HS) và \/admin/student-portal\ (Cổng ảnh). Người dùng không phân biệt được đâu là trang tra cứu tổng quan và đâu là trang nhập liệu chuyên môn.
* **Dự giờ Mầm non:** Xuất hiện ở \/admin/du-gio-mam-non\ (menu riêng), \/admin/du-gio\ (tab mầm non), \/admin/tong-hop-du-gio?block=mammon\.

#### 2.2. Đứt gãy Liên kết và Lỗi Naming (Broken Links & Typo in Routes)
* **Submodules thiếu thuộc tính \href\:** Trong \src/config/modules.ts\, nhóm \CAU_HINH_KHAO_SAT\ khai báo 9 submodule con (\PRESCHOOL_INPUT_ASSESSMENTS\, \INPUT_ASSESSMENTS\, \INPUT_ASSESSMENTS_PERIODS\,...) nhưng **không có trường \href\**, khiến menu dropdown của Admin không thể nhấp chuyển trang trực tiếp.
* **Lỗi chính tả tham số URL (Query Typos):**
  * \TONG_HOP_DU_GIO_MN\: \/admin/tong-hop-du-gio?block=mammon\ (sai chính tả *"mammon"* thay vì *"mam-non"*).
  * \TONG_HOP_DU_GIO_DIEU_HANH\: \/admin/tong-hop-du-gio?block=dieuhan\ (sai chính tả *"dieuhan"* thay vì *"dieu-hanh"*).
* **Hardcode phiên bản bẻ cache trên đường dẫn:**
  * \/admin/ktdbcl/import-kqht?v=2.1\
  * \/admin/ho-so-hoc-sinh?v=2.1\
  Việc gắn \?v=2.1\ vào thanh điều hướng là kỹ thuật tạm bợ để vượt qua cache trình duyệt, gây mất thẩm mỹ và làm URL không thể đoán trước (unpredictable URL).

#### 2.3. Điều hướng quá sâu và phân tán Tab (Deep Nesting & Tab Sprawl)
* Mô hình Cố vấn học tập bị xé nhỏ: \/admin/co-van-hoc-tap?tab=presets\, \?tab=dashboard\, \?tab=consultations\ nhưng phía Teacher lại có \/teacher/co-van-hoc-tap\ với logic hoàn toàn khác.
* Khảo sát đầu vào có tới 5 màn hình rời rạc: \cau-hinh-khao-sat\, \input-assessments\, \student-info\, \phan-cong-khao-sat\, \xet-duyet-ket-qua\, người dùng phải chuyển trang liên tục để hoàn thành 1 chu trình tuyển sinh.

---

### 3. Đề xuất Tái cấu trúc Kiến trúc Thông tin Chuẩn hóa (Proposed SSM IA)

Hệ thống điều hướng phải tuân thủ nguyên tắc **Tối đa 3 tầng**:
\Phân hệ (Module) → Nhóm nghiệp vụ (Group) → Tính năng chi tiết (Feature)\.

\\\mermaid
graph TD
    SSM[Hệ thống Quản trị Chất lượng SSM]
    SSM --> M1[1. DỰ GIỜ & CHUYÊN MÔN]
    SSM --> M2[2. HỒ SƠ & HỌC SINH]
    SSM --> M3[3. KHẢO THÍ & ĐBCL]
    SSM --> M4[4. ĐÀO TẠO & NHÂN SỰ]
    SSM --> M5[5. KHẢO SÁT & Ý KIẾN]
    SSM --> M6[6. HỆ THỐNG & CẤU HÌNH]

    M1 --> M1_1[Lịch & Đăng ký Dự giờ]
    M1 --> M1_2[Đánh giá Tiết dạy K12 / MN / ESL]
    M1 --> M1_3[Tổng hợp & Ma trận Dự giờ]
    M1 --> M1_4[Xét duyệt & Đánh giá lại]

    M2 --> M2_1[Hồ sơ Học tập Toàn diện HSHS]
    M2 --> M2_2[Đánh giá Năng lực Radar]
    M2 --> M2_3[Cố vấn & Hỗ trợ Học tập]
    M2 --> M2_4[Hoạt động Trải nghiệm]

    M3 --> M3_1[Khảo sát Đầu vào K12 & MN]
    M3 --> M3_2[Sổ điểm & Nhận xét]
    M3 --> M3_3[Kỳ thi & Thành tích Học sinh]
    M3 --> M3_4[Nhập liệu & Import Dữ liệu]

    M4 --> M4_1[Hồ sơ Giáo viên & Nhân sự]
    M4 --> M4_2[Tổ Chuyên môn & Môn học]
    M4 --> M4_3[Lớp học & Phân công Giảng dạy]
    M4 --> M4_4[Thời khóa biểu]

    M5 --> M5_1[Khảo sát Sự hài lòng NPS]
    M5 --> M5_2[Biểu mẫu Khảo sát Nội bộ]
    M5 --> M5_3[Báo cáo & Phân tích Phản hồi]

    M6 --> M6_1[Cơ sở & Năm học]
    M6 --> M6_2[Người dùng & Phân quyền Chi tiết]
    M6 --> M6_3[Nhật ký Hệ thống Audit Logs]
    M6 --> M6_4[Cấu hình Trợ lý AI]
\\\

---

### 4. Bảng Đối chiếu Chuyển đổi Đường dẫn (Route Migration Matrix)

| Danh mục Cũ | Tên Cũ | Vấn đề | Đề xuất Chuẩn hóa | Lý do & Tác động |
|:---|:---|:---|:---|:---|
| \dmin/ma-tran-du-gio-ttcm\ | Ma trận dự giờ TTCM | File chỉ làm nhiệm vụ redirect | Hợp nhất chính thức vào \/admin/tong-hop-du-gio?tab=ma-tran\ | Xóa bỏ route rác, giảm 1 lượt nhảy trang |
| \dmin/ktdbcl/import-kqht?v=2.1\ | Import KQHT | Query param hardcode | \/admin/ktdbcl/import-kqht\ | URL sạch, quản lý cache qua HTTP header |
| \dmin/ho-so-hoc-sinh?v=2.1\ | Hồ sơ Học sinh | Query param hardcode | \/admin/ho-so-hoc-sinh\ | Chuẩn RESTful convention |
| \	eacher/orientation\ (Nhóm B) | Sổ theo dõi Hướng nghiệp | Trùng lặp với Nhóm A | Loại bỏ khỏi Nhóm B, chỉ giữ tại Nhóm A (GVCN) | Tránh hiểu nhầm quyền hạn giữa GVBM và GVCN |
| \dmin/tong-hop-du-gio?block=mammon\ | Tổng hợp Mầm non | Lỗi gõ "mammon" | \/admin/tong-hop-du-gio?block=mam-non\ | Chuẩn hóa slug tiếng Việt |
| \dmin/tong-hop-du-gio?block=dieuhan\ | Tổng hợp Điều hành | Lỗi gõ "dieuhan" | \/admin/tong-hop-du-gio?block=dieu-hanh\ | Chuẩn hóa slug tiếng Việt |
| \dmin/cau-hinh-khao-sat\ submodules | 9 mục con không href | Không click được | Bổ sung href định tuyến trực tiếp vào tab/trang con | Người dùng Admin truy cập nhanh 1 click |
