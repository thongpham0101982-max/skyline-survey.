const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = (process.env.TURSO_DATABASE_URL || '').trim().replace(/^libsql:\/\//, 'https://');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const client = createClient({ url, authToken });

async function main() {
  console.log('--- ĐỒNG BỘ CẤU TRÚC MÔN TIẾNG ANH (TA) VÀ CÁC MÃ KSĐV / KQHT ---');

  // 1. Tìm môn chính TA
  const taRes = await client.execute("SELECT id, subjectCode, subjectName, level, studyPrograms FROM Subject WHERE subjectCode = 'TA'");
  if (taRes.rows.length === 0) throw new Error('Không tìm thấy môn chính TA!');
  const ta = taRes.rows[0];
  console.log(`Môn chính: [${ta.subjectCode}] "${ta.subjectName}" (id: ${ta.id})`);

  // 2. Cập nhật cấp bậc của môn TA lên ALL (vì đang có 67 phân công Tiểu học, 120 THCS, 22 THPT)
  await client.execute(`
    UPDATE Subject 
    SET level = 'ALL', 
        studyPrograms = CASE WHEN studyPrograms IS NULL OR studyPrograms = '' OR studyPrograms = 'Hệ S Quốc tế' 
                             THEN 'Hệ S, Hệ Song Bằng, Hệ S Quốc tế' 
                             ELSE studyPrograms END
    WHERE id = '${ta.id}'
  `);
  console.log('✅ Đã cập nhật môn chính TA: level = ALL, studyPrograms = "Hệ S, Hệ Song Bằng, Hệ S Quốc tế"');

  // 3. Gán parentId của TAv, TAvd, TAV về môn chính TA
  const childCodes = ['TAv', 'TAvd', 'TAV'];
  for (const code of childCodes) {
    const res = await client.execute(`SELECT id, subjectCode, subjectName, parentId FROM Subject WHERE subjectCode = '${code}'`);
    if (res.rows.length > 0) {
      const s = res.rows[0];
      await client.execute(`UPDATE Subject SET parentId = '${ta.id}' WHERE id = '${s.id}'`);
      console.log(`✅ Đã gán môn con [${s.subjectCode}] "${s.subjectName}" trực thuộc môn chính TA (id: ${ta.id})`);
    }
  }

  // 4. Đồng bộ Alias để khi Import file KQHT nhận diện chính xác
  // Đảm bảo các pattern 'TA', 'TAV', 'TIẾNG ANH', 'TIENG ANH' trỏ về môn chính TA
  const aliases = [
    { pattern: 'TA', key: 'ta' },
    { pattern: 'TAV', key: 'tav' },
    { pattern: 'TIẾNG ANH', key: 'tienganh' },
    { pattern: 'TIENG ANH', key: 'tienganh' }
  ];

  for (const a of aliases) {
    try {
      // Upsert alias
      await client.execute(`
        INSERT INTO SubjectAlias (id, subjectId, aliasPattern, normalizedKey, createdAt)
        VALUES ('alias_' || lower('${a.key}'), '${ta.id}', '${a.pattern}', '${a.key}', datetime('now'))
        ON CONFLICT(aliasPattern) DO UPDATE SET subjectId = '${ta.id}', normalizedKey = '${a.key}'
      `);
      console.log(`✅ Đã cập nhật Alias [${a.pattern}] -> Môn chính TA`);
    } catch (err) {
      console.warn(`Lưu ý khi tạo alias ${a.pattern}:`, err.message);
    }
  }

  // 5. Kiểm tra lại kết quả
  const checkRes = await client.execute(`
    SELECT child.subjectCode, child.subjectName, child.parentId, parent.subjectCode as parentCode
    FROM Subject child
    LEFT JOIN Subject parent ON child.parentId = parent.id
    WHERE child.parentId = '${ta.id}' OR child.id = '${ta.id}'
  `);
  console.log('\nKết quả cấu trúc môn Tiếng Anh:');
  console.table(checkRes.rows);
}

main().catch(console.error);
