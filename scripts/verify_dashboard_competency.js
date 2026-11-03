const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function verify() {
  console.log('=== KIỂM TRA THỐNG KÊ NĂNG LỰC KHỐI 2S TRÊN TURSO ===');
  
  // 1. Criteria count by competency group
  const crits = await client.execute({
    sql: `SELECT competencyGroup, count(*) as count 
          FROM "SpecialAssessmentCriterion" 
          WHERE code LIKE 'TC02S%' 
          GROUP BY competencyGroup;`,
    args: []
  });
  console.log('\n1. Phân bổ Tiêu chuẩn năng lực Khối 2S (Mục tiêu: Hiểu 14, Biết 29, Vận dụng 12):');
  console.table(crits.rows);

  // 2. Total criteria for Grade 2S
  const totalCrit = await client.execute({
    sql: `SELECT count(*) as total FROM "SpecialAssessmentCriterion" WHERE code LIKE 'TC02S%';`,
    args: []
  });
  console.log(`Tổng số tiêu chuẩn Khối 2S: ${totalCrit.rows[0].total} (Mục tiêu: 55)`);

  // 3. Rubric levels count
  const rubrics = await client.execute({
    sql: `SELECT count(*) as totalRubrics 
          FROM "SpecialRubricLevel" r
          JOIN "SpecialAssessmentCriterion" c ON r.criterionId = c.id
          WHERE c.code LIKE 'TC02S%';`,
    args: []
  });
  console.log(`Tổng số mức Rubric: ${rubrics.rows[0].totalRubrics} (Mục tiêu: 55 x 3 = 165)`);

  // 4. Curriculum version audit
  const ver = await client.execute({
    sql: `SELECT id, versionCode, status, approvedBy, approvedAt, description, sourceDocument, updatedAt 
          FROM "SpecialCurriculumVersion" 
          WHERE id = 'spec_ver_fin_v1_0';`,
    args: []
  });
  console.log('\n2. Nhật ký phiên bản (SpecialCurriculumVersion):');
  console.log(ver.rows[0]);

  // 5. Verify other grades unaffected
  const g3 = await client.execute({
    sql: `SELECT count(*) as total FROM "SpecialAssessmentCriterion" WHERE code LIKE 'TC03S%';`,
    args: []
  });
  const g4 = await client.execute({
    sql: `SELECT count(*) as total FROM "SpecialAssessmentCriterion" WHERE code LIKE 'TC04S%';`,
    args: []
  });
  const g5 = await client.execute({
    sql: `SELECT count(*) as total FROM "SpecialAssessmentCriterion" WHERE code LIKE 'TC05S%';`,
    args: []
  });
  console.log(`\n3. Kiểm tra tính toàn vẹn các khối khác:`);
  console.log(`- Khối 3S: ${g3.rows[0].total} tiêu chuẩn (Chuẩn 45)`);
  console.log(`- Khối 4S: ${g4.rows[0].total} tiêu chuẩn (Chuẩn 57)`);
  console.log(`- Khối 5S: ${g5.rows[0].total} tiêu chuẩn (Chuẩn 65)`);
}

verify().catch(console.error);
