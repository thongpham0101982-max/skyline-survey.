# TÀI LIỆU 6: THIẾT KẾ CƠ SỞ DỮ LIỆU VÀ HỆ THỐNG API NỘI BỘ (DATABASE & API DESIGN)
## Mã tài liệu: DATABASE_API_DESIGN.md | Phiên bản: 2.0 | Ngày: 20/10/2026

---

## 1. THIẾT KẾ MÔ HÌNH DỮ LIỆU MỞ RỘNG (DATABASE SCHEMA EXTENSION)

Hệ thống sử dụng cơ chế **DDL an toàn đa môi trường (SQLite & LibSQL/Turso)** với cú pháp `CREATE TABLE IF NOT EXISTS` và `CREATE INDEX IF NOT EXISTS`. Không drop, không alter phá vỡ bảng hiện hữu.

```sql
-- 1. BẢNG PHÂN CÔNG CỐ VẤN HỌC TẬP CHUYÊN TRÁCH THEO NĂM HỌC
CREATE TABLE IF NOT EXISTS "StudentAdvisorAssignment" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "advisorRole" TEXT NOT NULL DEFAULT 'CO_VAN_CHINH', -- 'CO_VAN_CHINH', 'CO_VAN_DONG_HANH', 'GVCN_KIEM_NHIEM'
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "assignedDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_std_adv_year" ON "StudentAdvisorAssignment" ("studentId", "teacherId", "academicYearId");
CREATE INDEX IF NOT EXISTS "idx_adv_teacher" ON "StudentAdvisorAssignment" ("teacherId", "academicYearId");

-- 2. BẢNG THEO DÕI HÀNH ĐỘNG SAU PHIÊN CỐ VẤN & CẢNH BÁO QUÁ HẠN
CREATE TABLE IF NOT EXISTS "AdvisoryActionItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "consultationLogId" TEXT,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "actionDescription" TEXT NOT NULL,
  "assignedToRole" TEXT NOT NULL DEFAULT 'STUDENT', -- 'STUDENT', 'TEACHER', 'PARENT'
  "assignedToName" TEXT,
  "deadline" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'TODO', -- 'TODO', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'
  "completedAt" DATETIME,
  "evidenceNotes" TEXT,
  "createdById" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_adv_act_student" ON "AdvisoryActionItem" ("studentId", "academicYearId");
CREATE INDEX IF NOT EXISTS "idx_adv_act_status" ON "AdvisoryActionItem" ("status", "deadline");

-- 3. BẢNG LƯU VẾT VÀ QUẢN LÝ CẢNH BÁO SỚM (EARLY WARNING LOG)
CREATE TABLE IF NOT EXISTS "AdvisoryAlertLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "alertType" TEXT NOT NULL, -- 'OVERDUE_ACTION', 'GRADE_DROP', 'MISSED_MEETING', 'LOW_SMART_PROGRESS'
  "severity" TEXT NOT NULL DEFAULT 'YELLOW', -- 'YELLOW', 'RED'
  "message" TEXT NOT NULL,
  "evidenceData" TEXT, -- JSON lưu dẫn chứng
  "isResolved" INTEGER NOT NULL DEFAULT 0,
  "resolvedAt" DATETIME,
  "resolvedById" TEXT,
  "resolutionNote" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "idx_adv_alert_student" ON "AdvisoryAlertLog" ("studentId", "isResolved");
CREATE INDEX IF NOT EXISTS "idx_adv_alert_severity" ON "AdvisoryAlertLog" ("academicYearId", "severity");

-- 4. BẢNG LƯU TRỮ VÀ LỊCH SỬ TÍNH ĐIỂM CHỈ SỐ SGSI
CREATE TABLE IF NOT EXISTS "StudentGrowthIndexLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "term" TEXT NOT NULL DEFAULT 'HK1', -- 'GIUA_KY_1', 'CUOI_KY_1', 'GIUA_KY_2', 'CUOI_NAM'
  "academicProgressScore" REAL NOT NULL, -- Điểm G (45%)
  "supportEffectScore" REAL NOT NULL,    -- Điểm S (35%)
  "processQualityScore" REAL NOT NULL,   -- Điểm P (20%)
  "compositeSgsiScore" REAL NOT NULL,    -- Điểm SGSI tổng hợp (thang 100)
  "ratingTier" TEXT NOT NULL,            -- 'TIEN_BO_XUAT_SAC', 'DAT_TIEN_BO_TOT', 'CAN_DONG_HANH', 'NGUY_CO'
  "dataCompletenessRate" REAL NOT NULL DEFAULT 1.0, -- Tỷ lệ đầy đủ dữ liệu (0.0 - 1.0)
  "formulaVersion" TEXT NOT NULL DEFAULT 'v2.0_2026',
  "calculationDetails" TEXT,             -- JSON lưu chi tiết giải trình từng thành phần
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sgsi_student_term" ON "StudentGrowthIndexLog" ("studentId", "academicYearId", "term");
CREATE INDEX IF NOT EXISTS "idx_sgsi_year_term" ON "StudentGrowthIndexLog" ("academicYearId", "term");
```

---

## 2. DANH MỤC API NỘI BỘ (INTERNAL RESTFUL API SPECIFICATION)

### 2.1. Nhóm API AI Advisor
- **`POST /api/advisory/ai-advisor/suggest`**
  - **Mô tả:** Phân tích dữ liệu học sinh, sinh 3 câu hỏi gợi mở, 2 mục tiêu SMART đề xuất và kế hoạch hành động vi mô kèm dẫn chứng số liệu.
  - **Request Body:** `{ studentId: string, academicYearId?: string, focusTopic?: string }`
  - **Response:**
    ```json
    {
      "studentId": "std_123",
      "gradeLevel": "K10",
      "dataEvidence": [
        "Điểm trung bình các môn: 7.2/10",
        "Môn dưới benchmark (<6.0): Toán (5.2)",
        "Đang theo đuổi 2 mục tiêu SMART"
      ],
      "questions": [
        "Theo em, điều gì đang là rào cản lớn nhất khi tiếp thu bài môn Toán?",
        "Khi gặp dạng bài khó, em thường giải quyết thế nào?",
        "Mục tiêu quan trọng nhất trong 4 tuần tới là gì?"
      ],
      "recommendedGoals": [
        {
          "title": "Củng cố điểm kiểm tra môn Toán >= 6.5",
          "specific": "Hoàn thành 100% bài tập về nhà và ôn lại chuyên đề Hàm số",
          "measurable": "Đạt điểm >= 6.5 trong bài kiểm tra định kỳ tới",
          "timeBound": "Trước kỳ sơ kết giữa kỳ",
          "rationale": "Căn cứ điểm Toán GK1 đang ở mức 5.2 cần can thiệp sớm"
        }
      ],
      "actionPlan": [
        { "actionText": "Hỏi lại thầy giáo bộ môn 2 dạng bài chưa hiểu vào giờ ra chơi", "deadlineDays": 3, "owner": "Học sinh" }
      ]
    }
    ```

---

### 2.2. Nhóm API Chỉ số SGSI
- **`GET /api/advisory/sgsi/calculate`**
  - **Mô tả:** Tính toán chỉ số tăng trưởng SGSI theo công thức $45\% G + 35\% S + 20\% P$, hỗ trợ tái chuẩn hóa khi thiếu dữ liệu đầu năm.
  - **Query Params:** `studentId`, `academicYearId`, `term`.
  - **Response:**
    ```json
    {
      "studentId": "std_123",
      "studentName": "Nguyễn Văn A",
      "compositeSgsiScore": 84,
      "ratingTier": "ĐẠT TIẾN BỘ TỐT",
      "tierBadgeClass": "bg-emerald-100 text-emerald-800 border-emerald-300",
      "breakdown": {
        "academicProgress": { "weight": 45, "score": 82 },
        "supportEffect": { "weight": 35, "score": 85 },
        "processQuality": { "weight": 20, "score": 90 }
      },
      "dataCompletenessRate": 1.0,
      "isMissingBaselineData": false
    }
    ```

---

### 2.3. Nhóm API Quản lý Hành động & Phối hợp Chuyên môn
- **`GET /api/advisory/action-items`**
  - **Query Params:** `studentId`, `classId`, `academicYearId`, `status` (`ALL`, `TODO`, `COMPLETED`, `OVERDUE`).
  - **Chức năng:** Tự động phát hiện việc trễ hạn (`deadline < NOW && status != 'COMPLETED'`) và trả về cờ `isOverdue: true`.
- **`POST /api/advisory/action-items`**
  - **Chức năng:** Tạo hành động mới từ biên bản cố vấn.
- **`PATCH /api/advisory/action-items`**
  - **Chức năng:** Đánh dấu hoàn thành (`status = 'COMPLETED'`), cập nhật minh chứng hoặc gia hạn deadline.
- **`POST /api/advisory/refer-support`**
  - **Request Body:** `{ studentId, academicYearId, supportType: 'ACADEMIC' | 'PSYCHOLOGICAL', reason, notes }`
  - **Chức năng:** Chuyển ca trực tiếp sang phân hệ Hỗ trợ học tập hoặc Tâm lý học đường; ghi vết vào `AuditLog`.

---

### 2.4. Nhóm API Dashboard & Snapshot 360
- **`GET /api/advisory/dashboard-stats`**
  - **Query Params:** `campusId`, `grade`, `classId`, `academicYearId`.
  - **Chức năng:** Tổng hợp KPI đa cấp: Tỷ lệ chốt SMART, Tỷ lệ cố vấn 1-1, Phân bổ rủi ro Đỏ/Vàng/Xanh, Danh sách học sinh cần ưu tiên hỗ trợ sớm.
- **`GET /api/advisory/academic-snapshot`**
  - **Query Params:** `studentId`, `academicYearId`.
  - **Chức năng:** Trích xuất nhanh dữ liệu KQHT, KSCL, Năng lực, Hỗ trợ học tập và Hướng nghiệp với thời gian phản hồi < 150ms.
