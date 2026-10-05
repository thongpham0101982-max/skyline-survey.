const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = (process.env.TURSO_DATABASE_URL || '').trim().replace(/^libsql:\/\//, 'https://');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const client = createClient({ url, authToken });

const DG_LIST = [
  { code: 'DG_AN0', name: 'Âm nhạc', suggestedSubjectCode: 'AM_NHAC' },
  { code: 'DG_CX0', name: 'Cảm xúc xã hội', suggestedSubjectCode: 'GCX' },
  { code: 'DG_EN0', name: 'ESL', suggestedSubjectCode: 'ESL' },
  { code: 'DG_TC0', name: 'Giáo dục thể chất', suggestedSubjectCode: 'GTC' },
  { code: 'DG_IT0', name: 'ICT', suggestedSubjectCode: 'TIN_HOC' },
  { code: 'DG_MA0', name: 'Maths', suggestedSubjectCode: 'MAT' },
  { code: 'DG_MT0', name: 'Mĩ thuật', suggestedSubjectCode: 'MI_THUAT' },
  { code: 'DG_SC0', name: 'Science', suggestedSubjectCode: 'SCI' },
  { code: 'DG_ST0', name: 'STEM', suggestedSubjectCode: 'STE' },
  { code: 'DG_TV0', name: 'Tiếng việt', suggestedSubjectCode: 'TVI' },
  { code: 'DG_TO0', name: 'Toán', suggestedSubjectCode: 'TOA' },
  { code: 'DG_GS0', name: 'Global Studies', suggestedSubjectCode: 'GLS' },
  { code: 'DG_HO0', name: 'Hóa học', suggestedSubjectCode: 'HHO' },
  { code: 'DG_HN0', name: 'Hướng nghiệp', suggestedSubjectCode: 'HNG' },
  { code: 'DG_IE0', name: 'IELTS Preparation Skills', suggestedSubjectCode: 'IEL' },
  { code: 'DG_LS0', name: 'Lịch sử', suggestedSubjectCode: 'LICH_SU' },
  { code: 'DG_LI0', name: 'Vật lí', suggestedSubjectCode: 'VLI' },
  { code: 'DG_IL0', name: 'Independent Learning', suggestedSubjectCode: 'IL' }, // cần tạo mới nếu chưa có
  { code: 'DG_NV0', name: 'Ngữ văn', suggestedSubjectCode: 'NVA' },
  { code: 'DG_IB0', name: 'TA-BGD', suggestedSubjectCode: 'TA' }, // Tiếng Anh chuẩn Bộ GD&ĐT
  { code: 'DG_BU0', name: 'Business Studies', suggestedSubjectCode: 'BSS' },
  { code: 'DG_SI0', name: 'Sinh học', suggestedSubjectCode: 'SHO' },
  { code: 'DG_DL0', name: 'Địa lí', suggestedSubjectCode: 'DLI' },
  { code: 'DG_LD0', name: 'Lịch sử - Địa lí', suggestedSubjectCode: 'LSU' },
  { code: 'DG_KH0', name: 'Khoa học tự nhiên', suggestedSubjectCode: 'KHT' },
  { code: 'DG_KH2', name: 'Khoa học tự nhiên (Hóa)', suggestedSubjectCode: 'KHT' },
  { code: 'DG_KH1', name: 'Khoa học tự nhiên (Lý)', suggestedSubjectCode: 'KHT' },
  { code: 'DG_KH3', name: 'Khoa học tự nhiên (Sinh)', suggestedSubjectCode: 'KHT' },
];

async function main() {
  console.log('=== KIỂM TRA MAPPING 28 MÃ DG_ VỚI SUBJECT TRONG DB ===\n');
  const subs = await client.execute('SELECT id, subjectCode, subjectName, category FROM Subject');
  const subMap = new Map();
  subs.rows.forEach(s => subMap.set(s.subjectCode, s));

  for (const item of DG_LIST) {
    const target = subMap.get(item.suggestedSubjectCode);
    if (target) {
      console.log(`✅ [${item.code}] "${item.name}" -> [${target.subjectCode}] "${target.subjectName}" (${target.category}) [id: ${target.id}]`);
    } else {
      console.log(`❌ [${item.code}] "${item.name}" -> Chưa có môn [${item.suggestedSubjectCode}] trong DB!`);
    }
  }
}

main().catch(console.error);
