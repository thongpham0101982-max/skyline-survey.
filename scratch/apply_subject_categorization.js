const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const url = (process.env.TURSO_DATABASE_URL || '').trim().replace(/^libsql:\/\//, 'https://');
const authToken = (process.env.TURSO_AUTH_TOKEN || '').trim();

const client = createClient({ url, authToken });

// Định nghĩa phân loại 4 nhóm
const CATEGORY_MAPPING = {
  // 1. Môn học KSĐV (Khảo sát đầu vào)
  KSDV: [
    'TAv',   // Tiếng Anh (viết)
    'TAvd',  // Tiếng Anh (vấn đáp)
  ],

  // 2. Môn học theo Moet (Chương trình chuẩn Bộ GD&ĐT)
  MOET: [
    'TOA',          // Toán học
    'TVI',          // Tiếng Việt
    'NVA',          // Ngữ Văn
    'TA',           // Tiếng Anh
    'TAV',          // Tiếng Anh (File KQHT)
    'LICH_SU',      // Lịch sử
    'LSU',          // Lịch sử & GDĐP
    'DLI',          // Địa lí
    'KHT',          // Khoa học tự nhiên
    'VLI',          // Vật lí
    'HHO',          // Hóa học
    'SHO',          // Sinh học
    'GTC',          // Giáo dục thể chất
    'GCD',          // Giáo dục công dân
    'GKP',          // Giáo dục Kinh tế và Pháp luật
    'GDKTPL',       // GDKT&PL
    'GDQPAN',       // GDQP&AN
    'TIN_HOC',      // Tin học / ICT
    'ICT',          // ICT-AI
    'ANA',          // Môn Âm Nhạc
    'AM_NHAC',      // Âm nhạc
    'MTU',          // Mĩ Thuật
    'MI_THUAT',     // Mĩ thuật
    'HDTNHN',       // HĐTN&HN
    'HTT',          // HĐTT- GDCĐ
    'NDGDCDP',      // NDGDCĐP
  ],

  // 3. Môn học Sky-Line (Chương trình đặc thù Sky-Line)
  SKL: [
    'TLY',          // Tâm lý
    'HNG',          // Hướng nghiệp
    'TND',          // Trải nghiệm - Dự án
    'CD_CD',        // Chủ đề/Chuyên đề
    'GCX',          // Giáo dục Cảm xúc xã hội
    'CD_CXXH',      // Cảm xúc xã hội (SEL)
    'STE',          // STEM / Công nghệ
    'STEM',         // STEM
    'TNH',          // Tiếng Nhật
  ],

  // 4. Môn học Song ngữ (Chương trình Song ngữ / Quốc tế)
  BILINGUAL: [
    'ESL',              // ESL
    'ESA',              // ESL/A.E
    'MAT',              // Maths
    'MATHS_CAMBRIDGE',  // Maths (Cambridge)
    'SCI',              // Science
    'GLS',              // Global Studies
    'ACE',              // Academic English
    'Academic English', // Academic English code
    'ACR',              // Academic research/Business Studies
    'BSS',              // Business Studies
    'ELA',              // ELA
    'IEL',              // IELTS Preparation Skill
    'SAT',              // SAT
  ]
};

async function main() {
  console.log('--- BẮT ĐẦU CẬP NHẬT PHÂN CHIA DANH MỤC MÔN HỌC ---');
  
  for (const [cat, codes] of Object.entries(CATEGORY_MAPPING)) {
    console.log(`\nCập nhật danh mục: ${cat} (${codes.length} môn)`);
    for (const code of codes) {
      const res = await client.execute(`
        UPDATE Subject 
        SET category = '${cat}' 
        WHERE subjectCode = '${code}'
      `);
      if (res.rowsAffected > 0) {
        console.log(`  ✅ [${code}] -> ${cat}`);
      } else {
        console.log(`  ⚠️ Không tìm thấy [${code}]`);
      }
    }
  }

  console.log('\n--- TỔNG KẾT SAU KHI CẬP NHẬT ---');
  const summary = await client.execute(`
    SELECT category, COUNT(*) as count 
    FROM Subject 
    GROUP BY category 
    ORDER BY count DESC
  `);
  console.table(summary.rows);

  const detail = await client.execute(`
    SELECT category, subjectCode, subjectName, level 
    FROM Subject 
    ORDER BY category, subjectCode
  `);
  console.table(detail.rows);
}

main().catch(console.error);
