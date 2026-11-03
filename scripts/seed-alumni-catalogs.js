const { createClient } = require('@libsql/client');
require('dotenv').config();
const path = require('path');

const localDbPath = path.resolve(process.cwd(), 'local.db').replace(/\\/g, '/');
const client = createClient({ url: `file:${localDbPath}` });

const CATALOG_ITEMS = [
  // 1. Quoc gia (COUNTRY)
  { type: 'COUNTRY', code: 'VN', name: 'Việt Nam', nameEn: 'Vietnam', parentCode: null },
  { type: 'COUNTRY', code: 'US', name: 'Hoa Kỳ', nameEn: 'United States', parentCode: null },
  { type: 'COUNTRY', code: 'AU', name: 'Úc', nameEn: 'Australia', parentCode: null },
  { type: 'COUNTRY', code: 'UK', name: 'Vương quốc Anh', nameEn: 'United Kingdom', parentCode: null },
  { type: 'COUNTRY', code: 'CA', name: 'Canada', nameEn: 'Canada', parentCode: null },
  { type: 'COUNTRY', code: 'SG', name: 'Singapore', nameEn: 'Singapore', parentCode: null },
  { type: 'COUNTRY', code: 'JP', name: 'Nhật Bản', nameEn: 'Japan', parentCode: null },
  { type: 'COUNTRY', code: 'KR', name: 'Hàn Quốc', nameEn: 'South Korea', parentCode: null },
  { type: 'COUNTRY', code: 'DE', name: 'Đức', nameEn: 'Germany', parentCode: null },
  { type: 'COUNTRY', code: 'FR', name: 'Pháp', nameEn: 'France', parentCode: null },
  { type: 'COUNTRY', code: 'NL', name: 'Hà Lan', nameEn: 'Netherlands', parentCode: null },
  { type: 'COUNTRY', code: 'NZ', name: 'New Zealand', nameEn: 'New Zealand', parentCode: null },
  { type: 'COUNTRY', code: 'CH', name: 'Thụy Sĩ', nameEn: 'Switzerland', parentCode: null },

  // 2. Bac hoc (DEGREE_LEVEL)
  { type: 'DEGREE_LEVEL', code: 'BACHELOR', name: 'Cử nhân / Kỹ sư', nameEn: 'Bachelor', parentCode: null },
  { type: 'DEGREE_LEVEL', code: 'MASTER', name: 'Thạc sĩ', nameEn: 'Master', parentCode: null },
  { type: 'DEGREE_LEVEL', code: 'DOCTORATE', name: 'Tiến sĩ', nameEn: 'Doctorate / Ph.D', parentCode: null },
  { type: 'DEGREE_LEVEL', code: 'ASSOCIATE', name: 'Cao đẳng', nameEn: 'Associate Degree', parentCode: null },
  { type: 'DEGREE_LEVEL', code: 'CERTIFICATE', name: 'Chứng chỉ nghề nghiệp / Du học ngắn hạn', nameEn: 'Certificate', parentCode: null },

  // 3. Truong Dai hoc tieu bieu (UNIVERSITY)
  { type: 'UNIVERSITY', code: 'DHQG_HN', name: 'Đại học Quốc gia Hà Nội', nameEn: 'Vietnam National University, Hanoi', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DHQG_HCM', name: 'Đại học Quốc gia TP.HCM', nameEn: 'Vietnam National University, HCMC', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_BK_HN', name: 'Đại học Bách Khoa Hà Nội', nameEn: 'Hanoi University of Science and Technology', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_BK_DN', name: 'Trường Đại học Bách Khoa – ĐH Đà Nẵng', nameEn: 'Danang University of Science and Technology', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_KT_DN', name: 'Trường Đại học Kinh tế – ĐH Đà Nẵng', nameEn: 'University of Economics - The University of Danang', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_NN_DN', name: 'Trường Đại học Ngoại ngữ – ĐH Đà Nẵng', nameEn: 'University of Foreign Language Studies - UDN', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_DUY_TAN', name: 'Đại học Duy Tân (Đà Nẵng)', nameEn: 'Duy Tan University', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_FPT', name: 'Đại học FPT', nameEn: 'FPT University', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_RMIT_VN', name: 'Đại học RMIT Việt Nam', nameEn: 'RMIT University Vietnam', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_VINUNI', name: 'Đại học VinUni', nameEn: 'VinUniversity', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_NEU', name: 'Đại học Kinh tế Quốc dân', nameEn: 'National Economics University', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_FTU', name: 'Đại học Ngoại thương', nameEn: 'Foreign Trade University', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_UEH', name: 'Đại học Kinh tế TP.HCM', nameEn: 'University of Economics HCMC', parentCode: 'VN' },
  { type: 'UNIVERSITY', code: 'DH_MELBOURNE', name: 'The University of Melbourne', nameEn: 'University of Melbourne', parentCode: 'AU' },
  { type: 'UNIVERSITY', code: 'DH_MONASH', name: 'Monash University', nameEn: 'Monash University', parentCode: 'AU' },
  { type: 'UNIVERSITY', code: 'DH_SYDNEY', name: 'The University of Sydney', nameEn: 'The University of Sydney', parentCode: 'AU' },
  { type: 'UNIVERSITY', code: 'DH_TORONTO', name: 'University of Toronto', nameEn: 'University of Toronto', parentCode: 'CA' },
  { type: 'UNIVERSITY', code: 'DH_NUS', name: 'National University of Singapore', nameEn: 'NUS', parentCode: 'SG' },

  // 4. Nhom nganh & Nganh hoc (MAJOR_GROUP & MAJOR)
  { type: 'MAJOR_GROUP', code: 'GRP_IT', name: 'Công nghệ thông tin & Trí tuệ nhân tạo', nameEn: 'Information Technology & AI', parentCode: null },
  { type: 'MAJOR', code: 'MAJ_SE', name: 'Kỹ thuật phần mềm', nameEn: 'Software Engineering', parentCode: 'GRP_IT' },
  { type: 'MAJOR', code: 'MAJ_DS_AI', name: 'Khoa học dữ liệu & Trí tuệ nhân tạo (AI)', nameEn: 'Data Science & Artificial Intelligence', parentCode: 'GRP_IT' },
  { type: 'MAJOR', code: 'MAJ_CYBER', name: 'An toàn thông tin & An ninh mạng', nameEn: 'Cybersecurity', parentCode: 'GRP_IT' },

  { type: 'MAJOR_GROUP', code: 'GRP_BIZ', name: 'Kinh tế, Quản trị & Tài chính', nameEn: 'Business & Finance', parentCode: null },
  { type: 'MAJOR', code: 'MAJ_IB', name: 'Kinh doanh quốc tế', nameEn: 'International Business', parentCode: 'GRP_BIZ' },
  { type: 'MAJOR', code: 'MAJ_FIN_BANK', name: 'Tài chính - Ngân hàng', nameEn: 'Finance & Banking', parentCode: 'GRP_BIZ' },
  { type: 'MAJOR', code: 'MAJ_MARKETING', name: 'Marketing & Truyền thông số', nameEn: 'Digital Marketing', parentCode: 'GRP_BIZ' },
  { type: 'MAJOR', code: 'MAJ_LOGISTICS', name: 'Logistics & Quản lý chuỗi cung ứng', nameEn: 'Logistics & Supply Chain', parentCode: 'GRP_BIZ' },

  { type: 'MAJOR_GROUP', code: 'GRP_ENG', name: 'Kỹ thuật & Công nghệ', nameEn: 'Engineering', parentCode: null },
  { type: 'MAJOR', code: 'MAJ_MECHATRONICS', name: 'Cơ điện tử & Robotics', nameEn: 'Mechatronics & Robotics', parentCode: 'GRP_ENG' },
  { type: 'MAJOR', code: 'MAJ_CIVIL', name: 'Kỹ thuật xây dựng & Kiến trúc', nameEn: 'Architecture & Civil Engineering', parentCode: 'GRP_ENG' },

  { type: 'MAJOR_GROUP', code: 'GRP_MED', name: 'Y - Dược & Khoa học sức khỏe', nameEn: 'Health Sciences', parentCode: null },
  { type: 'MAJOR', code: 'MAJ_GENERAL_MED', name: 'Y đa khoa & Răng hàm mặt', nameEn: 'General Medicine & Dentistry', parentCode: 'GRP_MED' },
  { type: 'MAJOR', code: 'MAJ_PHARMACY', name: 'Dược học', nameEn: 'Pharmacy', parentCode: 'GRP_MED' },

  { type: 'MAJOR_GROUP', code: 'GRP_ART_SOC', name: 'Khoa học Xã hội, Ngôn ngữ & Thiết kế', nameEn: 'Social Sciences & Design', parentCode: null },
  { type: 'MAJOR', code: 'MAJ_GRAPHIC_DESIGN', name: 'Thiết kế đồ họa & Đa phương tiện', nameEn: 'Graphic & Multimedia Design', parentCode: 'GRP_ART_SOC' },
  { type: 'MAJOR', code: 'MAJ_LANGUAGES', name: 'Ngôn ngữ Anh / Quốc tế học', nameEn: 'English Language & International Studies', parentCode: 'GRP_ART_SOC' },

  // 5. Linh vuc nghe nghiep (INDUSTRY)
  { type: 'INDUSTRY', code: 'IND_TECH', name: 'Công nghệ thông tin & Viễn thông', nameEn: 'IT & Telecommunications', parentCode: null },
  { type: 'INDUSTRY', code: 'IND_FIN', name: 'Ngân hàng, Tài chính & Đầu tư', nameEn: 'Banking & Financial Services', parentCode: null },
  { type: 'INDUSTRY', code: 'IND_EDU', name: 'Giáo dục & Nghiên cứu', nameEn: 'Education & Research', parentCode: null },
  { type: 'INDUSTRY', code: 'IND_MED', name: 'Y tế, Dược phẩm & Chăm sóc sức khỏe', nameEn: 'Healthcare & Pharma', parentCode: null },
  { type: 'INDUSTRY', code: 'IND_FMCG', name: 'Thương mại, Bán lẻ & Hàng tiêu dùng', nameEn: 'Retail & FMCG', parentCode: null },
  { type: 'INDUSTRY', code: 'IND_HOSPITALITY', name: 'Du lịch, Khách sạn & Ẩm thực', nameEn: 'Hospitality & Tourism', parentCode: null },
  { type: 'INDUSTRY', code: 'IND_CONSTRUCT', name: 'Xây dựng, Kiến trúc & Bất động sản', nameEn: 'Real Estate & Construction', parentCode: null },
  { type: 'INDUSTRY', code: 'IND_GOV', name: 'Cơ quan Nhà nước & Tổ chức Phi chính phủ (NGO)', nameEn: 'Government & NGO', parentCode: null }
];

async function seed() {
  console.log('Seeding standard catalogs for Alumni module...');
  let inserted = 0;
  for (const item of CATALOG_ITEMS) {
    const id = 'cat_' + item.type.toLowerCase() + '_' + item.code.toLowerCase();
    await client.execute({
      sql: `INSERT INTO AlumniCatalog (id, type, code, name, nameEn, parentCode, isVerified, usageCount)
            VALUES (?, ?, ?, ?, ?, ?, 1, 0)
            ON CONFLICT(type, code) DO UPDATE SET
              name = excluded.name,
              nameEn = excluded.nameEn,
              parentCode = excluded.parentCode`,
      args: [id, item.type, item.code, item.name, item.nameEn, item.parentCode]
    });
    inserted++;
  }
  console.log(`✓ Seeded ${inserted} standard catalog items successfully!`);
}

seed().catch(console.error);
