const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = (process.env.TURSO_DATABASE_URL || '').trim().replace(/^libsql:\/\//, 'https://');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

let client;
if (url && authToken) {
  client = createClient({ url, authToken });
} else {
  const dbFile = path.resolve(__dirname, '../local.db');
  client = createClient({ url: 'file:' + dbFile.replace(/\\/g, '/') });
}

function normalizeName(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log('--- Fetching all subjects ---');
  const res = await client.execute('SELECT id, subjectCode, subjectName, category, evaluationType, level, studyPrograms, parentId, status FROM Subject ORDER BY subjectName ASC');
  const subjects = res.rows;
  console.log(`Total subjects in DB: ${subjects.length}`);

  // 1. Group by exact subjectName
  const byExactName = {};
  // 2. Group by normalized subjectName
  const byNormName = {};
  // 3. Group by subjectCode
  const byCode = {};

  for (const s of subjects) {
    const exact = (s.subjectName || '').trim();
    if (!byExactName[exact]) byExactName[exact] = [];
    byExactName[exact].push(s);

    const norm = normalizeName(exact);
    if (!byNormName[norm]) byNormName[norm] = [];
    byNormName[norm].push(s);

    const code = (s.subjectCode || '').trim().toUpperCase();
    if (!byCode[code]) byCode[code] = [];
    byCode[code].push(s);
  }

  console.log('\n==========================================');
  console.log('1. CÁC MÔN TRÙNG TÊN CHÍNH XÁC (EXACT NAME)');
  console.log('==========================================');
  let exactDupCount = 0;
  for (const [name, list] of Object.entries(byExactName)) {
    if (list.length > 1) {
      exactDupCount++;
      console.log(`\n👉 Tên: "${name}" (${list.length} bản ghi):`);
      for (const item of list) {
        // Check usage in other tables
        const quotaRes = await client.execute(`SELECT COUNT(*) as c FROM SubjectQuota WHERE subjectId = '${item.id}'`);
        const assignRes = await client.execute(`SELECT COUNT(*) as c FROM TeachingAssignment WHERE subjectId = '${item.id}'`);
        const gradeRes = await client.execute(`SELECT COUNT(*) as c FROM SubjectGradeEntry WHERE subjectId = '${item.id}'`);
        const termScoreRes = await client.execute(`SELECT COUNT(*) as c FROM StudentTermScore WHERE subjectId = '${item.id}'`);
        
        console.log(`   - ID: ${item.id} | Mã: [${item.subjectCode}] | Bậc: ${item.level} | Danh mục: ${item.category} | Hình thức: ${item.evaluationType} | Hệ: ${item.studyPrograms}`);
        console.log(`     * Dữ liệu liên kết: Quota: ${quotaRes.rows[0].c}, Phân công: ${assignRes.rows[0].c}, Điểm số/đánh giá: ${gradeRes.rows[0].c + termScoreRes.rows[0].c}`);
      }
    }
  }
  if (exactDupCount === 0) console.log('Không có môn trùng tên chính xác 100%.');

  console.log('\n==========================================');
  console.log('2. CÁC MÔN TRÙNG TÊN TƯƠNG ĐỐI (NORMALIZED NAME - KHÔNG DẤU/CHỮ HOA-THƯỜNG/KHOẢNG TRẮNG)');
  console.log('==========================================');
  let normDupCount = 0;
  for (const [norm, list] of Object.entries(byNormName)) {
    if (list.length > 1) {
      // Check if they are not already listed under exact match
      const distinctNames = new Set(list.map(s => (s.subjectName || '').trim()));
      if (distinctNames.size > 1) {
        normDupCount++;
        console.log(`\n👉 Nhóm tương đồng: "${norm}" (${list.length} bản ghi):`);
        for (const item of list) {
          const quotaRes = await client.execute(`SELECT COUNT(*) as c FROM SubjectQuota WHERE subjectId = '${item.id}'`);
          const assignRes = await client.execute(`SELECT COUNT(*) as c FROM TeachingAssignment WHERE subjectId = '${item.id}'`);
          const gradeRes = await client.execute(`SELECT COUNT(*) as c FROM SubjectGradeEntry WHERE subjectId = '${item.id}'`);
          const termScoreRes = await client.execute(`SELECT COUNT(*) as c FROM StudentTermScore WHERE subjectId = '${item.id}'`);

          console.log(`   - ID: ${item.id} | Tên: "${item.subjectName}" | Mã: [${item.subjectCode}] | Bậc: ${item.level} | Danh mục: ${item.category} | Hình thức: ${item.evaluationType}`);
          console.log(`     * Dữ liệu liên kết: Quota: ${quotaRes.rows[0].c}, Phân công: ${assignRes.rows[0].c}, Điểm số/đánh giá: ${gradeRes.rows[0].c + termScoreRes.rows[0].c}`);
        }
      }
    }
  }
  if (normDupCount === 0) console.log('Không có thêm môn trùng tên tương đối.');

  console.log('\n==========================================');
  console.log('3. CÁC MÔN CÙNG LOẠI MÔN NHƯNG TÁCH THEO BẬC HOẶC TÊN TƯƠNG TỰ (VD: Toán Tiểu học vs Toán, Tiếng Anh...)');
  console.log('==========================================');
  // Check for common subjects like Toan, Van, Anh, Tin, etc.
  const commonKeywords = ['toan', 'van', 'tieng viet', 'tieng anh', 'anh van', 'tin hoc', 'khoa hoc', 'khtn', 'lich su', 'dia li', 'am nhac', 'my thuat', 'the duc', 'gdtc', 'gdcd', 'cong nghe', 'hoat dong trai nghiem'];
  for (const kw of commonKeywords) {
    const matching = subjects.filter(s => normalizeName(s.subjectName).includes(kw));
    if (matching.length > 1) {
      console.log(`\n🔍 Nhóm từ khóa [${kw.toUpperCase()}]: ${matching.length} môn:`);
      for (const m of matching) {
        console.log(`   - [${m.subjectCode}] "${m.subjectName}" | Bậc: ${m.level} | Danh mục: ${m.category} | Hệ: ${m.studyPrograms} | ID: ${m.id}`);
      }
    }
  }
}

main().catch(err => {
  console.error('Error running audit:', err);
});
