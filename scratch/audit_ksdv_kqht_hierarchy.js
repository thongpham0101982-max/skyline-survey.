const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = (process.env.TURSO_DATABASE_URL || '').trim().replace(/^libsql:\/\//, 'https://');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const client = createClient({ url, authToken });

async function main() {
  console.log('=== RÀ SOÁT QUAN HỆ MÔN CHÍNH - MÔN CON VÀ MÃ KSĐV / KQHT ===\n');

  // 1. Kiểm tra môn TA và các mã TAV, TAv, TAvd
  const taGroup = await client.execute(`
    SELECT id, subjectCode, subjectName, parentId, level, category, evaluationType, studyPrograms
    FROM Subject
    WHERE subjectCode IN ('TA', 'TAV', 'TAv', 'TAvd', 'EPT')
       OR subjectName LIKE '%Tiếng Anh%'
  `);
  console.log('1. Nhóm Tiếng Anh trong bảng Subject:');
  console.table(taGroup.rows);

  // 2. Kiểm tra liên kết điểm số / đánh giá của từng mã
  for (const row of taGroup.rows) {
    const scores = await client.execute(`SELECT COUNT(*) as c FROM StudentTermScore WHERE subjectId = '${row.id}'`);
    const entries = await client.execute(`SELECT COUNT(*) as c FROM SubjectGradeEntry WHERE subjectId = '${row.id}'`);
    const assigns = await client.execute(`SELECT COUNT(*) as c FROM TeachingAssignment WHERE subjectId = '${row.id}'`);
    const quotas = await client.execute(`SELECT COUNT(*) as c FROM SubjectQuota WHERE subjectId = '${row.id}'`);
    console.log(`- Mã [${row.subjectCode}] "${row.subjectName}" (id: ${row.id}):`);
    console.log(`  + parentId: ${row.parentId}`);
    console.log(`  + StudentTermScore: ${scores.rows[0].c}, SubjectGradeEntry: ${entries.rows[0].c}, TeachingAssignment: ${assigns.rows[0].c}, SubjectQuota: ${quotas.rows[0].c}`);
  }

  // 3. Kiểm tra trong AssessmentSubject (KSĐV)
  console.log('\n2. Nhóm Tiếng Anh trong AssessmentSubject (Khảo sát đầu vào KSĐV):');
  const asEng = await client.execute(`
    SELECT asub.id, asub.code, asub.name, asub.subjectType, COUNT(sas.id) as scoreCount
    FROM AssessmentSubject asub
    LEFT JOIN StudentAssessmentScore sas ON sas.subjectId = asub.id
    WHERE asub.code IN ('TA', 'TAV', 'TAv', 'TAvd', 'EPT') OR asub.name LIKE '%Anh%'
    GROUP BY asub.id, asub.code, asub.name, asub.subjectType
  `);
  console.table(asEng.rows);

  // 4. Kiểm tra các môn khác có cấu trúc Môn cha - Môn con hoặc Phân môn
  console.log('\n3. Toàn bộ các môn có phân cấp cha - con (parentId):');
  const allParentChild = await client.execute(`
    SELECT c.id, c.subjectCode, c.subjectName, c.parentId, p.subjectCode as parentCode, p.subjectName as parentName
    FROM Subject c
    JOIN Subject p ON c.parentId = p.id
  `);
  console.table(allParentChild.rows);

  // 5. Kiểm tra các môn tích hợp có phân môn (KHTN: Lý-Hóa-Sinh, Lịch sử - Địa lý, ...)
  console.log('\n4. Các cặp môn tích hợp / phân môn trong Subject:');
  const integrated = await client.execute(`
    SELECT id, subjectCode, subjectName, category, level, parentId
    FROM Subject
    WHERE subjectCode IN ('KHT', 'VLI', 'HHO', 'SHO', 'LSU', 'DLI', 'LICH_SU', 'STE', 'STEM', 'TIN_HOC', 'ICT', 'GCX', 'CD_CD', 'CD_CXXH')
    ORDER BY subjectCode ASC
  `);
  console.table(integrated.rows);
}

main().catch(console.error);
