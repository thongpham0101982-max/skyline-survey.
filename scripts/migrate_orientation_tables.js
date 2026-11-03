const { createClient } = require("@libsql/client");
const path = require("path");

const LOCAL_DB_PATH = path.resolve(__dirname, "../local.db").replace(/\\/g, "/");
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const statements = [
  // 1. Table: OrientationQuestionCatalog
  `CREATE TABLE IF NOT EXISTS "OrientationQuestionCatalog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gradeGroup" TEXT NOT NULL,
    "grade" TEXT DEFAULT 'ALL',
    "category" TEXT NOT NULL,
    "categoryLabel" TEXT,
    "questionText" TEXT NOT NULL,
    "suggestedGuideline" TEXT,
    "sampleAnswers" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );`,
  `CREATE INDEX IF NOT EXISTS "OrientationQuestionCatalog_gradeGroup_status_idx" ON "OrientationQuestionCatalog"("gradeGroup", "status");`,
  `CREATE INDEX IF NOT EXISTS "OrientationQuestionCatalog_category_idx" ON "OrientationQuestionCatalog"("category");`,

  // 2. Table: StudentOrientationRecord
  `CREATE TABLE IF NOT EXISTS "StudentOrientationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT,
    "interviewerId" TEXT,
    "interviewerName" TEXT,
    "interviewDate" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',

    "adaptationLevel" TEXT,
    "interviewData" TEXT,
    "studentStrengths" TEXT,
    "studentNeedsSupport" TEXT,
    "interviewerGeneralRemark" TEXT,

    "parentExpectations" TEXT,
    "parentHealthNotes" TEXT,
    "parentPersonalityNotes" TEXT,
    "parentSpecialRequests" TEXT,
    "cooperationCommitment" TEXT,
    "parentRepresentativeName" TEXT,
    "parentPhone" TEXT,

    "proposedEduSystem" TEXT,
    "proposedClassPlacement" TEXT,
    "admissionConsultantNote" TEXT,

    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("studentId") REFERENCES "InputAssessmentStudent"("id") ON DELETE CASCADE
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "StudentOrientationRecord_studentId_key" ON "StudentOrientationRecord"("studentId");`,
  `CREATE INDEX IF NOT EXISTS "StudentOrientationRecord_studentId_idx" ON "StudentOrientationRecord"("studentId");`,
  `CREATE INDEX IF NOT EXISTS "StudentOrientationRecord_academicYearId_idx" ON "StudentOrientationRecord"("academicYearId");`
];

// Seed question catalog data
const initialQuestions = [
  // === KHỐI 1 / TIỀN TIỂU HỌC ===
  {
    id: "q_k1_01",
    gradeGroup: "KHOI_1",
    grade: "Khối 1",
    category: "HOA_NHAP_GIAO_TIEP",
    categoryLabel: "Hòa nhập & Giao tiếp",
    questionText: "Con hãy giới thiệu về bản thân (họ tên, tuổi, điều con thích nhất)?",
    suggestedGuideline: "Quan sát sự tự tin, phát âm rõ ràng, ánh mắt khi giao tiếp và khả năng diễn đạt câu trọn vẹn.",
    sortOrder: 1
  },
  {
    id: "q_k1_02",
    gradeGroup: "KHOI_1",
    grade: "Khối 1",
    category: "HOA_NHAP_GIAO_TIEP",
    categoryLabel: "Kỹ năng Tự lập",
    questionText: "Khi đến trường mới, con có thể tự cất ba lô, giày dép và tự uống nước/đi vệ sinh không?",
    suggestedGuideline: "Quan sát mức độ lo âu khi rời xa ba mẹ, khả năng tự phục vụ cơ bản.",
    sortOrder: 2
  },
  {
    id: "q_k1_03",
    gradeGroup: "KHOI_1",
    grade: "Khối 1",
    category: "THOI_QUEN_HOC_TAP",
    categoryLabel: "Hứng thú Nhận biết",
    questionText: "Con thích xem tranh, nghe kể chuyện hay thích vẽ/xếp hình khối hơn?",
    suggestedGuideline: "Đánh giá sự tập trung chú ý, phản xạ ngôn ngữ và trí tưởng tượng tự nhiên.",
    sortOrder: 3
  },
  {
    id: "q_k1_04",
    gradeGroup: "KHOI_1",
    grade: "Khối 1",
    category: "TAM_LY_CAM_XUC",
    categoryLabel: "Tâm lý & Cảm xúc",
    questionText: "Hôm nay đến trường Sky-Line con cảm thấy thế nào? Con có thích vào lớp cùng cô không?",
    suggestedGuideline: "Nhận diện cảm xúc tích cực, sự sẵn sàng thích nghi môi trường học mới.",
    sortOrder: 4
  },

  // === KHỐI 2 - 5 ===
  {
    id: "q_k25_01",
    gradeGroup: "KHOI_2_5",
    grade: "ALL",
    category: "THOI_QUEN_HOC_TAP",
    categoryLabel: "Hứng thú Học tập",
    questionText: "Ở trường cũ, con yêu thích môn học nào nhất và vì sao? Có môn nào con cảm thấy hơi khó không?",
    suggestedGuideline: "Tìm hiểu xu hướng học tập, khả năng tự nhận thức về thế mạnh và khó khăn học thuật.",
    sortOrder: 1
  },
  {
    id: "q_k25_02",
    gradeGroup: "KHOI_2_5",
    grade: "ALL",
    category: "HOA_NHAP_GIAO_TIEP",
    categoryLabel: "Quan hệ Xã hội & Bạn bè",
    questionText: "Con thường chơi gì với các bạn trong giờ ra chơi? Khi có hiểu lầm với bạn, con thường làm gì?",
    suggestedGuideline: "Quan sát kỹ năng kết bạn, kỹ năng xử lý mâu thuẫn lứa tuổi tiểu học.",
    sortOrder: 2
  },
  {
    id: "q_k25_03",
    gradeGroup: "KHOI_2_5",
    grade: "ALL",
    category: "SO_THICH_NANG_KHIEU",
    categoryLabel: "Sở thích & Năng khiếu",
    questionText: "Ngoài giờ học, con có đam mê môn thể thao, nghệ thuật hay hoạt động nào đặc biệt không?",
    suggestedGuideline: "Nhận diện tiềm năng bồi dưỡng (bóng đá, bơi lội, piano, cờ vua, vẽ...).",
    sortOrder: 3
  },
  {
    id: "q_k25_04",
    gradeGroup: "KHOI_2_5",
    grade: "ALL",
    category: "THOI_QUEN_HOC_TAP",
    categoryLabel: "Thói quen Tự học",
    questionText: "Mỗi tối con tự giác ngồi vào bàn học hay ba mẹ cần nhắc nhở? Con có thói quen đọc sách không?",
    suggestedGuideline: "Đánh giá tính kỷ luật cá nhân và môi trường tự học tại gia đình.",
    sortOrder: 4
  },

  // === KHỐI 6 - 9 ===
  {
    id: "q_k69_01",
    gradeGroup: "KHOI_6_9",
    grade: "ALL",
    category: "NHAN_THUC_BAN_THAN",
    categoryLabel: "Nhận thức Bản thân",
    questionText: "Theo con, điểm mạnh lớn nhất của con là gì? Bước vào cấp THCS, con muốn phát triển thêm kỹ năng nào?",
    suggestedGuideline: "Đánh giá mức độ tự nhận thức bản thân, sự tự tin và mục tiêu cá nhân.",
    sortOrder: 1
  },
  {
    id: "q_k69_02",
    gradeGroup: "KHOI_6_9",
    grade: "ALL",
    category: "THOI_QUEN_HOC_TAP",
    categoryLabel: "Phương pháp Học tập",
    questionText: "Con có phương pháp học tập cá nhân như thế nào (lập kế hoạch, sơ đồ tư duy, học nhóm)?",
    suggestedGuideline: "Đánh giá kỹ năng tự học độc lập, khả năng tổ chức bài học khi số môn tăng lên ở THCS.",
    sortOrder: 2
  },
  {
    id: "q_k69_03",
    gradeGroup: "KHOI_6_9",
    grade: "ALL",
    category: "TAM_LY_CAM_XUC",
    categoryLabel: "Tâm lý & Quản lý Cảm xúc",
    questionText: "Khi gặp áp lực bài vở hoặc những điều không như ý, con thường giải tỏa bằng cách nào?",
    suggestedGuideline: "Nhận diện khả năng điều hòa cảm xúc tuổi dậy thì, mối quan hệ hỗ trợ từ gia đình/bạn bè.",
    sortOrder: 3
  },
  {
    id: "q_k69_04",
    gradeGroup: "KHOI_6_9",
    grade: "ALL",
    category: "DINH_HUONG_TUONG_LAI",
    categoryLabel: "Trải nghiệm & CLB",
    questionText: "Tại Sky-Line có nhiều CLB (Robotics, Tranh biện, Thể thao, Sự kiện...), con hào hứng tham gia hoạt động nào nhất?",
    suggestedGuideline: "Định hướng gắn kết học sinh với đời sống học đường năng động.",
    sortOrder: 4
  },

  // === KHỐI 10 - 12 ===
  {
    id: "q_k1012_01",
    gradeGroup: "KHOI_10_12",
    grade: "ALL",
    category: "DINH_HUONG_TUONG_LAI",
    categoryLabel: "Định hướng Học thuật & Nghề nghiệp",
    questionText: "Con đang định hướng theo tổ hợp môn nào (Khoa học Tự nhiên hay Xã hội) và dự định ngành nghề/du học sau THPT?",
    suggestedGuideline: "Đánh giá mức độ chín chắn trong việc lựa chọn môn học chuyên sâu theo chương trình GDPT mới.",
    sortOrder: 1
  },
  {
    id: "q_k1012_02",
    gradeGroup: "KHOI_10_12",
    grade: "ALL",
    category: "THOI_QUEN_HOC_TAP",
    categoryLabel: "Năng lực Tiếng Anh & Quốc tế",
    questionText: "Mục tiêu chứng chỉ Tiếng Anh (IELTS, SAT, Du học) của con là gì? Con đã chuẩn bị những gì?",
    suggestedGuideline: "Phân luồng học sinh vào các hệ đào tạo (Hội nhập S, Song ngữ, Quốc tế) chuẩn xác.",
    sortOrder: 2
  },
  {
    id: "q_k1012_03",
    gradeGroup: "KHOI_10_12",
    grade: "ALL",
    category: "NHAN_THUC_BAN_THAN",
    categoryLabel: "Kỹ năng Tự chủ & Dự án",
    questionText: "Con đã từng chủ trì hoặc tham gia dự án học tập/hoạt động cộng đồng nào chưa? Kinh nghiệm lớn nhất của con là gì?",
    suggestedGuideline: "Nhận diện khả năng lãnh đạo, tư duy phản biện và tinh thần cống hiến cộng đồng.",
    sortOrder: 3
  },
  {
    id: "q_k1012_04",
    gradeGroup: "KHOI_10_12",
    grade: "ALL",
    category: "TAM_LY_CAM_XUC",
    categoryLabel: "Hỗ trợ & Đồng hành",
    questionText: "Điều con mong muốn các Thầy Cô và Nhà trường Sky-Line hỗ trợ con nhiều nhất trong những năm THPT là gì?",
    suggestedGuideline: "Nắm bắt kỳ vọng hỗ trợ thực chất để thiết lập hồ sơ đồng hành cá nhân hóa.",
    sortOrder: 4
  }
];

async function run() {
  console.log("=== BẮT ĐẦU MIGRATION BẢNG PHỎNG VẤN ĐỊNH HƯỚNG ===");

  const targets = [];
  try {
    targets.push({ name: "LOCAL_SQLITE", client: createClient({ url: `file:${LOCAL_DB_PATH}` }) });
  } catch (e) {
    console.warn("Local DB init error:", e.message);
  }

  try {
    targets.push({ name: "TURSO_CLOUD", client: createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN }) });
  } catch (e) {
    console.warn("Cloud DB init error:", e.message);
  }

  for (const { name, client } of targets) {
    console.log(`\n--- Đang chạy trên: ${name} ---`);
    for (const stmt of statements) {
      try {
        await client.execute(stmt);
      } catch (err) {
        console.error(`[${name}] Lỗi execute DDL:`, err.message);
      }
    }
    console.log(`[${name}] Đã tạo xong cấu trúc bảng và chỉ mục.`);

    // Seed question catalog
    console.log(`[${name}] Bắt đầu seed Danh mục câu hỏi phỏng vấn định hướng...`);
    let inserted = 0;
    for (const q of initialQuestions) {
      try {
        const check = await client.execute({
          sql: `SELECT id FROM "OrientationQuestionCatalog" WHERE id = ?`,
          args: [q.id]
        });
        if (check.rows.length === 0) {
          await client.execute({
            sql: `INSERT INTO "OrientationQuestionCatalog" (
              id, gradeGroup, grade, category, categoryLabel, questionText, suggestedGuideline, sortOrder, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            args: [q.id, q.gradeGroup, q.grade, q.category, q.categoryLabel, q.questionText, q.suggestedGuideline, q.sortOrder]
          });
          inserted++;
        }
      } catch (err) {
        console.error(`[${name}] Lỗi seed câu hỏi ${q.id}:`, err.message);
      }
    }
    console.log(`[${name}] Đã thêm mới ${inserted}/${initialQuestions.length} câu hỏi định hướng mẫu.`);
  }

  console.log("\n=== HOÀN THÀNH MIGRATION BƯỚC 1 THÀNH CÔNG ===");
}

run().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
