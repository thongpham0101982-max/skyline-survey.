const { createClient } = require('@libsql/client');
const path = require('path');

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";
const defaultLocalDbPath = path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/');

async function syncConfigs() {
  const cloudClient = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
  const localClient = createClient({ url: `file:${defaultLocalDbPath}` });

  // 1. Cập nhật môn Tâm lý (TLY) trên tất cả các khối
  // 6 nhóm tiêu chí chuẩn bám sát Form Giáo viên (PsychologyAssessmentForm):
  // I. Cảm xúc & điều hòa cảm xúc (16đ)
  // II. Hành vi & tự kiểm soát (12đ)
  // III. Giao tiếp & tương tác xã hội (12đ)
  // IV. Chú ý & kỹ năng học tập (16đ)
  // V. Ngôn ngữ & tư duy / Tự nhận thức (12đ)
  // VI. Động lực học tập & thái độ (12đ)
  // Tổng điểm: 80đ
  const tlyCols = JSON.stringify([
    "I. Cảm xúc & điều hòa cảm xúc",
    "II. Hành vi & tự kiểm soát",
    "III. Giao tiếp & tương tác xã hội",
    "IV. Chú ý & kỹ năng học tập",
    "V. Ngôn ngữ & tư duy / Tự nhận thức",
    "VI. Động lực học tập & thái độ"
  ]);
  const tlyTypes = JSON.stringify([
    "SCORE_CUSTOM_100",
    "SCORE_CUSTOM_100",
    "SCORE_CUSTOM_100",
    "SCORE_CUSTOM_100",
    "SCORE_CUSTOM_100",
    "SCORE_CUSTOM_100"
  ]);
  const tlyMaxScores = JSON.stringify([16, 12, 12, 16, 12, 12]);
  const tlyWeights = JSON.stringify([1, 1, 1, 1, 1, 1]);

  // 2. Cập nhật môn Năng lực tư duy (NLTD) cho Khối 1 bám sát Form Giáo viên (ThinkingSkillsForm):
  // 1. Khả năng suy luận logic (A/B/C/D)
  // 2. Khả năng liên tưởng (A/B/C/D)
  // 3. Kĩ năng phản biện (A/B/C/D)
  // 4. Khả năng giải quyết vấn đề (A/B/C/D)
  // 5. Mức độ hoàn thành thử thách (%) (Max 100%)
  const nltdK1Cols = JSON.stringify([
    "Khả năng suy luận logic",
    "Khả năng liên tưởng",
    "Kĩ năng phản biện",
    "Khả năng giải quyết vấn đề",
    "Mức độ hoàn thành thử thách (%)"
  ]);
  const nltdK1Types = JSON.stringify([
    "GRADE_SKL",
    "GRADE_SKL",
    "GRADE_SKL",
    "GRADE_SKL",
    "SCORE_CUSTOM_100"
  ]);
  const nltdK1MaxScores = JSON.stringify([4, 4, 4, 4, 100]);
  const nltdK1Weights = JSON.stringify([1, 1, 1, 1, 1]);

  for (const client of [cloudClient, localClient]) {
    const dbName = client === cloudClient ? "Cloud Turso" : "Local SQLite";
    console.log(`\n=== Updating ${dbName} ===`);

    // Lấy ID của subject TLY và NLTD
    const subs = await client.execute("SELECT id, code FROM AssessmentSubject WHERE code IN ('TLY', 'NLTD', 'TAv', 'TAvd', 'TOA', 'TVI');");
    const subMap = {};
    subs.rows.forEach(r => { subMap[r.code] = r.id; });

    if (subMap['TLY']) {
      const resTly = await client.execute({
        sql: `UPDATE InputAssessmentGradeConfig 
              SET columnCount = 6, 
                  columnNames = ?, 
                  columnTypes = ?, 
                  columnMaxScores = ?, 
                  weights = ?, 
                  compositeColumnName = 'Tổng điểm Tâm lý (Max 80đ)',
                  formula = 'SUM',
                  passScore = 48.0,
                  commitmentThreshold = 40.0,
                  updatedAt = CURRENT_TIMESTAMP
              WHERE subjectId = ?;`,
        args: [tlyCols, tlyTypes, tlyMaxScores, tlyWeights, subMap['TLY']]
      });
      console.log(`- Updated ${resTly.rowsAffected} TLY configs to 6 sections matching Teacher Form.`);
    }

    if (subMap['NLTD']) {
      const resNltd = await client.execute({
        sql: `UPDATE InputAssessmentGradeConfig 
              SET columnCount = 5, 
                  columnNames = ?, 
                  columnTypes = ?, 
                  columnMaxScores = ?, 
                  weights = ?, 
                  compositeColumnName = 'Mức độ hoàn thành (%)',
                  formula = 'NONE',
                  passScore = 50.0,
                  commitmentThreshold = 40.0,
                  updatedAt = CURRENT_TIMESTAMP
              WHERE subjectId = ? AND grade = 'Khối 1';`,
        args: [nltdK1Cols, nltdK1Types, nltdK1MaxScores, nltdK1Weights, subMap['NLTD']]
      });
      console.log(`- Updated ${resNltd.rowsAffected} NLTD Grade 1 configs matching Teacher Form.`);
    }
  }

  console.log('\nAll databases updated successfully to match Teacher Forms 100%!');
}

syncConfigs().catch(console.error);
