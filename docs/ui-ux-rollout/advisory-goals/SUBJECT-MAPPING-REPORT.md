# BÁO CÁO ÁNH XẠ MÔN HỌC (SUBJECT MAPPING REPORT)
## Danh Mục Phân Giải Từ Khóa Nhập Liệu Thô Sang Môn Học Chuẩn K12 Sky-Line

---

### 1. BẢNG TỪ ĐIỂN ÁNH XẠ MÔN HỌC CHUẨN (CANONICAL SUBJECT ALIASES)

| Raw Value (Từ khóa thô HS nhập) | Môn học chuẩn (Canonical Subject) | Mã môn (Subject Code) | Cấp học áp dụng | Độ tin cậy (Status) |
| :--- | :--- | :---: | :---: | :---: |
| `toan`, `mon toan`, `toan hoc`, `math`, `mathematics` | **Toán** | `MAT` | Toàn trường |  Khớp tuyệt đối |
| `tieng anh`, `anh`, `ta`, `english`, `esl` | **Tiếng Anh** | `ENG` | Toàn trường |  Khớp tuyệt đối |
| `ngu van`, `van`, `nv`, `mon van`, `tieng viet` | **Ngữ văn** | `LIT` | Toàn trường |  Khớp tuyệt đối |
| `vat ly`, `vat li`, `ly`, `mon ly`, `physics` | **Vật lí** | `PHY` | THPT |  Khớp tuyệt đối |
| `hoa hoc`, `hoa`, `mon hoa`, `chemistry` | **Hóa học** | `CHE` | THPT |  Khớp tuyệt đối |
| `sinh hoc`, `sinh`, `mon sinh`, `biology` | **Sinh học** | `BIO` | THPT |  Khớp tuyệt đối |
| `lich su`, `su`, `mon su`, `history` | **Lịch sử** | `HIS` | Toàn trường |  Khớp tuyệt đối |
| `dia ly`, `dia li`, `dia`, `mon dia`, `geography` | **Địa lí** | `GEO` | Toàn trường |  Khớp tuyệt đối |
| `khoa hoc tu nhien`, `khtn`, `khoa hoc`, `science` | **Khoa học tự nhiên** | `SCI` | THCS |  Khớp tuyệt đối |
| `lich su va dia ly`, `ls va dl`, `ls-dl`, `lsdl` | **Lịch sử và Địa lí** | `SOC` | THCS |  Khớp tuyệt đối |
| `tin hoc`, `tin`, `mon tin`, `informatics`, `it` | **Tin học** | `INF` | Toàn trường |  Khớp tuyệt đối |
| `giao duc cong dan`, `gdcd`, `dao duc`, `gdkt&pl` | **Giáo dục công dân** | `CIV` | Toàn trường |  Khớp tuyệt đối |
| `cong nghe`, `cn`, `technology` | **Công nghệ** | `TECH` | Toàn trường |  Khớp tuyệt đối |
| `mi thuat`, `my thuat`, `ve`, `art`, `arts` | **Mĩ thuật** | `ART` | Toàn trường |  Khớp tuyệt đối |
| `am nhac`, `nhac`, `music` | **Âm nhạc** | `MUS` | Toàn trường |  Khớp tuyệt đối |
| `giao duc the chat`, `gdtc`, `the duc`, `pe` | **Giáo dục thể chất** | `PE` | Toàn trường |  Khớp tuyệt đối |

---

### 2. XỬ LÝ CÁC TRƯỜNG HỢP ĐA NGHĨA (AMBIGUOUS CASES)

* **Trường hợp phát hiện nhiều môn trong 1 dòng:**
  * Ví dụ: *"Học giỏi Toán và Tiếng Anh"*, *"Cố gắng môn Văn, Sử"*
  * **Giải pháp:** Hệ thống đánh dấu `isAmbiguous: true`, không tự ý gán vào môn nào và hiển thị nhãn: `Cần xác nhận môn học`.
* **Trường hợp mục tiêu không chứa điểm số:**
  * Ví dụ: *"Chăm chỉ học môn Toán"*, *"Làm hết bài tập Tiếng Anh"*
  * **Giải pháp:** Ánh xạ đúng môn học (`MAT`, `ENG`), gán `targetScore: null`, đo lường tiến độ theo trạng thái hành động thay vì tính GAP điểm số.\n