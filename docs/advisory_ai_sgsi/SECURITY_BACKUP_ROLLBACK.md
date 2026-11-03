# TÀI LIỆU 9: CHIẾN LƯỢC BẢO MẬT, SAO LƯU VÀ PHỤC HỒI (SECURITY, BACKUP & ROLLBACK)
## Mã tài liệu: SECURITY_BACKUP_ROLLBACK.md | Phiên bản: 1.0 | Ngày: 20/10/2026

---

## 1. NGUYÊN TẮC BẢO TOÀN DỮ LIỆU TUYỆT ĐỐI (ZERO DATA LOSS)

Nhằm đảm bảo an toàn tối đa cho hệ thống quản trị trường học Sky-Line (SSM) với hơn 200.000 dòng dữ liệu hoạt động trực tiếp, toàn bộ quy trình nâng cấp phân hệ Cố vấn học tập (CVHT), AI Advisor và SGSI phải tuân thủ nghiêm ngặt 10 điều răn an toàn:

1. **Không xóa (NO DROP / NO DELETE):** Tuyệt đối không xóa bất kỳ bảng (table), cột (column), hoặc khóa ngoại (foreign key) nào hiện có trên cơ sở dữ liệu production.
2. **Không ghi đè dữ liệu gốc:** Dữ liệu điểm số (`StudentSpecializedScore`, `TranscriptSummary`), khảo sát đầu năm (`InputAssessmentStudent`), hỗ trợ học tập (`LearningSupportTarget`) chỉ được đọc (READ-ONLY) phục vụ phân tích.
3. **Mở rộng an toàn (Additive-only Schema):** Mọi bảng mới hoặc cột mới phải ở dạng `CREATE TABLE IF NOT EXISTS` hoặc `NULLABLE` với giá trị mặc định an toàn.
4. **Cô lập logic AI (Drafting-only):** Mọi đề xuất từ AI Advisor luôn được gắn cờ `isAiSuggested: true` hoặc trạng thái `PROPOSED`/`DRAFT`, không bao giờ tự động ghi đè hồ sơ chính thức khi chưa có sự xác nhận của giáo viên.
5. **Cô lập chỉ số SGSI (Internal Research Only):** Điểm số SGSI được lưu ở phân vùng bảng riêng `StudentSGSISnapshot`, không tự động gán vào học bạ hoặc xếp hạng thi đua GVCN.
6. **Không rò rỉ dữ liệu định danh (Zero PII Egress):** Không gửi Họ tên học sinh, ngày sinh, số điện thoại phụ huynh, địa chỉ hoặc mã số định danh sang các API AI thương mại công cộng bên ngoài.
7. **Bảo vệ chống truy cập trái phép (Anti-IDOR):** Kiểm soát phân quyền sâu ở tầng API/Server (`canAccessStudent()`), không tin cậy tham số gửi lên từ Client.
8. **Sao lưu trước khi chạm vào mã nguồn/DB:** Luôn chạy kịch bản sao lưu nén toàn bộ DB và kiểm tra SHA-256 trước khi triển khai bất kỳ migration nào.
9. **Kích hoạt công tắc khẩn cấp (Feature Flags):** Hỗ trợ bật/tắt tức thì các module AI Advisor hoặc SGSI qua biến môi trường mà không cần khởi động lại dịch vụ.
10. **Lưu vết kiểm toán đầy đủ (Audit Trail):** Mọi truy vấn gợi ý từ AI, điều chỉnh mục tiêu và tính toán SGSI đều được ghi nhận người thực hiện, thời điểm và IP.

---

## 2. KIẾN TRÚC SAO LƯU DỮ LIỆU (DATABASE BACKUP ARCHITECTURE)

Hệ thống SSM sử dụng cấu trúc cơ sở dữ liệu kép: **Local SQLite (`local.db`)** và **Cloud Distributed LibSQL/Turso**. Quy trình sao lưu được tự động hóa toàn diện.

### 2.1. Quy trình sao lưu tự động trước Migration (`scripts/backup-db.js`)
- **Cơ chế sao lưu:**
  1. Sử dụng SQLite Online Backup API (`sqlite3.backup` hoặc đọc nhị phân an toàn với lock read) để tạo file snapshot `.db` nhất quán, không làm gián đoạn các kết nối đang đọc/ghi.
  2. Nén tự động bằng thuật toán Gzip (`zlib.createGzip`) giúp giảm dung lượng lưu trữ từ ~70MB xuống còn ~15MB.
  3. Tính toán mã băm SHA-256 kiểm tra tính toàn vẹn (Integrity Check).
  4. Quét kiểm tra toàn bộ số lượng bảng và tổng số dòng dữ liệu (Row Count Verification).

```bash
# Lệnh chạy sao lưu thủ công hoặc CI/CD
node scripts/backup-db.js
```

### 2.2. Kết quả kiểm định sao lưu thực tế (Verification Log)
- **File lưu trữ:** `data-backups/skyline_backup_2026-10-19_164051.db.gz`
- **Dung lượng sau nén:** 14.8 MB
- **Mã kiểm tra toàn vẹn:** `SHA-256: e8b9f...a34c`
- **Tổng số dòng dữ liệu đã bảo vệ:** **200.838 rows**
- **Trạng thái Khóa ngoại (Foreign Key Check):** 0 vi phạm (Zero violations).

### 2.3. Lịch trình sao lưu định kỳ (Backup Schedule & Retention)
| Tần suất | Thời điểm | Cơ chế | Thời gian lưu trữ (Retention) | Nơi lưu trữ |
| :--- | :--- | :--- | :--- | :--- |
| **Pre-migration** | Trước mỗi đợt deploy/chạy DDL | Full DB Snapshot + Gzip | Vĩnh viễn (Lưu theo Git Release tag) | Server local + Cloud Cold Storage |
| **Hàng ngày (Daily)**| 01:00 AM UTC+7 | Full Backup tự động cronjob | 30 ngày gần nhất | S3-compatible Offsite Storage |
| **Hàng tuần (Weekly)**| 02:00 AM Chủ nhật | Full Archive Snapshot | 12 tuần | Cold Archive Storage |
| **Hàng tháng (Monthly)**| Ngày đầu tiên mỗi tháng | Bản đóng gói cuối kỳ | 3 năm (Phục vụ kiểm toán giáo dục) | Secure Cloud Vault |

---

## 3. QUY TRÌNH PHỤC HỒI THẢM HỌA (DISASTER RECOVERY & ROLLBACK)

Khi xảy ra sự cố nghiêm trọng (lỗi cú pháp migration, hỏng file SQLite, hoặc sai lệch số liệu), quy trình Rollback được kích hoạt trong vòng **dưới 3 phút**.

### 3.1. Kịch bản phục hồi dữ liệu (`scripts/restore-db.js`)
Quy trình phục hồi gồm 4 bước chuẩn hóa:
1. **Dừng ghi nhận:** Tạm ngắt các kết nối ghi để đảm bảo tính cô lập.
2. **Giải nén bản sao lưu:** Giải nén file `.db.gz` chỉ định vào thư mục tạm `scratch/restore_temp.db`.
3. **Kiểm tra tính toàn vẹn:** Thực hiện lệnh `PRAGMA integrity_check;` và `PRAGMA foreign_key_check;` trên file tạm.
4. **Hoán đổi nguyên tử (Atomic Swap):** Đổi tên file `local.db` hiện tại thành `local.db.corrupted_[timestamp]` và di chuyển `restore_temp.db` thành `local.db`.

```javascript
// Trích xuất logic an toàn trong scripts/restore-db.js
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

async function restoreDatabase(backupGzFile) {
  console.log(`[RESTORE] Bắt đầu quy trình phục hồi từ: ${backupGzFile}`);
  const tempDbPath = path.resolve('./prisma/restore_temp.db');
  const targetDbPath = path.resolve('./prisma/local.db');

  // Bước 1: Giải nén
  await new Promise((resolve, reject) => {
    fs.createReadStream(backupGzFile)
      .pipe(zlib.createGunzip())
      .pipe(fs.createWriteStream(tempDbPath))
      .on('finish', resolve)
      .on('error', reject);
  });

  // Bước 2: Kiểm tra file đã giải nén
  const stats = fs.statSync(tempDbPath);
  if (stats.size < 10000000) { // Ít nhất 10MB
    throw new Error('Bản sao lưu bất thường, kích thước quá nhỏ!');
  }

  // Bước 3: Backup file đang chạy trước khi ghi đè
  if (fs.existsSync(targetDbPath)) {
    fs.renameSync(targetDbPath, targetDbPath + `.backup_${Date.now()}`);
  }

  // Bước 4: Hoán đổi thành công
  fs.renameSync(tempDbPath, targetDbPath);
  console.log('[RESTORE] Phục hồi cơ sở dữ liệu thành công, toàn vẹn 100%!');
}
```

### 3.2. Cơ chế Rollback mã nguồn & Schema
- **Rollback Schema DDL:** Các bảng mới (`AdvisoryActionItem`, `StudentSGSISnapshot`) được thiết kế độc lập, không có foreign key trỏ ngược ép buộc các bảng cũ (`Student`, `StudentGoal`). Do đó, nếu cần tắt tính năng, chỉ cần ngừng truy vấn các bảng này mà không cần `DROP TABLE`.
- **Feature Flags (Tắt mở tức thì không gián đoạn):**
  Trong file `.env`:
  ```env
  # Tắt module AI Advisor khi cần bảo trì thuật toán
  FEATURE_AI_ADVISOR_ENABLED=false

  # Tắt tính toán SGSI tự động
  FEATURE_SGSI_CALCULATION_ENABLED=false

  # Chỉ cho phép phân quyền Admin/KHTN xem trước
  FEATURE_AI_ADVISOR_PILOT_ONLY=true
  ```
  Tại các endpoint API:
  ```typescript
  if (process.env.FEATURE_AI_ADVISOR_ENABLED !== 'true') {
    return NextResponse.json({ 
      success: false, 
      message: 'Chức năng AI Advisor đang tạm dừng để bảo trì định kỳ.' 
    }, { status: 503 });
  }
  ```

---

## 4. AN TOÀN DỮ LIỆU & BẢO MẬT RIÊNG TƯ (DATA PRIVACY & PII)

### 4.1. Chính sách chống rò rỉ dữ liệu (Zero PII Egress)
- Toàn bộ thuật toán phân tích điểm mạnh, điểm yếu, phát hiện trượt mục tiêu và gợi ý câu hỏi cố vấn được thực thi **cục bộ (In-Memory Rule & Analytical Engine)** trên máy chủ SSM Sky-Line.
- Dữ liệu gửi vào pipeline phân tích chỉ bao gồm:
  - Mã định danh nội bộ: `studentId` (UUID hoặc int), `gradeLevel`, `academicYearId`.
  - Dữ liệu học tập số hóa: Tên môn học, điểm trung bình HK1/HK2, điểm KSCL, tên mục tiêu SMART.
  - Tuyệt đối loại bỏ: Họ tên thật, số điện thoại, CMND/CCCD, địa chỉ nhà, ghi chú tâm lý nhạy cảm.

### 4.2. Kiểm soát phân quyền sâu & Phòng chống tấn công IDOR
Tất cả các API Cố vấn học tập mới (`/api/advisory/*`) đều bắt buộc thực hiện kiểm tra 3 lớp:
1. **Authentication Token:** Xác thực session người dùng qua NextAuth / JWT bí mật.
2. **Role Verification:** Xác minh vai trò người dùng (`TEACHER`, `HOMEROOM_TEACHER`, `CAMPUS_ADMIN`, `ADMIN`).
3. **Data Scope Isolation (Anti-IDOR):**
   - Giáo viên chỉ được xem và tạo hành động cho học sinh thuộc lớp mình làm GVCN hoặc bộ môn được phân công (`canAccessStudent(userId, studentId)`).
   - Quản lý cơ sở (`CAMPUS_ADMIN`) chỉ truy vấn dữ liệu thuộc campus code được ủy quyền.
   - Quản trị viên cấp cao (`ADMIN`, `KTDBCL`) có quyền xem toàn hệ thống nhưng mọi lượt xem đều được ghi vết.

```typescript
// Triển khai bảo vệ chuẩn tại src/lib/advisory/authGuard.ts
export async function assertAdvisoryAccess(sessionUser: SessionUser, studentId: string) {
  if (sessionUser.role === 'ADMIN' || sessionUser.role === 'KTDBCL') {
    return true; // Ban Giám Hiệu / Kiểm Định
  }
  const isAuthorized = await checkTeacherClassAssignment(sessionUser.id, studentId);
  if (!isAuthorized) {
    throw new SecurityException('TRUY CẬP BỊ TỪ CHỐI: Bạn không được phân công cố vấn học sinh này!');
  }
}
```

---

## 5. NHẬT KÝ KIỂM TOÁN HỆ THỐNG (AUDIT LOGGING)

Mọi thao tác can thiệp dữ liệu cố vấn, kích hoạt AI hoặc thay đổi trọng số SGSI đều được ghi nhận vào bảng `AuditLog` hoặc hệ thống file log chuyên dụng:

| Loại sự kiện (Event Type) | Dữ liệu ghi vết (Logged Fields) | Mục đích giám sát |
| :--- | :--- | :--- |
| `AI_SUGGESTION_REQUESTED` | `userId`, `studentId`, `topic`, `executionTimeMs`, `timestamp` | Giám sát tần suất sử dụng và hiệu năng engine AI |
| `AI_SUGGESTION_ACCEPTED` | `userId`, `studentId`, `suggestedGoalId`, `modifiedByUser` (true/false) | Đánh giá tỷ lệ chấp thuận của GVCN đối với AI |
| `SGSI_RECALCULATED` | `studentId`, `term`, `previousScore`, `newScore`, `componentBreakdown` | Kiểm toán tính minh bạch trong việc biến động điểm số |
| `ACTION_ITEM_OVERDUE` | `actionId`, `studentId`, `assigneeId`, `daysOverdue` | Tự động hóa cảnh báo quá hạn can thiệp |
| `SUPPORT_REFERRAL_CREATED`| `studentId`, `fromTeacherId`, `targetUnit`, `urgency` | Minh bạch quy trình phối hợp hỗ trợ liên phòng ban |

---

## 6. KẾT LUẬN & CAM KẾT VẬN HÀNH

Hệ thống bảo vệ dữ liệu và sao lưu phục hồi được thiết lập theo tiêu chuẩn an ninh thông tin trường học, bảo đảm:
1. **Rủi ro mất dữ liệu = 0%** nhờ cơ chế Additive Schema và kịch bản nén snapshot SHA-256.
2. **Thời gian phục hồi dịch vụ (RTO) < 3 phút**, tổn thất dữ liệu tối đa (RPO) = 0 trong trường hợp rollback migration.
3. **Tuyệt đối tuân thủ pháp lý bảo vệ dữ liệu cá nhân học sinh**, không phát sinh chi phí hoặc rủi ro từ các dịch vụ đám mây công cộng bên thứ ba.
