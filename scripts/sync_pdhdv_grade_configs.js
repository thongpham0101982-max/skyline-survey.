const { createClient } = require("@libsql/client");
const path = require("path");

const DEFAULT_TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const DEFAULT_TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const KHOI_CONFIGS = {
  KHOI_1: {
    columns: ["Giao tiếp & hòa nhập", "Tự phục vụ & nề nếp", "Hứng thú học tập & khám phá", "Cảm xúc & khả năng thích nghi"],
    composite: "Đánh giá Tổng thể & Định hướng Tiếp nhận (Khối 1)"
  },
  KHOI_2_5: {
    columns: ["Giao tiếp & hợp tác", "Thói quen & ý thức học tập", "Sở thích & năng khiếu", "Cảm xúc & tự lập"],
    composite: "Đánh giá Tổng thể & Định hướng Tiếp nhận (Tiểu học: Khối 2-5)"
  },
  KHOI_6: {
    columns: ["Giao tiếp & hòa nhập môi trường mới", "Tự học & quản lý thời gian", "Nhận thức chuyển cấp", "Cảm xúc & nhu cầu hỗ trợ"],
    composite: "Đánh giá Tổng thể & Định hướng Tiếp nhận (Khối 6: Chuyển cấp THCS)"
  },
  KHOI_7_9: {
    columns: ["Giao tiếp & hợp tác", "Tự học & trách nhiệm", "Sở trường & định hướng rèn luyện", "Cảm xúc & kỹ năng giải tỏa áp lực"],
    composite: "Đánh giá Tổng thể & Định hướng Tiếp nhận (THCS: Khối 7-9)"
  },
  KHOI_10_12: {
    columns: ["Giao tiếp & tư duy phản biện", "Tự chủ học thuật & nghiên cứu", "Định hướng nghề nghiệp & chọn tổ hợp môn", "Bản lĩnh & khả năng thích ứng"],
    composite: "Đánh giá Tổng thể & Định hướng Tiếp nhận (THPT: Khối 10-12)"
  }
};

function getGroupKey(grade) {
  const g = String(grade).toLowerCase();
  if (g.includes("10") || g.includes("11") || g.includes("12")) return "KHOI_10_12";
  if (g === "1" || g === "khối 1" || g === "lớp 1" || g.includes("mầm")) return "KHOI_1";
  if (g === "6" || g === "khối 6" || g === "lớp 6") return "KHOI_6";
  if (g.includes("7") || g.includes("8") || g.includes("9")) return "KHOI_7_9";
  if (g.includes("2") || g.includes("3") || g.includes("4") || g.includes("5")) return "KHOI_2_5";
  return "KHOI_1";
}

const allGrades = [
  "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5",
  "Khối 6", "Khối 7", "Khối 8", "Khối 9",
  "Khối 10", "Khối 11", "Khối 12"
];

async function syncToDb(client, dbName) {
  console.log(`\n=== SYNCING PDHDV GRADE CONFIGS TO ${dbName} ===`);
  const yearRes = await client.execute("SELECT id, name FROM AcademicYear ORDER BY startDate DESC LIMIT 1");
  const yearId = yearRes.rows[0]?.id || "cmnseevbh0000wjbmoigji2zd";

  const subRes = await client.execute("SELECT id FROM AssessmentSubject WHERE code = 'PDHDV'");
  const subjectId = subRes.rows[0]?.id || "subj_dinh_huong_dau_vao";

  for (const grade of allGrades) {
    const groupKey = getGroupKey(grade);
    const cfg = KHOI_CONFIGS[groupKey];
    const colNamesJson = JSON.stringify(cfg.columns);
    const colTypesJson = JSON.stringify(cfg.columns.map(() => "QUALITATIVE_EVAL"));
    const colMaxJson = JSON.stringify(cfg.columns.map(() => 4));
    const weightsJson = JSON.stringify(cfg.columns.map(() => 1));

    // Check if exists
    const existing = await client.execute({
      sql: "SELECT id FROM InputAssessmentGradeConfig WHERE academicYearId = ? AND subjectId = ? AND grade = ?",
      args: [yearId, subjectId, grade]
    });

    const now = new Date().toISOString();
    if (existing.rows.length > 0) {
      const cfgId = existing.rows[0].id;
      await client.execute({
        sql: `UPDATE InputAssessmentGradeConfig SET 
              columnCount = ?, columnNames = ?, columnTypes = ?, columnMaxScores = ?,
              hasCompositeColumn = 1, compositeColumnName = ?, hasRemarkColumn = 1,
              formula = 'NONE', formulaCustom = NULL, weights = ?, roundingRule = 'NONE',
              updatedAt = ?
              WHERE id = ?`,
        args: [cfg.columns.length, colNamesJson, colTypesJson, colMaxJson, cfg.composite, weightsJson, now, cfgId]
      });
      console.log(`Updated ${grade} -> ${groupKey}: [${cfg.columns.join(", ")}]`);
    } else {
      const id = "cfg_pdhdv_" + grade.replace(/\s+/g, "_").toLowerCase() + "_" + Date.now();
      await client.execute({
        sql: `INSERT INTO InputAssessmentGradeConfig (
                id, academicYearId, periodId, educationSystemId, grade, subjectId,
                columnCount, columnNames, columnTypes, columnMaxScores,
                hasCompositeColumn, compositeColumnName, hasRemarkColumn,
                formula, formulaCustom, weights, roundingRule, passScore, commitmentThreshold,
                status, createdAt, updatedAt
              ) VALUES (?, ?, 'HK1', 'ALL', ?, ?, ?, ?, ?, ?, 1, ?, 1, 'NONE', NULL, ?, 'NONE', NULL, NULL, 'ACTIVE', ?, ?)`,
        args: [id, yearId, grade, subjectId, cfg.columns.length, colNamesJson, colTypesJson, colMaxJson, cfg.composite, weightsJson, now, now]
      });
      console.log(`Inserted ${grade} -> ${groupKey}: [${cfg.columns.join(", ")}]`);
    }
  }

  // Verify
  const list = await client.execute({
    sql: "SELECT grade, columnNames FROM InputAssessmentGradeConfig WHERE subjectId = ? ORDER BY grade",
    args: [subjectId]
  });
  console.log(`Total PDHDV configs in ${dbName}: ${list.rows.length}`);
}

async function main() {
  const localDb = path.resolve(__dirname, "../local.db").replace(/\\/g, "/");
  const localClient = createClient({ url: `file:${localDb}` });
  await syncToDb(localClient, "LOCAL_DB");

  try {
    const tursoClient = createClient({
      url: DEFAULT_TURSO_URL,
      authToken: DEFAULT_TURSO_TOKEN
    });
    await syncToDb(tursoClient, "TURSO_CLOUD");
  } catch (err) {
    console.error("Turso sync error:", err.message);
  }
}

main().catch(console.error);
