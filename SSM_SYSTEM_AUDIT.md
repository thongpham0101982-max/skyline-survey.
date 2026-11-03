# BÁO CÁO TOÀN DIỆN HỆ THỐNG: SSM SYSTEM AUDIT
**Hệ thống:** SKY-LINE SSM – Trường Đa cấp Quốc tế SKY-LINE  
**URL Chính thức:** [https://ssm.skylineschool.edu.vn/](https://ssm.skylineschool.edu.vn/)  
**Môi trường:** Production On-Premise (`10.0.10.18` / `192.168.10.239:3000`) & Cloud Failover (Turso LibSQL AWS Tokyo)  
**Thời điểm thực hiện Audit:** Tháng 10/2026  
**Chuyên gia phụ trách:** Senior Full-Stack Architect & Database Performance Engineer  

---

## 1. TỔNG QUAN KIẾN TRÚC & CÔNG NGHỆ (SYSTEM STACK)

| Thành phần | Công nghệ / Phiên bản | Ghi chú vận hành |
| :--- | :--- | :--- |
| **Framework Frontend & Server** | **Next.js 16.2.2 (App Router)** | Kiến trúc lai Server Components + Client Components |
| **Giao diện & UI Engine** | **React 19.2.4, TailwindCSS v4** | Sử dụng `@tailwindcss/postcss`, Radix/Base-UI, Lucide React |
| **Runtime Server** | **Node.js v22.23.2 (64-bit)** | Chạy dưới dạng service nền (PID 9560, custom `server.js`) |
| **Hệ điều hành Host** | **Windows Server / Windows On-Premise** | Cổng mạng 3000, reverse proxy từ `10.0.10.18` sang `ssm.skylineschool.edu.vn` |
| **Database Engine (Dual-Core)** | **SQLite 3 (`local.db`) & LibSQL Cloud (Turso)** | Kết nối qua `@libsql/client` (0.8.0) và `@prisma/adapter-libsql` |
| **ORM / Data Access Layer** | **Prisma 5.20.0** | Sử dụng `driverAdapters`, cơ chế Smart Failover Proxy |
| **Xác thực & Phân quyền** | **NextAuth.js v5.0.0-beta.30** | Lưu session/token trên database với phân quyền RBAC đa cấp |
| **Hệ thống Sao lưu** | **Hybrid Backup Engine (v2.0)** | Task Scheduler Windows (23h Thứ 6) + Passive Watchdog in-app |

---

## 2. PHÂN TÍCH TÀI NGUYÊN & HIỆN TRẠNG PHẦN CỨNG

### 2.1. Tiến trình Máy chủ (Node.js Process Metrics)
- **Tiến trình đang phục vụ:** PID `9560` (`node.exe` thực thi `start-server.js`)
- **Bộ nhớ Working Set (WS):** `2,632,804 KB` (~ **2.63 GB RAM**)
- **Bộ nhớ Riêng (Private Memory - PM):** `2,720,952 KB` (~ **2.72 GB RAM**)
- **CPU Time tích lũy:** `115.83 giây`
- **Số lượng File Handles:** `1,083 handles`
- **Đánh giá tải RAM:** Mức tiêu thụ bộ nhớ **rất cao (2.7GB)** đối với ứng dụng Node.js trường học. Nguyên nhân cốt lõi do nạp dữ liệu ảnh base64 kích thước lớn từ CSDL vào RAM, lưu trữ toàn bộ payload học sinh lớn trong bộ nhớ và các Client Component đơn khối (monolithic) kích thước hàng chục ngàn dòng mã.

### 2.2. Phân bổ Dung lượng Đĩa Cứng (Disk Storage Distribution)
Tổng dung lượng thư mục `d:\SSM\skyline-survey` (không tính `node_modules` và `.git`): **18.7 GB**

```
D:\SSM\skyline-survey
├── data-backups/          : 14,839.94 MB (~14.8 GB)  --> [CHIẾM 79.3% TỔNG Ổ ĐĨA]
├── .next/ (Build Cache)   :  1,399.03 MB (~1.4 GB)   --> [CHIẾM 7.5%]
├── local.db (CSDL chính)  :    802.45 MB (~802 MB)   --> [CHIẾM 4.3%]
├── scratch/ (Thư mục tạm) :     70.60 MB             --> [Ảnh xuất, test dump]
├── prisma/                :     50.66 MB             --> [Migrations, seeders]
├── PDF_THEO_LOP/          :     24.86 MB (88 files)  --> [PDF tổng hợp học sinh]
├── src/ (Mã nguồn)        :     18.77 MB (805 files)
├── public/                :      6.06 MB
├── .agents/               :      4.82 MB
├── scripts/               :      2.85 MB (427 files) --> [427 scripts ad-hoc]
├── docs/                  :      2.23 MB
└── Các file log thô root  :    ~0.03 MB
```

---

## 3. PHÂN TÍCH CHUYÊN SÂU CƠ SỞ DỮ LIỆU (DATABASE AUDIT)

### 3.1. Kích thước & Trạng thái Phân mảnh (Fragmentation Status)
- **Tập tin CSDL:** `D:\SSM\skyline-survey\local.db`
- **Kích thước vật lý:** `841,424,896 bytes` (**802.45 MB**)
- **Cấu hình trang:** `Page Size = 4096 bytes`, `Page Count = 205,426 trang`
- **Freelist Count (Trang rỗng do xóa bản ghi chưa VACUUM):** `0 trang` (**0.00 MB**)
  * *Kết luận:* Database **không bị phân mảnh do xóa dở dang**, mà dung lượng 802 MB là **dung lượng dữ liệu thực tế đang lưu trữ**.

### 3.2. "Điểm nóng" Dung lượng: Bảng `StudentPhoto`
Qua kiểm tra chi tiết từng bảng:
- Tổng số bảng trong CSDL: **118 bảng**
- Bảng `StudentPhoto` có **3,062 dòng**, nhưng tổng dung lượng cột `photoData` lên tới:
  $$\text{Dung lượng } \mathbf{StudentPhoto} = \mathbf{692.05\text{ MB}} \quad (\mathbf{86.2\%} \text{ toàn bộ CSDL!})$$
- **Nguyên nhân kỹ thuật:**
  1. Toàn bộ ảnh thẻ học sinh được chuyển thành chuỗi Base64 (tăng thêm 33% kích thước so với file ảnh nhị phân gốc) và lưu thẳng vào cột văn bản `photoData` trong SQLite.
  2. Tại API `src/app/api/student-photos/[studentId]/route.ts` (dòng 175-197), cơ chế đồng bộ ảnh tìm tất cả các năm học có cùng `studentCode` và sao chép nhân bản chuỗi Base64 ảnh vào **tất cả** các năm học đó. Một học sinh học 4 năm sẽ có 4 bản sao Base64 độc lập trong SQLite.

### 3.3. Dữ liệu Đệm & Staging Chưa Giải phóng: `StagingCompetencyAssessment`
- Bảng `StagingCompetencyAssessment` hiện lưu trữ **91,978 dòng** dữ liệu.
- Kiểm tra nguồn gốc: Toàn bộ 91,978 dòng này thuộc về duy nhất một đợt nhập điểm `IMP_NL_MTF8P4G4` (ngày 30/08/2026, file `2526_DGNL.xlsx`).
- Đợt nhập điểm này đã có trạng thái `COMMITTED` thành công vào bảng chính thức `StudentCompetencyAssessment` (**31,100 dòng** điểm chính thức đã được ghi nhận).
- 91,978 dòng dữ liệu staging này hiện không còn phục vụ nghiệp vụ hàng ngày nhưng vẫn chiếm tài nguyên index và bảng.

### 3.4. Thống kê Dòng các Bảng Nghiệp vụ Trọng yếu
| Tên Bảng | Số dòng | Vai trò & Tình trạng |
| :--- | :--- | :--- |
| `StagingCompetencyAssessment` | **91,978** | Dữ liệu staging đợt import cũ (Đã committed) |
| `StudentCompetencyAssessment` | **31,100** | Dữ liệu Đánh giá Năng lực chính thức (BẢO TỒN TUYỆT ĐỐI) |
| `StudentTermScore` | **9,627** | Điểm học kỳ học sinh (BẢO TỒN TUYỆT ĐỐI) |
| `StudentSubjectCompetencySummary` | **8,903** | Điểm tổng hợp môn năng lực (BẢO TỒN TUYỆT ĐỐI) |
| `Notification` | **7,217** | Thông báo hệ thống |
| `SubjectGradeEntry` | **5,228** | Bản ghi nhập điểm bộ môn (BẢO TỒN TUYỆT ĐỐI) |
| `Student` | **4,750** | Hồ sơ học sinh các năm (BẢO TỒN TUYỆT ĐỐI) |
| `StudentCodeMapping` | **3,126** | Mã định danh liên kết học sinh (BẢO TỒN TUYỆT ĐỐI) |
| `StudentPhoto` | **3,062** | Ảnh hồ sơ base64 (Chiếm 692 MB, BẢO TỒN TUYỆT ĐỐI) |
| `PreschoolDevScore` | **2,189** | Đánh giá phát triển Mầm non (BẢO TỒN TUYỆT ĐỐI) |
| `User` | **1,979** | Tài khoản Giáo viên, Phụ huynh, Ban giám hiệu |
| `InputAssessmentTeacherAssignment` | **1,528** | Phân công khảo sát đầu vào |
| `TeachingAssignment` | **1,207** | Phân công giảng dạy giáo viên |
| `ObservationRegistration` / `Slot` | **883 / 872** | Quản lý dự giờ giáo viên |
| `ActivityParticipant` | **734** | Hoạt động trải nghiệm |

---

## 4. PHÂN TÍCH MÃ NGUỒN & HIỆU NĂNG GIAO DIỆN (FRONTEND AUDIT)

### 4.1. "Siêu Thành phần" Đơn khối (Monolithic Client Components)
Khảo sát toàn bộ 805 files mã nguồn trong thư mục `src/`, phát hiện nhiều trang quản trị có dung lượng mã nguồn vượt ngưỡng thông thường của một component React:

1. `src/app/admin/input-assessments/client.tsx`: **13,196 dòng** (770 KB)
2. `src/app/admin/xet-duyet-ket-qua/k12-client.tsx`: **12,085 dòng** (715 KB)
3. `src/app/admin/xet-duyet-ket-qua/mam-non-client.tsx`: **9,477 dòng** (561 KB)
4. `src/app/teacher/du-gio/client.tsx`: **9,190 dòng** (497 KB)
5. `src/app/admin/preschool-input-assessments/client.tsx`: **8,165 dòng** (487 KB)
6. `src/app/admin/tong-hop-du-gio/client.tsx`: **7,524 dòng** (396 KB)
7. `src/app/teacher/du-gio/actions.ts`: **7,083 dòng** (285 KB)
8. `src/app/teacher/ho-tro-hoc-tap/client.tsx`: **6,731 dòng** (380 KB)
9. `src/app/admin/student-info/client.tsx`: **6,037 dòng** (338 KB)
10. `src/app/teacher/co-van-hoc-tap/page.tsx`: **4,595 dòng** (255 KB)

**Tác động hiệu năng:**
- **Bundle Bloat:** Mỗi file trên khi Next.js build ra tạo thành chunk JavaScript độc lập nặng hàng megabyte tải về trình duyệt.
- **Render Overhead:** Do chứa quá nhiều state trong một component duy nhất (danh sách học sinh, modal, bộ lọc, form chỉnh sửa, tab chuyển đổi), mỗi lần thay đổi 1 state nhỏ khiến toàn bộ cây Virtual DOM khổng lồ bị kiểm tra lại (re-render), gây hiện tượng giật/lag khi nhập liệu hoặc cuộn trang.

### 4.2. Đóng gói Thư viện Nặng (Heavy Dependencies Bundling)
- **`xlsx` (SheetJS):** Đang được **import tĩnh** (`import * as XLSX from "xlsx"`) tại **hơn 50 Client Components**. Thư viện này nặng ~800 KB uncompressed. Khi giáo viên hoặc nhân viên mở trang, toàn bộ mã phân tích Excel được tải ngay lập tức mặc dù người dùng chưa hề nhấn nút "Xuất Excel" hay "Nhập file".
- **`recharts`:** Đang được import tĩnh tại 13 trang quản trị và dashboard, làm chậm First Contentful Paint (FCP) và Time to Interactive (TTI).
- **`html2pdf.js`:** Được import để kết xuất phiếu báo điểm, cần đảm bảo giải phóng bộ nhớ Canvas để tránh memory leak trên trình duyệt.

---

## 5. PHÂN TÍCH MẠNG, API & ĐỊNH TUYẾN DỮ LIỆU (NETWORK & API AUDIT)

### 5.1. Nút thắt Vận chuyển Cơ sở Dữ liệu: Cấu hình `AUTO` vs `LOCAL`
Phát hiện lỗ hổng hiệu năng nghiêm trọng nhất trong cơ chế kết nối CSDL:
- Tệp cấu hình: `.env.local` thiết lập `DEFAULT_DB_ENGINE="AUTO"`.
- Mã nguồn `src/lib/db/index.ts` (dòng 43):
  ```typescript
  let currentEngine: 'CLOUD' | 'LOCAL' = (isVercel || configuredEngine !== 'LOCAL') ? 'CLOUD' : 'LOCAL'
  ```
- **Hậu quả:** Khi thiết lập `AUTO`, biểu thức `configuredEngine !== 'LOCAL'` cho kết quả `TRUE`. Do đó máy chủ tại Đà Nẵng **mặc định gửi toàn bộ truy vấn CSDL qua Internet sang máy chủ Turso tại Tokyo (AWS ap-northeast-1)**!
- **Đo lường thực tế:**
  * **LOCAL SQLite (`local.db`):** Độ trễ trung bình **0.70 ms/truy vấn** (dưới 1 phần nghìn giây).
  * **CLOUD Turso (Tokyo):** Độ trễ trung bình **102.20 ms/truy vấn**, và khi bị giới hạn kết nối hoặc mạng chập chờn có thể tăng vọt lên tới **15,850 ms (15.8 giây)** cho một truy vấn đơn giản.
  * Việc gửi hàng trăm truy vấn qua Tokyo thay vì đọc trực tiếp `local.db` trên ổ cứng NVMe máy chủ cục bộ chính là nguyên nhân hàng đầu khiến giao diện có lúc bị "xoay tròn" và thời gian phản hồi kéo dài.

### 5.2. Chống Caching Quá Mức trên API
Trong `next.config.js` (dòng 81-104), các đường dẫn `/admin/:path*`, `/teacher/:path*`, `/api/:path*` đều bị gán cứng:
```javascript
Cache-Control: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
```
Mặc dù điều này đảm bảo dữ liệu luôn tươi mới cho các thao tác CRUD, nó ngăn cản trình duyệt cache lại các danh mục tĩnh (ví dụ: Danh sách Niên khóa, Khối lớp, Cơ sở, Môn học, Thang điểm). Các danh mục này hầu như không thay đổi trong cả học kỳ nhưng vẫn bị ép tải lại 100% qua mạng mỗi lần chuyển trang.

---

## 6. KẾT LUẬN AUDIT
1. **Dữ liệu an toàn:** Không có dấu hiệu hư hại hoặc mất mát dữ liệu nghiệp vụ. Toàn bộ dữ liệu điểm số, học sinh, giáo viên, dự giờ đều toàn vẹn.
2. **Nguyên nhân chính gây chậm:**
   - Cấu hình điều phối database đang ưu tiên Cloud Tokyo thay vì Local SQLite tốc độ cao.
   - Thư viện `xlsx` và `recharts` import tĩnh vào Client Bundles.
   - Các Client Components kích thước > 5,000 dòng chưa phân rã hoặc lazy-load.
3. **Nguyên nhân chính gây đầy đĩa cứng & RAM:**
   - 14.8 GB backup tích lũy do lưu song song cả file `.db` thô và `.db.gz`, kèm các lượt chạy backup trùng lặp ngày cũ.
   - 692 MB ảnh thẻ học sinh lưu dưới dạng Base64 trực tiếp trong `local.db`.
   - 91,978 dòng staging import cũ chưa được lưu trữ (archive).
