const { createClient } = require('@libsql/client');
const path = require('path');

async function main() {
  const localDbPath = path.resolve(__dirname, '../local.db').replace(/\\/g, '/');
  const client = createClient({ url: 'file:' + localDbPath });

  // 1. Lấy thông tin môn TAv, TAvd
  const tavRes = await client.execute("SELECT id FROM AssessmentSubject WHERE code = 'TAv'");
  const tavdRes = await client.execute("SELECT id FROM AssessmentSubject WHERE code = 'TAvd'");
  const tavId = tavRes.rows[0]?.id;
  const tavdId = tavdRes.rows[0]?.id;

  if (tavId) {
    // Xóa cấu hình TAv cho Khối 1 vì Khối 1 không thi viết tiếng Anh
    console.log("Xóa cấu hình Tiếng Anh (viết) Khối 1 nếu có...");
    await client.execute({
      sql: "DELETE FROM InputAssessmentGradeConfig WHERE subjectId = ? AND grade = 'Khối 1'",
      args: [tavId]
    });

    // Cập nhật cấu hình TAv cho Khối 2 - 12 theo Thang chuẩn 70 điểm của Sky-Line
    console.log("Cập nhật Tiếng Anh (viết) Khối 2 - 12 theo thang 70 điểm...");
    const grades = ["Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"];
    
    for (const g of grades) {
      let colNames = ["Reading (Đọc hiểu)", "Writing (Viết & Tự luận)", "Language Focus (Từ vựng & Ngữ pháp)"];
      let colMax = [25, 25, 20];
      
      const numG = parseInt(g.replace("Khối ", ""));
      if (numG >= 10) {
        colNames = ["Reading & Cloze test", "Writing & Essay", "Lexico-Grammar & Language"];
        colMax = [30, 25, 15];
      } else if (numG >= 6) {
        colNames = ["Reading Comprehension", "Writing Sentence & Paragraph", "Language in Use"];
        colMax = [25, 25, 20];
      }

      await client.execute({
        sql: `
          UPDATE InputAssessmentGradeConfig 
          SET 
            columnCount = 3,
            columnNames = ?,
            columnTypes = '["SCORE_CUSTOM_100","SCORE_CUSTOM_100","SCORE_CUSTOM_100"]',
            columnMaxScores = ?,
            hasCompositeColumn = 1,
            compositeColumnName = 'Tổng điểm Viết (Max 70đ)',
            formula = 'SUM',
            weights = '[1,1,1]',
            roundingRule = 'ROUND_1',
            passScore = 35.0,
            commitmentThreshold = 30.0
          WHERE subjectId = ? AND grade = ?;
        `,
        args: [JSON.stringify(colNames), JSON.stringify(colMax), tavId, g]
      });
    }
  }

  if (tavdId) {
    // Cập nhật cấu hình TAvd cho Khối 1 - 12 theo Thang 30 điểm
    console.log("Cập nhật Tiếng Anh (vấn đáp) Khối 1 - 12 theo thang 30 điểm...");
    const allGrades = ["Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5", "Khối 6", "Khối 7", "Khối 8", "Khối 9", "Khối 10", "Khối 11", "Khối 12"];
    for (const g of allGrades) {
      const colNames = ["Fluency & Pronunciation", "Lexical & Grammar", "Interactive Communication"];
      const colMax = [10, 10, 10];
      await client.execute({
        sql: `
          UPDATE InputAssessmentGradeConfig 
          SET 
            columnCount = 3,
            columnNames = ?,
            columnTypes = '["SCORE_CUSTOM","SCORE_CUSTOM","SCORE_CUSTOM"]',
            columnMaxScores = ?,
            hasCompositeColumn = 1,
            compositeColumnName = 'Tổng điểm Vấn đáp (Max 30đ)',
            formula = 'SUM',
            weights = '[1,1,1]',
            roundingRule = 'ROUND_1',
            passScore = 15.0,
            commitmentThreshold = 12.0
          WHERE subjectId = ? AND grade = ?;
        `,
        args: [JSON.stringify(colNames), JSON.stringify(colMax), tavdId, g]
      });
    }
  }

  console.log("Hoàn tất rà soát và cập nhật Tiếng Anh theo từng khối!");
}

main().catch(console.error);
