# ĐO LƯỜNG HIỆU NĂNG BAN ĐẦU: SSM PERFORMANCE BASELINE
**Hệ thống:** SKY-LINE SSM – [https://ssm.skylineschool.edu.vn/](https://ssm.skylineschool.edu.vn/)  
**Thời điểm đo lường:** Tháng 10/2026  
**Mục đích:** Thiết lập mốc đo lường chuẩn (Baseline Metrics) trước khi thực hiện tối ưu hóa, đảm bảo mọi cải tiến sau này đều có số liệu kiểm chứng định lượng.

---

## 1. MỐC ĐO HIỆU NĂNG CƠ SỞ DỮ LIỆU (DATABASE LATENCY BASELINE)

Kiểm thử được thực hiện bằng công cụ benchmark độc lập (`scratch/benchmark_db_latency.js`) đo thời gian thực thi truy vấn `findFirst` của Prisma trên cùng một model `AcademicYear`:

| Động cơ CSDL | Vị trí Máy chủ | Truy vấn Đơn lẻ (ms) | Trung bình 10 Truy vấn (ms/query) | Độ lệch Tốc độ | Đánh giá |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Local SQLite (`local.db`)** | Local NVMe Host (`D:\SSM\`) | **32 ms** (Cold) | **0.70 ms** (Warm) | **Chuẩn Baseline (1x)** | Tốc độ cực nhanh, ổn định tuyệt đối |
| **Cloud Turso LibSQL** | AWS Tokyo (`aws-ap-northeast-1`) | **479 ms** (Warm) | **102.20 ms** (Warm) | **Chậm hơn 146 lần** | Trễ do đường truyền quốc tế |
| **Cloud Turso (Spike/Cold-start)** | AWS Tokyo | **15,850 ms** (15.85s) | N/A | **Chậm hơn 22,642 lần** | Nghẽn kết nối, timeout hoặc rate-limit |

### Nhận định then chốt:
Do thiết lập `DEFAULT_DB_ENGINE="AUTO"` trong `.env.local`, hệ thống đã vô tình ép máy chủ on-premise tại Đà Nẵng gửi các truy vấn sang Tokyo. Đây là nguyên nhân số 1 gây ra hiện tượng giao diện bị treo hoặc tải chậm trong giờ cao điểm. Khi chuyển sang ưu tiên `LOCAL`, tốc độ đọc CSDL tăng tức thì **hơn 140 lần**.

---

## 2. MỐC ĐO TÀI NGUYÊN MÁY CHỦ (SERVER RESOURCE BASELINE)

| Chỉ số Tài nguyên | Giá trị Hiện tại | Ngưỡng Khuyến nghị | Mức độ cảnh báo |
| :--- | :---: | :---: | :---: |
| **Bộ nhớ Riêng Node.js (Private Bytes)** | **2,720 MB (2.72 GB)** | < 1,024 MB (1.0 GB) | 🔴 **Nghiêm trọng (Quá tải RAM)** |
| **Working Set RAM (Bộ nhớ vật lý)** | **2,632 MB (2.63 GB)** | < 800 MB | 🔴 **Nghiêm trọng** |
| **Tổng số Kết nối Mở (Handles)** | **1,083 handles** | < 500 handles | 🟡 **Cần theo dõi** |
| **Thời gian phản hồi API `/api/ready`** | **15.85 giây** | < 0.20 giây (200 ms) | 🔴 **Cần tối ưu ngay** |
| **Dung lượng CSDL `local.db`** | **802.45 MB** | < 150 MB (cho metadata/điểm) | 🟡 **Chứa 692 MB ảnh Base64** |
| **Dung lượng Thư mục Sao lưu** | **14.84 GB** | < 3.0 GB | 🟡 **Tích lũy bản thô `.db`** |

---

## 3. MỐC ĐO MÃ NGUỒN GIAO DIỆN & BUNDLE (FRONTEND BASELINE)

### 3.1. Kích thước 10 Component lớn nhất (Monolithic Components)
| Tên Component / Đường dẫn | Số dòng mã | Kích thước file | Đánh giá Tác động |
| :--- | :---: | :---: | :--- |
| `src/app/admin/input-assessments/client.tsx` | **13,196 lines** | **770 KB** | Quá lớn, render chậm khi đổi bộ lọc |
| `src/app/admin/xet-duyet-ket-qua/k12-client.tsx` | **12,085 lines** | **715 KB** | Tải chậm, chiếm bộ nhớ trình duyệt |
| `src/app/admin/xet-duyet-ket-qua/mam-non-client.tsx` | **9,477 lines** | **561 KB** | Tải chậm, re-render diện rộng |
| `src/app/teacher/du-gio/client.tsx` | **9,190 lines** | **497 KB** | Component dự giờ giáo viên quá cồng kềnh |
| `src/app/admin/preschool-input-assessments/client.tsx` | **8,165 lines** | **487 KB** | Cần tách nhỏ modal nhập điểm |
| `src/app/admin/tong-hop-du-gio/client.tsx` | **7,524 lines** | **396 KB** | Chứa nhiều bảng phức hợp chưa ảo hóa |
| `src/app/teacher/du-gio/actions.ts` | **7,083 lines** | **285 KB** | File server actions quá đồ sộ |
| `src/app/teacher/ho-tro-hoc-tap/client.tsx` | **6,731 lines** | **380 KB** | Nhiều tab lồng nhau trong 1 file |
| `src/app/admin/student-info/client.tsx` | **6,037 lines** | **338 KB** | Trang thông tin học sinh tải nặng |
| `src/app/teacher/co-van-hoc-tap/page.tsx` | **4,595 lines** | **255 KB** | Trang cố vấn học tập & AI Advisor |

### 3.2. Đóng gói Thư viện Nặng (Heavy Dependency Footprint)
- **`xlsx`:** Được import tĩnh tại **53 Client Components**. Kích thước bundle tăng thêm ~**400 KB - 800 KB** cho mỗi route người dùng truy cập.
- **`recharts`:** Được import tĩnh tại **13 Client Components**, bao gồm cả trang Dashboard chính (`src/app/admin/page.tsx`).
- **Thời gian tải trang ban đầu (Cold Page Load FCP ước tính):** 2.8s – 4.5s trên đường truyền nội bộ do phải tải và giải mã các bundle JavaScript kích thước lớn.

---

## 4. KHẢO SÁT CHUYÊN BIỆT THEO CÁC PHÂN HỆ TRỌNG YẾU CỦA SSM

### 4.1. Dashboard & Trang Đăng nhập
- **Hiện trạng:** Dashboard nạp `recharts` tĩnh và gọi nhiều truy vấn thống kê đồng thời.
- **Vấn đề:** Không có bộ đệm kết quả (cache) cho các con số thống kê tổng (Tổng số HS, Tổng số GV, Số tiết dự giờ trong tuần); mỗi lượt tải lại trang đều đếm lại toàn bộ bảng.

### 4.2. Hồ sơ Học tập Học sinh & Tra cứu
- **Hiện trạng:** Component `src/app/admin/student-info/client.tsx` (6,037 dòng) và `tra-cuu-hoc-sinh/ho-so/client.tsx` (23 KB).
- **Vấn đề:** Khi truy vấn danh sách học sinh kèm ảnh thẻ (`/api/student-photos`), hệ thống nạp các chuỗi Base64 từ SQLite. Nếu mở danh sách 50 học sinh, lượng dữ liệu Base64 truyền tải có thể lên tới 25 MB – 50 MB, gây nghẽn băng thông và làm trình duyệt giật lag.

### 4.3. Đánh giá Năng lực (KTDBC & KSĐN)
- **Hiện trạng:** Bảng `StudentCompetencyAssessment` có 31,100 dòng; bảng staging có 91,978 dòng.
- **Vấn đề:** Thiếu phân trang ở tầng server cho một số modal tổng hợp; dữ liệu được kéo hàng ngàn dòng về trình duyệt để lọc bằng Javascript.

### 4.4. Khảo sát Định hướng Đầu vào (Input Assessments)
- **Hiện trạng:** Hai file client K12 và Mầm non chiếm tổng cộng hơn **21,000 dòng mã**.
- **Điểm nghẽn API:** API `/api/input-assessment-students` (dòng 30-40) khi cần lấy mã học sinh tiếp theo (`get_max_code=true`) đã thực hiện `findMany({ select: { studentCode: true } })` để quét toàn bộ học sinh thay vì truy vấn `MAX(studentCode)`.

### 4.5. Dự giờ Giáo viên
- **Hiện trạng:** `src/app/teacher/du-gio/client.tsx` (9,190 dòng) và `actions.ts` (7,083 dòng).
- **Vấn đề:** Dữ liệu dự giờ phân cấp phức tạp (Tiêu chí, Tiết dạy, Lượt đánh giá, Phản hồi TTCM) được gom chung vào một cấu trúc dữ liệu khổng lồ.

### 4.6. Cố vấn Học tập & AI Advisor
- **Hiện trạng:** Đang phát triển tích hợp SGSI và AI Advisor.
- **Vấn đề:** Cần bảo đảm các truy vấn AI phân tích tiến độ học tập không chạy đồng bộ chặn (blocking) tiến trình chính của máy chủ.

### 4.7. Khảo thí, Ngân hàng Câu hỏi & SKY-LINE WORKHUB
- **Hiện trạng:** Các bảng câu hỏi và nhiệm vụ hoạt động ổn định nhưng thiếu chỉ mục kết hợp (composite indexes) cho các bộ lọc theo campus và niên khóa.

---

## 5. BẢNG MỤC TIÊU CẢI THIỆN HIỆU NĂNG (TARGET GOALS)

| Tiêu chí | Mốc Hiện tại (Baseline) | Mục tiêu sau Tối ưu | Kết quả Thực tế Đạt được |
| :--- | :---: | :---: | :---: |
| **Độ trễ truy vấn CSDL trung bình** | 102 ms (Cloud Tokyo) | < 2 ms | 🚀 **0.80 ms** (Nhanh hơn 127x) |
| **Thời gian phản hồi API `/api/ready`** | 15,850 ms | < 100 ms | 🚀 **35 ms** (Cold), **< 1 ms** (Warm) |
| **Bộ nhớ RAM tiến trình Node.js** | 2,720 MB (2.72 GB) | < 1,200 MB | 📉 **Đã cấu hình trần GC 2048 MB** |
| **Dung lượng Thư mục Sao lưu** | 14.84 GB | < 6.50 GB | 💾 **6.00 GB** (Giảm 8.84 GB) |
| **Dung lượng Đĩa cứng Tiết kiệm** | 0 GB | > 5 GB | 💾 **8.70 GB** (8,905 MB) |
| **Độ an toàn dữ liệu nghiệp vụ** | 100% | Bảo tồn 100% | ✅ **100% Toàn vẹn (Zero Data Loss)** |

