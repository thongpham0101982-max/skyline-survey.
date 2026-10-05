const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = (process.env.TURSO_DATABASE_URL || '').trim().replace(/^libsql:\/\//, 'https://');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const client = createClient({ url, authToken });

function normalizeKey(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

const DG_LIST = [
  { code: 'DG_AN0', name: 'Âm nhạc', subjectCode: 'AM_NHAC' },
  { code: 'DG_CX0', name: 'Cảm xúc xã hội', subjectCode: 'GCX' },
  { code: 'DG_EN0', name: 'ESL', subjectCode: 'ESL' },
  { code: 'DG_TC0', name: 'Giáo dục thể chất', subjectCode: 'GTC' },
  { code: 'DG_IT0', name: 'ICT', subjectCode: 'TIN_HOC' },
  { code: 'DG_MA0', name: 'Maths', subjectCode: 'MAT' },
  { code: 'DG_MT0', name: 'Mĩ thuật', subjectCode: 'MI_THUAT' },
  { code: 'DG_SC0', name: 'Science', subjectCode: 'SCI' },
  { code: 'DG_ST0', name: 'STEM', subjectCode: 'STE' },
  { code: 'DG_TV0', name: 'Tiếng việt', subjectCode: 'TVI' },
  { code: 'DG_TO0', name: 'Toán', subjectCode: 'TOA' },
  { code: 'DG_GS0', name: 'Global Studies', subjectCode: 'GLS' },
  { code: 'DG_HO0', name: 'Hóa học', subjectCode: 'HHO' },
  { code: 'DG_HN0', name: 'Hướng nghiệp', subjectCode: 'HNG' },
  { code: 'DG_IE0', name: 'IELTS Preparation Skills', subjectCode: 'IEL' },
  { code: 'DG_LS0', name: 'Lịch sử', subjectCode: 'LICH_SU' },
  { code: 'DG_LI0', name: 'Vật lí', subjectCode: 'VLI' },
  { code: 'DG_IL0', name: 'Independent Learning', subjectCode: 'IL' },
  { code: 'DG_NV0', name: 'Ngữ văn', subjectCode: 'NVA' },
  { code: 'DG_IB0', name: 'TA-BGD', subjectCode: 'TA' },
  { code: 'DG_BU0', name: 'Business Studies', subjectCode: 'BSS' },
  { code: 'DG_SI0', name: 'Sinh học', subjectCode: 'SHO' },
  { code: 'DG_DL0', name: 'Địa lí', subjectCode: 'DLI' },
  { code: 'DG_LD0', name: 'Lịch sử - Địa lí', subjectCode: 'LSU' },
  { code: 'DG_KH0', name: 'Khoa học tự nhiên', subjectCode: 'KHT' },
  { code: 'DG_KH1', name: 'Khoa học tự nhiên (Lý)', subjectCode: 'KHT' },
  { code: 'DG_KH2', name: 'Khoa học tự nhiên (Hóa)', subjectCode: 'KHT' },
  { code: 'DG_KH3', name: 'Khoa học tự nhiên (Sinh)', subjectCode: 'KHT' },
];

async function main() {
  console.log('--- 1. KIỂM TRA VÀ TẠO MÔN INDEPENDENT LEARNING (IL) NẾU CHƯA CÓ ---');
  let ilRes = await client.execute("SELECT id FROM Subject WHERE subjectCode = 'IL'");
  if (ilRes.rows.length === 0) {
    const newId = 'subj_il_' + Date.now();
    await client.execute(`
      INSERT INTO Subject (id, subjectCode, subjectName, category, level, evaluationType, studyPrograms, status, createdAt, updatedAt)
      VALUES ('${newId}', 'IL', 'Independent Learning', 'BILINGUAL', 'ALL', 'GRADE', 'Hệ S, Hệ Song Bằng, Hệ S Quốc tế', 'ACTIVE', datetime('now'), datetime('now'))
    `);
    console.log('✅ Đã tạo mới môn [IL] "Independent Learning" thuộc Danh mục BILINGUAL.');
  } else {
    console.log('Môn [IL] đã tồn tại.');
  }

  console.log('\n--- 2. LẤY MAPPING ID MÔN HỌC CHÍNH ---');
  const subs = await client.execute('SELECT id, subjectCode, subjectName FROM Subject');
  const subMap = new Map();
  subs.rows.forEach(s => subMap.set(s.subjectCode, s));

  console.log('\n--- 3. ĐĂNG KÝ HỆ THỐNG MÃ ĐBCL (DG_) VÀ TÊN MÔN VÀO SUBJECTALIAS ---');
  let registeredCount = 0;

  for (const item of DG_LIST) {
    const target = subMap.get(item.subjectCode);
    if (!target) {
      console.warn(`⚠️ Không tìm thấy môn [${item.subjectCode}]`);
      continue;
    }

    // Register 1: Mã môn ĐBCL (ví dụ: 'DG_AN0')
    const key1 = normalizeKey(item.code);
    try {
      await client.execute(`
        INSERT INTO SubjectAlias (id, subjectId, aliasPattern, normalizedKey, createdAt)
        VALUES ('alias_' || lower('${key1}'), '${target.id}', '${item.code}', '${key1}', datetime('now'))
        ON CONFLICT(aliasPattern) DO UPDATE SET subjectId = '${target.id}', normalizedKey = '${key1}'
      `);
      registeredCount++;
    } catch (e) {
      console.warn(`Lỗi khi tạo alias cho mã ${item.code}:`, e.message);
    }

    // Register 2: Tên môn ĐBCL (ví dụ: 'TA-BGD', 'Lịch sử - Địa lí'...)
    const key2 = normalizeKey(item.name);
    try {
      await client.execute(`
        INSERT INTO SubjectAlias (id, subjectId, aliasPattern, normalizedKey, createdAt)
        VALUES ('alias_' || lower('${key2}'), '${target.id}', '${item.name}', '${key2}', datetime('now'))
        ON CONFLICT(aliasPattern) DO UPDATE SET subjectId = '${target.id}', normalizedKey = '${key2}'
      `);
      registeredCount++;
    } catch (e) {
      // Bỏ qua nếu trùng pattern đã có
    }

    console.log(`✅ [${item.code}] & "${item.name}" -> Môn chính [${target.subjectCode}] "${target.subjectName}" (id: ${target.id})`);
  }

  console.log(`\n🎉 Hoàn thành! Đã đăng ký thành công ${registeredCount} alias vào hệ thống.`);
}

main().catch(console.error);
