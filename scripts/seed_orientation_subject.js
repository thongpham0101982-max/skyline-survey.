const { createClient } = require("@libsql/client");
const path = require("path");

const LOCAL_DB_PATH = path.resolve(__dirname, "../local.db").replace(/\\/g, "/");
const CLOUD_URL = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const CLOUD_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const SUBJECT_ID = "subj_dinh_huong_dau_vao";
const SUBJECT_CODE = "PDHDV";
const SUBJECT_NAME = "Phiếu định hướng đầu vào";
const SUBJECT_TYPE = "Định hướng";
const SORT_ORDER = 10;
const STATUS = "ACTIVE";

async function runOnTarget(name, client) {
  console.log(`\n================== [TARGET: ${name}] ==================`);
  
  // 1. Kiểm tra môn đã tồn tại chưa
  const existing = await client.execute({
    sql: "SELECT id, code, name FROM AssessmentSubject WHERE code = ? OR id = ? OR name = ?",
    args: [SUBJECT_CODE, SUBJECT_ID, SUBJECT_NAME]
  });

  if (existing.rows.length > 0) {
    console.log(`Môn "${SUBJECT_NAME}" đã tồn tại:`, existing.rows[0]);
    // Cập nhật lại trạng thái ACTIVE nếu cần
    await client.execute({
      sql: "UPDATE AssessmentSubject SET status = 'ACTIVE', sortOrder = ? WHERE id = ?",
      args: [SORT_ORDER, existing.rows[0].id]
    });
    console.log("Đã cập nhật trạng thái ACTIVE thành công!");
  } else {
    // Chèn mới
    await client.execute({
      sql: `INSERT INTO AssessmentSubject (
        id, code, name, subjectType, scoreColumns, commentColumns, sortOrder, status, columnNames, createdAt
      ) VALUES (?, ?, ?, ?, 1, 1, ?, ?, ?, datetime('now'))`,
      args: [
        SUBJECT_ID,
        SUBJECT_CODE,
        SUBJECT_NAME,
        SUBJECT_TYPE,
        SORT_ORDER,
        STATUS,
        JSON.stringify(["Định hướng tiếp nhận"])
      ]
    });
    console.log(`Đã thêm mới môn "${SUBJECT_NAME}" (${SUBJECT_CODE}) thành công!`);
  }

  const allSubjects = await client.execute("SELECT id, code, name, subjectType, sortOrder FROM AssessmentSubject ORDER BY sortOrder ASC");
  console.log("Danh sách môn khảo sát hiện tại:");
  allSubjects.rows.forEach(s => console.log(` - [${s.code}] ${s.name} (${s.subjectType || "Khác"}) - Thứ tự: ${s.sortOrder}`));
}

async function main() {
  console.log("Bắt đầu thêm Môn khảo sát 'Phiếu định hướng đầu vào'...");

  // 1. Local SQLite
  try {
    const localClient = createClient({ url: `file:${LOCAL_DB_PATH}` });
    await runOnTarget("LOCAL_SQLITE", localClient);
  } catch (err) {
    console.error("Lỗi trên LOCAL_SQLITE:", err.message);
  }

  // 2. Turso Cloud
  try {
    const cloudClient = createClient({ url: CLOUD_URL, authToken: CLOUD_TOKEN });
    await runOnTarget("TURSO_CLOUD", cloudClient);
  } catch (err) {
    console.error("Lỗi trên TURSO_CLOUD:", err.message);
  }

  console.log("\nHoàn tất seed môn 'Phiếu định hướng đầu vào'!");
}

main().catch(console.error);
