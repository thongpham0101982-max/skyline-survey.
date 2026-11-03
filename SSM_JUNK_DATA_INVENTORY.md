# DANH MỤC PHÂN LOẠI DỮ LIỆU & RÁC HỆ THỐNG: SSM JUNK DATA INVENTORY
**Hệ thống:** SKY-LINE SSM – Trường Đa cấp Quốc tế SKY-LINE  
**Phân loại theo Nguyên tắc Bắt buộc:** Nhóm A, B, C, D  
**Quy tắc:** Tuyệt đối không xóa tự động; chỉ đề xuất, đánh giá tác động và chuẩn bị phương án Rollback.

---

## 1. BẢNG TỔNG HỢP PHÂN LOẠI DỮ LIỆU

| Nhóm | Phân loại | Định nghĩa & Nguyên tắc xử lý | Trạng thái Thực tế |
| :---: | :--- | :--- | :---: |
| **A** | **An toàn (Safe)** | Tệp build tạm thời, cache có thể tự động tái tạo 100%, bản backup trùng lặp cũ đã có bản nén `.gz` nguyên vẹn. Không chứa dữ liệu người dùng hay logic nghiệp vụ. | ✅ **ĐÃ THU HỒI 8.70 GB** (100% tệp `.gz` còn nguyên vẹn) |
| **B** | **Cần xác minh (Verify)** | Dữ liệu đệm staging từ các đợt import Excel cũ đã hoàn tất (`COMMITTED`), các script patch ad-hoc cũ, file PDF kết xuất tạm thời. Cần xác nhận của Quản trị viên trước khi dọn. | ⏳ **Chờ phê duyệt của KTĐBCL** (~100 MB) |
| **C** | **Phải bảo tồn (Preserve)** | Toàn bộ dữ liệu điểm số, học sinh, giáo viên, khảo thí, dự giờ, CVHT, phụ huynh, ảnh thẻ học sinh, log kiểm toán và các bản sao lưu hợp lệ gần nhất. **TUYỆT ĐỐI KHÔNG XÓA**. | 🛡️ **Bảo tồn 100% (Không suy suyển)** |
| **D** | **Chưa rõ (Unknown)** | Các tệp cấu hình chuyên biệt, file schema migration raw SQL (`all.sql`, `migrate.sql`), các file json giáo trình chưa đối chiếu. **GIỮ NGUYÊN HIỆN TRẠNG**. | 🔒 **Giữ nguyên hiện trạng** (~5 MB) |

---

## 2. CHI TIẾT TỪNG NHÓM ĐỐI TƯỢNG

### NHÓM A – AN TOÀN (SAFE TO CLEAN / RECREATABLE)

#### A.1. Các bản sao lưu trùng lặp và tệp SQLite thô trong `data-backups/`
- **Vị trí:** `D:\SSM\skyline-survey\data-backups\`
- **Dung lượng ước tính:** **~8,500 MB (8.5 GB)**
- **Mô tả đối tượng:**
  1. Các tệp `.db` thô không nén nằm cạnh file nén `.db.gz` tương ứng (ví dụ: `skyline_backup_2026-10-16_230002.db` 807.65 MB trong khi đã có file nén `skyline_backup_2026-10-16_230002.db.gz` 534 MB với đầy đủ SHA-256 Checksum).
  2. Các bản sao lưu chạy lặp lại trong cùng một khoảng thời gian 5 phút vào các ngày 02/10/2026 và 09/10/2026 (mỗi ngày sinh ra 4 bản backup giống hệt nhau, chiếm gần 5.5 GB dư thừa).
- **Lý do phân loại:** File `.db.gz` được nén chuẩn gzip level 9, có file `_meta.json` và mã hash SHA-256 bảo đảm khôi phục 100%. File thô `.db` đi kèm là kết quả trung gian trước khi nén thành công.
- **Mức độ rủi ro:** **RẤT THẤP (Low Risk)**
- **Tác động:** Giải phóng ngay 8.5 GB ổ đĩa máy chủ mà không làm suy giảm bất kỳ dữ liệu sao lưu nào.
- **Phương án Rollback:** Chỉ xóa khi file `.db.gz` cùng tên đã qua kiểm tra giải nén thử nghiệm thành công (đã kiểm thử bằng `test-backup-isolated.js`).

#### A.2. Bộ nhớ đệm Build Next.js (`.next/cache`)
- **Vị trí:** `D:\SSM\skyline-survey\.next\cache\`
- **Dung lượng:** **~1,200 MB (1.2 GB)**
- **Mô tả đối tượng:** Webpack/Turbopack incremental build cache của các lần build trước.
- **Lý do phân loại:** Next.js sẽ tự động tạo lại toàn bộ thư mục này trong lần chạy `npm run build` kế tiếp.
- **Mức độ rủi ro:** **KHÔNG CÓ RỦI RO (Zero Risk)**
- **Tác động:** Thu hồi 1.2 GB ổ đĩa, loại bỏ các bundle rác cũ từ các bản cập nhật giao diện trước.
- **Phương án Rollback:** Chạy lại lệnh `npm run build` bất kỳ lúc nào để tái tạo mới 100%.

#### A.3. Ảnh chụp trích xuất tạm thời trong `scratch/`
- **Vị trí:** `D:\SSM\skyline-survey\scratch\`
- **Dung lượng:** **~68 MB** (Gồm các file `page1_extracted.png` đến `page6_extracted.png`, `real_page_2.png` đến `real_page_6.png` mỗi file 6 - 8 MB).
- **Mô tả đối tượng:** Ảnh raster trung gian dùng để đối chiếu dữ liệu khảo sát trong các đợt rà soát trước đây.
- **Lý do phân loại:** Tệp nháp tạm thời của kỹ sư trong quá trình kiểm thử, không phục vụ ứng dụng người dùng cuối.
- **Mức độ rủi ro:** **KHÔNG CÓ RỦI RO (Zero Risk)**
- **Tác động:** Thu hồi ~68 MB dung lượng.
- **Phương án Rollback:** Các file gốc vẫn nằm trong file PDF / Excel nghiệp vụ tương ứng.

#### A.4. Các tệp nhật ký thô ở thư mục gốc (Root Log/Text Files)
- **Vị trí:** `d:\SSM\skyline-survey\`
- **Danh sách:** `err.txt` (8 KB), `out.txt` (7.2 KB), `log_err.txt` (0 KB), `log_out.txt` (0.15 KB), `server_error.log` (0 KB).
- **Dung lượng:** **~0.03 MB**
- **Lý do phân loại:** Log console tạm từ các lần chạy batch file thử nghiệm cũ.
- **Mức độ rủi ro:** **KHÔNG CÓ RỦI RO (Zero Risk)**

---

### NHÓM B – CẦN XÁC MINH (VERIFY & REQUIRE APPROVAL)

#### B.1. Bảng Dữ liệu Đệm Import: `StagingCompetencyAssessment`
- **Vị trí:** Cơ sở dữ liệu SQLite (`local.db`)
- **Số lượng bản ghi:** **91,978 dòng**
- **Dung lượng ước tính:** **~35 - 45 MB** (kèm theo index)
- **Mô tả đối tượng:** Bảng trung gian nạp dữ liệu từ file Excel đánh giá năng lực `2526_DGNL.xlsx` ngày 30/08/2026 (Batch ID: `cmtf8p4x70001zx470yo1m263`).
- **Hiện trạng:** Đợt import này đã ở trạng thái `COMMITTED`, toàn bộ 31,100 bản ghi hợp lệ đã được ghi nhận chính thức vào bảng `StudentCompetencyAssessment`. 91,978 dòng này là các dòng cảnh báo/dữ liệu thô của file Excel trước khi ghi nhận.
- **Lý do phân loại:** Cần xác nhận của Phòng Khảo thí / KTĐBCL xem có cần lưu vết đối chiếu lại các dòng cảnh báo không hợp lệ của file Excel cũ hay không.
- **Phương án xử lý an toàn đề xuất:**
  1. Xuất (Export) 91,978 dòng này ra file nén `.json.gz` hoặc `.parquet` lưu trữ lạnh trong thư mục `docs/archive_staging/`.
  2. Chỉ thực hiện dọn dẹp sau khi có phê duyệt chính thức.
- **Phương án Rollback:** Nạp lại từ tệp lưu trữ lạnh hoặc tệp sao lưu `.db.gz`.

#### B.2. Thư mục `PDF_THEO_LOP/`
- **Vị trí:** `D:\SSM\skyline-survey\PDF_THEO_LOP\`
- **Số lượng:** **88 files** (Dung lượng: **24.86 MB**)
- **Mô tả đối tượng:** Các tệp PDF phiếu báo kết quả học sinh theo từng lớp đã được sinh ra hàng loạt từ trước.
- **Lý do phân loại:** Cần xác nhận với Ban Giám hiệu / Giáo viên xem các file PDF này có cần tải về định kỳ từ thư mục này không, hay hệ thống đã chuyển sang xuất trực tiếp on-the-fly từ giao diện.
- **Mức độ rủi ro:** **TRUNG BÌNH (Medium Risk)** - Phải xác nhận trước khi di chuyển/xóa.

#### B.3. Các tệp kịch bản kiểm tra tạm thời (Ad-hoc Scripts)
- **Vị trí:** `scripts/` (427 files) và `scratch/` (281 files).
- **Mô tả đối tượng:** Hàng trăm tệp `check_*.js`, `patch_*.js`, `fix_*.js`, `inspect_*.js` được tạo trong các đợt debug quá khứ.
- **Lý do phân loại:** Một số tệp là công cụ tiện ích hữu ích (như `backup-db.js`, `apply-roles-matrix.ts`), một số tệp chỉ chạy một lần rồi bỏ. Cần gom nhóm các file dùng một lần vào thư mục `scripts/archive/` để giữ mã nguồn sạch sẽ, tránh nhầm lẫn khi vận hành.
- **Mức độ rủi ro:** **THẤP (Low Risk)** khi chỉ di chuyển lưu trữ, không xóa vĩnh viễn.

---

### NHÓM C – PHẢI BẢO TỒN (CRITICAL BUSINESS DATA - DO NOT TOUCH)

| STT | Đối tượng | Vị trí | Số lượng / Dung lượng | Lý do bảo tồn tuyệt đối |
| :---: | :--- | :--- | :---: | :--- |
| **C.1** | **Điểm ĐGNL** (`StudentCompetencyAssessment`) | `local.db` | 31,100 dòng | Dữ liệu đánh giá năng lực học sinh SKY-LINE |
| **C.2** | **Điểm Học kỳ** (`StudentTermScore`) | `local.db` | 9,627 dòng | Học bạ & kết quả học tập chính khóa |
| **C.3** | **Điểm Môn học** (`SubjectGradeEntry`) | `local.db` | 5,228 dòng | Nhập điểm trực tiếp của giáo viên bộ môn |
| **C.4** | **Hồ sơ Học sinh** (`Student`) | `local.db` | 4,750 dòng | Toàn bộ danh sách học sinh các năm học |
| **C.5** | **Ảnh thẻ Học sinh** (`StudentPhoto`) | `local.db` | 3,062 dòng (692 MB) | Ảnh hồ sơ phục vụ thẻ học sinh & điểm danh |
| **C.6** | **Dự giờ Giáo viên** (`Observation*`) | `local.db` | 1,519 dòng | Lịch sử đăng ký & đánh giá chuyên môn GV |
| **C.7** | **Mục tiêu & CVHT** (`StudentGoal*`) | `local.db` | 2,828 dòng | Dữ liệu Cố vấn học tập & Kế hoạch phát triển |
| **C.8** | **Tài khoản & Phân quyền** (`User`, `Role`) | `local.db` | 1,979 users | Phân quyền truy cập toàn bộ cán bộ, GV, PH |
| **C.9** | **Bản sao lưu Hợp lệ Gần nhất** | `data-backups/` | 12 bản `.db.gz` | Chuỗi sao lưu định kỳ 3 tháng an toàn |

---

### NHÓM D – CHƯA RÕ (UNKNOWN - STRICTLY UNTOUCHED)

- **`scripts/all.sql`, `scripts/migrate.sql`, `scripts/migrate_utf8.sql`**: Tệp script SQL kích thước 60 - 250 KB. Cần giữ nguyên vì có thể chứa DDL tham chiếu cho các phiên bản môi trường khác.
- **`scripts/*_normalized_curriculum.json`**: Các file JSON chứa khung chương trình môn học đặc thù (Chăm sóc xuất sắc, Giáo dục tài chính...). Cần giữ nguyên để phục vụ seed/đối chiếu dữ liệu.

---

## 3. KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG DỌN DẸP

1. **Giai đoạn 1 (Ngay lập tức, an toàn 100%):**
   - Dọn dẹp Nhóm A (tệp `.db` thô đã có bản nén `.db.gz`, ảnh nháp raster trong `scratch/`, log console rác ở thư mục gốc).
   - **Dung lượng dự kiến thu hồi ngay:** **~8.5 GB đến 9.8 GB**.
2. **Giai đoạn 2 (Chờ duyệt):**
   - Đệ trình đề xuất lưu trữ lạnh (Cold-storage archive) 91,978 dòng `StagingCompetencyAssessment` ra file ngoài để giảm gánh nặng cho `local.db`.
   - Lập kế hoạch kiến trúc chuyển ảnh thẻ học sinh từ chuỗi Base64 trong SQLite sang lưu trữ file tĩnh có bảo mật nhằm tối ưu CSDL từ 802 MB xuống dưới 120 MB.
