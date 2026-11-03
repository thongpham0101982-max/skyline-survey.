-- =============================================================================
-- MIGRATION: 20261031_triparty_advisory_upgrade
-- Mục đích: Nâng cấp Cố vấn học tập 3 bên (Giáo viên/CVHT - Học sinh - Phụ huynh)
-- Nguyên tắc: Additive (Không xóa bảng/cột cũ, không làm mất dữ liệu hiện tại)
-- =============================================================================

-- 1. Bảng chính sách chia sẻ 3 tầng & mở rộng nghiệp vụ đồng bộ 3 bên
CREATE TABLE IF NOT EXISTS "AdvisoryRecordPolicy" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "entityType" TEXT NOT NULL, -- 'GOAL', 'GOAL_ACTION', 'CONSULTATION', 'REFLECTION', 'HELP_REQUEST', 'TERM_EVAL'
  "entityId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL DEFAULT '',
  "privacyTier" TEXT NOT NULL DEFAULT 'SHARED_EDUCATIONAL', -- 'SHARED_EDUCATIONAL', 'PRIVATE_ADVISORY', 'RESTRICTED_SAFEGUARDING'
  "shareWithParent" INTEGER NOT NULL DEFAULT 1,
  "advisorReviewStatus" TEXT, -- 'PENDING_REVIEW', 'CONFIRMED', 'NEEDS_ADJUSTMENT'
  "advisorReviewNote" TEXT,
  "privateAdvisorNotes" TEXT, -- Ghi chú chuyên môn riêng của CVHT (Không trả về API cho PHHS/HS)
  "parentSharedSummary" TEXT, -- Nội dung khuyến nghị được phép chia sẻ tới PHHS
  "parentAcknowledged" INTEGER NOT NULL DEFAULT 0,
  "parentFeedback" TEXT, -- Phản hồi việc hỗ trợ tại gia đình từ PHHS
  "parentFeedbackAt" DATETIME,
  "evidenceNotes" TEXT, -- Minh chứng thực hiện hành động 7 ngày của Học sinh
  "sessionFormat" TEXT DEFAULT 'DIRECT', -- 'DIRECT', 'ONLINE'
  "sessionStatus" TEXT DEFAULT 'COMPLETED', -- 'SCHEDULED', 'COMPLETED', 'FOLLOW_UP_NEEDED'
  "updatedById" TEXT,
  "updatedByRole" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("entityType", "entityId")
);

CREATE INDEX IF NOT EXISTS "idx_adv_policy_student" ON "AdvisoryRecordPolicy" ("studentId", "entityType");
CREATE INDEX IF NOT EXISTS "idx_adv_policy_entity" ON "AdvisoryRecordPolicy" ("entityType", "entityId");

-- 2. Bảng trao đổi 2 chiều Phụ huynh <-> CVHT & theo dõi trạng thái phản hồi
CREATE TABLE IF NOT EXISTS "ParentAdvisorExchange" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL DEFAULT '',
  "parentId" TEXT,
  "parentName" TEXT,
  "teacherId" TEXT,
  "teacherName" TEXT,
  "topic" TEXT NOT NULL DEFAULT 'PHOI_HOP_GIA_DINH', -- 'PHOI_HOP_GIA_DINH', 'DAT_LICH_TRAO_DOI', 'HOI_TIEN_DO_MUC_TIEU', 'HO_TRO_DAC_BIET'
  "message" TEXT NOT NULL,
  "homeSupportSummary" TEXT,
  "preferredTime" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'RESPONDED', 'CLOSED'
  "advisorResponse" TEXT,
  "respondedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_parent_exchange_student" ON "ParentAdvisorExchange" ("studentId", "academicYearId");
CREATE INDEX IF NOT EXISTS "idx_parent_exchange_status" ON "ParentAdvisorExchange" ("status");

-- 3. Bảng kiểm toán truy cập & lịch sử thay đổi hồ sơ (Audit Trail)
CREATE TABLE IF NOT EXISTS "AdvisoryAuditLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "actorName" TEXT,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "privacyTier" TEXT NOT NULL DEFAULT 'SHARED_EDUCATIONAL',
  "summary" TEXT,
  "changesJson" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_adv_audit_student" ON "AdvisoryAuditLog" ("studentId", "createdAt");
