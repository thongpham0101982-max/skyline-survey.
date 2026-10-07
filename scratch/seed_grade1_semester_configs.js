const { createClient } = require('@libsql/client');
const path = require('path');

async function main() {
  const localDbPath = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
  const client = createClient({ url: 'file:' + localDbPath });

  // Lấy năm học active
  const years = await client.execute("SELECT id FROM AcademicYear WHERE status = 'ACTIVE' LIMIT 1");
  const yearId = years.rows[0]?.id;
  if (!yearId) {
    console.log("No academic year found!");
    return;
  }

  // Lấy ID các môn học
  const subjects = await client.execute("SELECT id, code, name FROM AssessmentSubject WHERE code IN ('TOA', 'TVI', 'TAv', 'TAvd', 'TLY', 'NLTD')");
  const subMap = {};
  subjects.rows.forEach(s => { subMap[s.code] = s.id; });
  console.log("Found subjects for Grade 1:", subMap);

  const mocs = [
    { periodId: "HK1", label: "Học kỳ 1" },
    { periodId: "HK2", label: "Học kỳ 2" }
  ];

  for (const moc of mocs) {
    console.log(`Bổ sung cấu hình Khối 1 cho mốc: ${moc.label} (${moc.periodId})...`);

    // 1. Môn Toán (TOA) Khối 1 HK1/HK2
    if (subMap.TOA) {
      const id = `cfg_k1_toa_${moc.periodId.toLowerCase()}`;
      const colNames = JSON.stringify(["Trắc nghiệm tư duy số", "Tự luận & Giải toán"]);
      const colTypes = JSON.stringify(["SCORE_CUSTOM", "SCORE_CUSTOM"]);
      const colMax = JSON.stringify([4, 6]);
      await client.execute({
        sql: `
          INSERT INTO "InputAssessmentGradeConfig"
          ("id", "academicYearId", "periodId", "educationSystemId", "grade", "subjectId",
           "columnCount", "columnNames", "columnTypes", "columnMaxScores", "hasCompositeColumn",
           "compositeColumnName", "hasRemarkColumn", "formula", "weights", "roundingRule", "passScore", "commitmentThreshold", "status")
          VALUES (?, ?, ?, 'ALL', 'Khối 1', ?, 2, ?, ?, ?, 1, 'Tổng điểm Toán (Max 10đ)', 1, 'SUM', '[1,1]', 'ROUND_1', 5.0, 4.5, 'ACTIVE')
          ON CONFLICT("academicYearId", "periodId", "educationSystemId", "grade", "subjectId")
          DO UPDATE SET
            "columnNames" = excluded.columnNames,
            "columnMaxScores" = excluded.columnMaxScores,
            "compositeColumnName" = excluded.compositeColumnName;
        `,
        args: [id, yearId, moc.periodId, subMap.TOA, colNames, colTypes, colMax]
      });
      console.log(`- Đã thêm Toán Khối 1 (${moc.periodId})`);
    }

    // 2. Môn Tiếng Việt (TVI) Khối 1 HK1/HK2
    if (subMap.TVI) {
      const id = `cfg_k1_tvi_${moc.periodId.toLowerCase()}`;
      const colNames = JSON.stringify(["Đọc thành tiếng & Đọc hiểu", "Viết chính tả & Rèn chữ"]);
      const colTypes = JSON.stringify(["SCORE_CUSTOM", "SCORE_CUSTOM"]);
      const colMax = JSON.stringify([5, 5]);
      await client.execute({
        sql: `
          INSERT INTO "InputAssessmentGradeConfig"
          ("id", "academicYearId", "periodId", "educationSystemId", "grade", "subjectId",
           "columnCount", "columnNames", "columnTypes", "columnMaxScores", "hasCompositeColumn",
           "compositeColumnName", "hasRemarkColumn", "formula", "weights", "roundingRule", "passScore", "commitmentThreshold", "status")
          VALUES (?, ?, ?, 'ALL', 'Khối 1', ?, 2, ?, ?, ?, 1, 'Tổng điểm Tiếng Việt (Max 10đ)', 1, 'SUM', '[1,1]', 'ROUND_1', 5.0, 4.5, 'ACTIVE')
          ON CONFLICT("academicYearId", "periodId", "educationSystemId", "grade", "subjectId")
          DO UPDATE SET
            "columnNames" = excluded.columnNames,
            "columnMaxScores" = excluded.columnMaxScores,
            "compositeColumnName" = excluded.compositeColumnName;
        `,
        args: [id, yearId, moc.periodId, subMap.TVI, colNames, colTypes, colMax]
      });
      console.log(`- Đã thêm Tiếng Việt Khối 1 (${moc.periodId})`);
    }

    // 3. Môn Tiếng Anh (viết) (TAv) Khối 1 HK1/HK2 (Thang 70đ chuẩn Sky-Line)
    if (subMap.TAv) {
      const id = `cfg_k1_tav_${moc.periodId.toLowerCase()}`;
      const colNames = JSON.stringify(["Reading (Đọc nhận biết từ)", "Writing (Viết từ & Câu đơn)", "Language Focus (Từ vựng cơ bản)"]);
      const colTypes = JSON.stringify(["SCORE_CUSTOM_100", "SCORE_CUSTOM_100", "SCORE_CUSTOM_100"]);
      const colMax = JSON.stringify([25, 25, 20]);
      await client.execute({
        sql: `
          INSERT INTO "InputAssessmentGradeConfig"
          ("id", "academicYearId", "periodId", "educationSystemId", "grade", "subjectId",
           "columnCount", "columnNames", "columnTypes", "columnMaxScores", "hasCompositeColumn",
           "compositeColumnName", "hasRemarkColumn", "formula", "weights", "roundingRule", "passScore", "commitmentThreshold", "status")
          VALUES (?, ?, ?, 'ALL', 'Khối 1', ?, 3, ?, ?, ?, 1, 'Tổng điểm Viết (Max 70đ)', 1, 'SUM', '[1,1,1]', 'ROUND_1', 35.0, 30.0, 'ACTIVE')
          ON CONFLICT("academicYearId", "periodId", "educationSystemId", "grade", "subjectId")
          DO UPDATE SET
            "columnNames" = excluded.columnNames,
            "columnMaxScores" = excluded.columnMaxScores,
            "compositeColumnName" = excluded.compositeColumnName;
        `,
        args: [id, yearId, moc.periodId, subMap.TAv, colNames, colTypes, colMax]
      });
      console.log(`- Đã thêm Tiếng Anh (viết) Khối 1 (${moc.periodId})`);
    }
  }

  console.log("Hoàn tất nạp cấu hình Khối 1 theo mốc thời gian HK1 & HK2!");
}

main().catch(console.error);
