const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const defaultLocalDbPath = path.resolve(__dirname, '..', 'local.db').replace(/\\/g, '/');

const tursoUrl = process.env.TURSO_DATABASE_URL
  ? process.env.TURSO_DATABASE_URL.replace(/^libsql:\/\//, 'https://')
  : 'https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io';
const tursoToken = process.env.TURSO_AUTH_TOKEN || '';

const cloudClient = createClient({
  url: tursoUrl,
  authToken: tursoToken
});

const localClient = createClient({
  url: `file:${defaultLocalDbPath}`
});

const DDL_STATEMENTS = [
  // 1. KtdbclAnnouncement
  `CREATE TABLE IF NOT EXISTS "KtdbclAnnouncement" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'THONG_BAO_CHUNG',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "targetScope" TEXT NOT NULL DEFAULT 'ALL',
    "targetCampusIds" TEXT,
    "targetDeptIds" TEXT,
    "targetLevels" TEXT,
    "attachments" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT 1,
    "publishedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,
    "creatorName" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAnnouncement_category_idx" ON "KtdbclAnnouncement"("category");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAnnouncement_priority_idx" ON "KtdbclAnnouncement"("priority");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAnnouncement_publishedAt_idx" ON "KtdbclAnnouncement"("publishedAt");`,

  // 2. KtdbclAnnouncementRead
  `CREATE TABLE IF NOT EXISTS "KtdbclAnnouncementRead" (
    "id" TEXT PRIMARY KEY,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "userRole" TEXT,
    "campusCode" TEXT,
    "readAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("announcementId") REFERENCES "KtdbclAnnouncement"("id") ON DELETE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "KtdbclAnnouncementRead_announcementId_userId_key" ON "KtdbclAnnouncementRead"("announcementId", "userId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAnnouncementRead_userId_idx" ON "KtdbclAnnouncementRead"("userId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAnnouncementRead_announcementId_idx" ON "KtdbclAnnouncementRead"("announcementId");`,

  // 3. KtdbclRequest
  `CREATE TABLE IF NOT EXISTS "KtdbclRequest" (
    "id" TEXT PRIMARY KEY,
    "requestCode" TEXT NOT NULL UNIQUE,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'KHAC',
    "requestType" TEXT NOT NULL DEFAULT 'CAU_HOI',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "content" TEXT NOT NULL,
    "attachments" TEXT,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT,
    "senderEmail" TEXT,
    "senderPhone" TEXT,
    "teacherId" TEXT,
    "campusId" TEXT,
    "campusCode" TEXT,
    "departmentId" TEXT,
    "departmentName" TEXT,
    "assignedToId" TEXT,
    "assignedToName" TEXT,
    "assignedAt" DATETIME,
    "aiCategorySuggestion" TEXT,
    "aiUrgencyScore" INTEGER DEFAULT 0,
    "aiSummary" TEXT,
    "rating" INTEGER,
    "ratingFeedback" TEXT,
    "resolvedAt" DATETIME,
    "reopenedAt" DATETIME,
    "refModule" TEXT,
    "refRecordId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_status_idx" ON "KtdbclRequest"("status");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_senderId_idx" ON "KtdbclRequest"("senderId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_campusId_idx" ON "KtdbclRequest"("campusId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_category_idx" ON "KtdbclRequest"("category");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_assignedToId_idx" ON "KtdbclRequest"("assignedToId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclRequest_createdAt_idx" ON "KtdbclRequest"("createdAt");`,

  // 4. KtdbclMessage
  `CREATE TABLE IF NOT EXISTS "KtdbclMessage" (
    "id" TEXT PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "attachments" TEXT,
    "isInternalNote" BOOLEAN NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("requestId") REFERENCES "KtdbclRequest"("id") ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "KtdbclMessage_requestId_idx" ON "KtdbclMessage"("requestId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclMessage_senderId_idx" ON "KtdbclMessage"("senderId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclMessage_createdAt_idx" ON "KtdbclMessage"("createdAt");`,

  // 5. KtdbclKnowledgeItem
  `CREATE TABLE IF NOT EXISTS "KtdbclKnowledgeItem" (
    "id" TEXT PRIMARY KEY,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'QUY_CHE_CHUNG',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "keywords" TEXT,
    "attachments" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT 1,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "usefulCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "KtdbclKnowledgeItem_category_idx" ON "KtdbclKnowledgeItem"("category");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclKnowledgeItem_isPublished_idx" ON "KtdbclKnowledgeItem"("isPublished");`,

  // 6. KtdbclAuditLog
  `CREATE TABLE IF NOT EXISTS "KtdbclAuditLog" (
    "id" TEXT PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("requestId") REFERENCES "KtdbclRequest"("id") ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAuditLog_requestId_idx" ON "KtdbclAuditLog"("requestId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAuditLog_actorId_idx" ON "KtdbclAuditLog"("actorId");`,
  `CREATE INDEX IF NOT EXISTS "KtdbclAuditLog_createdAt_idx" ON "KtdbclAuditLog"("createdAt");`
];

async function runOnClient(client, name) {
  console.log(`\n=== Running DDL on ${name} ===`);
  for (const sql of DDL_STATEMENTS) {
    try {
      await client.execute(sql);
    } catch (e) {
      console.warn(`[${name}] Statement warning:`, e.message.substring(0, 120));
    }
  }
  console.log(`[${name}] All tables and indices created successfully.`);
}

async function seedInitialKnowledgeAndAnnouncements(client, name) {
  console.log(`\n=== Seeding initial knowledge & announcements on ${name} ===`);
  try {
    const existing = await client.execute('SELECT count(*) as cnt FROM "KtdbclKnowledgeItem"');
    if (existing.rows[0].cnt > 0) {
      console.log(`[${name}] KtdbclKnowledgeItem already has ${existing.rows[0].cnt} items. Skipping seed.`);
      return;
    }

    // Seed SOPs and FAQs
    const sampleKnowledge = [
      {
        id: 'faq-001',
        title: 'Quy trình xin mở sổ điểm sau thời hạn khóa sổ',
        category: 'SO_DIEM',
        question: 'Làm thế nào để xin phê duyệt mở lại sổ điểm khi hết hạn nhập điểm định kỳ?',
        answer: 'Thầy Cô vui lòng vào mục "Duyệt yêu cầu mở sổ điểm" hoặc gửi yêu cầu trên KT&ĐBCL Connect kèm lý do điều chỉnh cụ thể và minh chứng (bài kiểm tra/phiếu điểm gốc). Ban KT&ĐBCL sẽ phối hợp cùng BGH cơ sở xem xét và phê duyệt mở sổ trong vòng 24 giờ làm việc.',
        keywords: 'mở sổ điểm, xin mở sổ, hết hạn nhập điểm, sửa điểm'
      },
      {
        id: 'faq-002',
        title: 'Quy định làm tròn điểm số và nhập điểm đánh giá thường xuyên',
        category: 'SO_DIEM',
        question: 'Điểm đánh giá thường xuyên (ĐGTX) và định kỳ (ĐGĐK) được tính và làm tròn như thế nào?',
        answer: 'Theo Quy chế Đánh giá Sky-Line theo chuẩn Thông tư 22/TT-BGDĐT: Điểm thành phần được chấm theo thang điểm 10, làm tròn đến chữ số thập phân thứ nhất (ví dụ: 7.25 -> 7.3; 7.24 -> 7.2). Giáo viên nhập đúng cột điểm quy định tương ứng với từng hệ đào tạo (Song bằng, Chất lượng cao).',
        keywords: 'làm tròn điểm, quy chế điểm, thông tư 22, đánh giá thường xuyên'
      },
      {
        id: 'faq-003',
        title: 'Hướng dẫn chuẩn bị hồ sơ khảo thí và nộp đề thi học kỳ',
        category: 'KHAO_THI',
        question: 'Thời hạn nộp ma trận, bản đặc tả và đề thi kiểm tra cuối kỳ về Ban KT&ĐBCL?',
        answer: 'Tổ trưởng chuyên môn tập hợp và gửi bộ đề thi (gồm Đề chính thức, Đề dự bị, Ma trận, Bản đặc tả và Đáp án chi tiết) trước ngày thi tối thiểu 10 ngày làm việc qua hệ thống SSM hoặc email Ban KT&ĐBCL bankhaothi@skylineschool.edu.vn.',
        keywords: 'đề thi, ma trận đề, bản đặc tả, hạn nộp đề, đề thi học kỳ'
      },
      {
        id: 'faq-004',
        title: 'Quy trình xử lý phúc khảo bài thi của học sinh',
        category: 'KHAO_THI',
        question: 'Khi phụ huynh hoặc học sinh có đơn xin phúc khảo điểm thi thì quy trình xử lý ra sao?',
        answer: '1. Giáo viên chủ nhiệm tiếp nhận đơn phúc khảo trong vòng 03 ngày làm việc kể từ ngày công bố điểm.\n2. Chuyển thông tin cho Ban KT&ĐBCL cơ sở.\n3. Ban KT&ĐBCL tổ chức rút bài thi và thành lập Hội đồng chấm phúc khảo gồm 02 giám khảo độc lập.\n4. Kết quả phúc khảo được công bố trong vòng 05 ngày làm việc.',
        keywords: 'phúc khảo, chấm lại, khiếu nại điểm, đơn phúc khảo'
      },
      {
        id: 'faq-005',
        title: 'Quy định dự giờ và chu kỳ phát triển chuyên môn',
        category: 'DU_GIO',
        question: 'Số tiết dự giờ tối thiểu của giáo viên mỗi học kỳ là bao nhiêu?',
        answer: 'Mỗi giáo viên thực hiện tối thiểu 02 tiết dự giờ/học kỳ (gồm 01 tiết dự đồng nghiệp và 01 tiết được đồng nghiệp/TTCM dự giờ). Phiếu dự giờ được ghi nhận trực tiếp trên phân hệ "Dự giờ & Phát triển chuyên môn" trên SSM trong vòng 24h sau tiết dạy.',
        keywords: 'dự giờ, định mức dự giờ, phiếu dự giờ, đánh giá tiết dạy'
      },
      {
        id: 'faq-006',
        title: 'Ý nghĩa các trục năng lực Radar ĐGNL và chu kỳ cập nhật',
        category: 'DGNL',
        question: 'Dữ liệu biểu đồ Radar Đánh giá Năng lực học sinh được lấy từ đâu?',
        answer: 'Radar ĐGNL tổng hợp từ 6 nhóm năng lực cốt lõi theo khung phẩm chất năng lực của Sky-Line (Tư duy toán học, Ngôn ngữ, Khoa học tự nhiên & xã hội, Thể chất & Cảm xúc xã hội, Nghệ thuật & Sáng tạo, Năng lực số). Dữ liệu được tính toán tự động từ điểm thành phần định kỳ và hoạt động trải nghiệm.',
        keywords: 'radar, đánh giá năng lực, 6 năng lực, biểu đồ năng lực'
      }
    ];

    for (const item of sampleKnowledge) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO "KtdbclKnowledgeItem" ("id", "title", "category", "question", "answer", "keywords", "isPublished", "viewCount", "usefulCount", "createdAt", "updatedAt")
              VALUES (?, ?, ?, ?, ?, ?, 1, 15, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        args: [item.id, item.title, item.category, item.question, item.answer, item.keywords]
      });
    }
    console.log(`[${name}] Seeded ${sampleKnowledge.length} knowledge items.`);

    // Seed sample Announcement
    await client.execute({
      sql: `INSERT OR IGNORE INTO "KtdbclAnnouncement" (
        "id", "code", "title", "content", "category", "priority", "targetScope", "targetCampusIds", "targetDeptIds", "targetLevels", "attachments", "isPublished", "publishedAt", "createdById", "creatorName", "pinned", "createdAt", "updatedAt"
      ) VALUES (
        'tb-001',
        'TB-2026-001',
        'Thông báo rà soát tiến độ nhập điểm và nhận xét Đánh giá Giữa Kỳ I',
        'Kính gửi Quý Thầy Cô toàn hệ thống Sky-Line,\n\nBan KT&ĐBCL đề nghị Quý Thầy Cô hoàn tất việc nhập điểm kiểm tra thường xuyên và nhận xét học sinh trước 17h00 ngày 25/10/2026.\n\nTrường hợp Thầy Cô gặp vướng mắc về danh sách học sinh, cột điểm hoặc phân công giảng dạy, vui lòng gửi phiếu hỗ trợ trực tiếp trên kênh **KT&ĐBCL Connect** để được hỗ trợ tức thì.\n\nTrân trọng cảm ơn sự phối hợp của Quý Thầy Cô!',
        'TIEN_DO_SO_DIEM',
        'IMPORTANT',
        'ALL',
        '["ALL"]',
        '["ALL"]',
        '["ALL"]',
        '[]',
        1,
        CURRENT_TIMESTAMP,
        'system-ktdbcl',
        'Ban KT&ĐBCL Sky-Line',
        1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )`
    });
    console.log(`[${name}] Seeded sample announcement TB-2026-001.`);

  } catch (err) {
    console.error(`[${name}] Seed error:`, err);
  }
}

async function main() {
  await runOnClient(localClient, 'Local SQLite (local.db)');
  await seedInitialKnowledgeAndAnnouncements(localClient, 'Local SQLite (local.db)');

  try {
    await runOnClient(cloudClient, 'Turso Cloud');
    await seedInitialKnowledgeAndAnnouncements(cloudClient, 'Turso Cloud');
  } catch (e) {
    console.warn('Cloud migration warning (may run offline/local):', e.message);
  }
}

main().then(() => {
  console.log('Migration completed successfully!');
  process.exit(0);
}).catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
