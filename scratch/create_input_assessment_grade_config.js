const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

async function main() {
  const localDbPath = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
  const client = createClient({ url: 'file:' + localDbPath });

  console.log("Creating InputAssessmentGradeConfig table if not exists in local.db...");
  await client.execute(`
    CREATE TABLE IF NOT EXISTS "InputAssessmentGradeConfig" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "academicYearId" TEXT NOT NULL,
      "periodId" TEXT DEFAULT 'ALL',
      "educationSystemId" TEXT DEFAULT 'ALL',
      "grade" TEXT NOT NULL DEFAULT 'ALL',
      "subjectId" TEXT NOT NULL,
      "columnCount" INTEGER NOT NULL DEFAULT 1,
      "columnNames" TEXT NOT NULL DEFAULT '["Điểm 1"]',
      "columnTypes" TEXT DEFAULT '["SCORE_10"]',
      "columnMaxScores" TEXT DEFAULT '[10]',
      "hasCompositeColumn" BOOLEAN NOT NULL DEFAULT 1,
      "compositeColumnName" TEXT DEFAULT 'Điểm tổng hợp',
      "hasRemarkColumn" BOOLEAN NOT NULL DEFAULT 1,
      "formula" TEXT DEFAULT 'AVERAGE',
      "formulaCustom" TEXT,
      "weights" TEXT,
      "roundingRule" TEXT DEFAULT 'ROUND_1',
      "passScore" REAL,
      "commitmentThreshold" REAL,
      "status" TEXT NOT NULL DEFAULT 'ACTIVE',
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS "InputAssessmentGradeConfig_unique_idx"
    ON "InputAssessmentGradeConfig"("academicYearId", "periodId", "educationSystemId", "grade", "subjectId");
  `);

  console.log("Table InputAssessmentGradeConfig created successfully!");

  // Lấy năm học active
  const years = await client.execute("SELECT id, name FROM AcademicYear WHERE status = 'ACTIVE' LIMIT 1");
  const activeYear = years.rows[0] || (await client.execute("SELECT id, name FROM AcademicYear LIMIT 1")).rows[0];
  if (!activeYear) {
    console.log("No academic year found, skip seed.");
    return;
  }
  const yearId = activeYear.id;
  console.log("Active Academic Year:", activeYear.name, yearId);

  // Lấy danh sách AssessmentSubject
  const subRows = await client.execute("SELECT id, code, name FROM AssessmentSubject");
  const subMap = {};
  subRows.rows.forEach(s => { subMap[s.code] = s.id; });
  console.log("Found AssessmentSubjects:", Object.keys(subMap));

  // Định nghĩa cấu hình mẫu chuẩn cho các môn cốt lõi
  const standardConfigs = [
    {
      code: "TAv",
      name: "Tiếng Anh (viết)",
      grades: ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"],
      columnCount: 3,
      columnNames: ["Reading (Đọc hiểu)", "Writing (Viết & Tự luận)", "Language Use (Ngữ pháp & Từ vựng)"],
      columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
      columnMaxScores: [4, 3, 3],
      hasCompositeColumn: true,
      compositeColumnName: "Điểm tổng hợp",
      formula: "SUM",
      formulaCustom: "",
      weights: [1, 1, 1],
      roundingRule: "ROUND_1",
      passScore: 5.0,
      commitmentThreshold: 4.5
    },
    {
      code: "TAvd",
      name: "Tiếng Anh (vấn đáp)",
      grades: ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"],
      columnCount: 3,
      columnNames: ["Fluency & Pronunciation", "Lexical & Grammar", "Interactive Communication"],
      columnTypes: ["SCORE_10", "SCORE_10", "SCORE_10"],
      columnMaxScores: [10, 10, 10],
      hasCompositeColumn: true,
      compositeColumnName: "Điểm phỏng vấn",
      formula: "AVERAGE",
      formulaCustom: "",
      weights: [1, 1, 1],
      roundingRule: "ROUND_1",
      passScore: 5.0,
      commitmentThreshold: 4.5
    },
    {
      code: "TLY",
      name: "Tâm lý",
      grades: ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"],
      columnCount: 4,
      columnNames: ["Tương tác xã hội & Giao tiếp", "Khả năng thích ứng môi trường", "Kiểm soát cảm xúc & Hành vi", "Mức độ tập trung chú ý"],
      columnTypes: ["SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100"],
      columnMaxScores: [20, 20, 20, 20],
      hasCompositeColumn: true,
      compositeColumnName: "Tổng điểm Tâm lý",
      formula: "SUM",
      formulaCustom: "",
      weights: [1, 1, 1, 1],
      roundingRule: "ROUND_INT",
      passScore: 50.0,
      commitmentThreshold: 45.0
    },
    {
      code: "NLTD",
      name: "Năng lực tư duy",
      grades: ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"],
      columnCount: 3,
      columnNames: ["Tư duy Logic & Hình ảnh", "Tư duy Toán học & Định lượng", "Tư duy Ngôn ngữ & Khái quát"],
      columnTypes: ["SCORE_CUSTOM", "SCORE_CUSTOM", "SCORE_CUSTOM"],
      columnMaxScores: [4, 3, 3],
      hasCompositeColumn: true,
      compositeColumnName: "Điểm NLTD",
      formula: "SUM",
      formulaCustom: "",
      weights: [1, 1, 1],
      roundingRule: "ROUND_1",
      passScore: 5.0,
      commitmentThreshold: 4.5
    },
    {
      code: "EPT",
      name: "EPT",
      grades: ["Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"],
      columnCount: 4,
      columnNames: ["Listening (Nghe)", "Reading (Đọc)", "Writing (Viết)", "Speaking (Nói)"],
      columnTypes: ["SCORE_100", "SCORE_100", "SCORE_100", "SCORE_100"],
      columnMaxScores: [100, 100, 100, 100],
      hasCompositeColumn: true,
      compositeColumnName: "Điểm tổng EPT",
      formula: "AVERAGE",
      formulaCustom: "",
      weights: [1, 1, 1, 1],
      roundingRule: "ROUND_1",
      passScore: 50.0,
      commitmentThreshold: 40.0
    }
  ];

  let seedCount = 0;
  for (const item of standardConfigs) {
    const subId = subMap[item.code];
    if (!subId) continue;

    for (const g of item.grades) {
      const id = "ksdv_cfg_" + Math.random().toString(36).substring(2, 10);
      const colNamesJson = JSON.stringify(item.columnNames);
      const colTypesJson = JSON.stringify(item.columnTypes);
      const colMaxJson = JSON.stringify(item.columnMaxScores);
      const weightsJson = JSON.stringify(item.weights);

      await client.execute({
        sql: `
          INSERT INTO "InputAssessmentGradeConfig" 
          ("id", "academicYearId", "periodId", "educationSystemId", "grade", "subjectId", 
           "columnCount", "columnNames", "columnTypes", "columnMaxScores", "hasCompositeColumn", 
           "compositeColumnName", "hasRemarkColumn", "formula", "formulaCustom", "weights", 
           "roundingRule", "passScore", "commitmentThreshold", "status")
          VALUES (?, ?, 'ALL', 'ALL', ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'ACTIVE')
          ON CONFLICT("academicYearId", "periodId", "educationSystemId", "grade", "subjectId")
          DO UPDATE SET 
            "columnCount" = excluded.columnCount,
            "columnNames" = excluded.columnNames,
            "columnTypes" = excluded.columnTypes,
            "columnMaxScores" = excluded.columnMaxScores,
            "hasCompositeColumn" = excluded.hasCompositeColumn,
            "compositeColumnName" = excluded.compositeColumnName,
            "formula" = excluded.formula,
            "weights" = excluded.weights,
            "roundingRule" = excluded.roundingRule,
            "passScore" = excluded.passScore,
            "commitmentThreshold" = excluded.commitmentThreshold;
        `,
        args: [
          id, yearId, g, subId, 
          item.columnCount, colNamesJson, colTypesJson, colMaxJson, 
          item.hasCompositeColumn ? 1 : 0, item.compositeColumnName, 
          item.formula, item.formulaCustom, weightsJson, item.roundingRule, 
          item.passScore, item.commitmentThreshold
        ]
      });
      seedCount++;
    }
  }

  console.log(`Successfully seeded ${seedCount} standard grade configs for KSDV!`);
}

main().catch(console.error);
