const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@libsql/client");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

// Define the exactly 4 areas
const newAreas = [
  {
    code: 'THE_CHAT',
    name: 'Thể chất',
    description: 'Đánh giá sự phát triển vận động thô, vận động tinh và sức khỏe thể chất của trẻ',
    color: '#10b981',
    sortOrder: 0
  },
  {
    code: 'NHAN_THUC',
    name: 'Nhận thức',
    description: 'Đánh giá khả năng tư duy, giải quyết vấn đề và khám phá thế giới xung quanh',
    color: '#6366f1',
    sortOrder: 1
  },
  {
    code: 'NGON_NGU',
    name: 'Ngôn ngữ',
    description: 'Đánh giá khả năng nghe, nói, giao tiếp và tiền đọc viết',
    color: '#f59e0b',
    sortOrder: 2
  },
  {
    code: 'TINH_CAM_XH_TM',
    name: 'TÌNH CẢM - KỸ NĂNG XÃ HỘI VÀ THẨM MĨ',
    description: 'Đánh giá sự phát triển cảm xúc, kỹ năng xã hội, hành vi ứng xử và cảm thụ thẩm mỹ',
    color: '#ec4899',
    sortOrder: 3
  }
];

// All criteria for all age groups mapped to these 4 areas
const newCriteria = [
  // ================= THE_CHAT =================
  // 18-24 tháng (Exact 4 criteria)
  { areaCode: "THE_CHAT", code: "TC_1824_01", name: "Sức khỏe - Chiều cao (cm)", ageGroup: "18 đến 24 tháng", sortOrder: 0 },
  { areaCode: "THE_CHAT", code: "TC_1824_02", name: "Sức khỏe - Cân nặng (Kg)", ageGroup: "18 đến 24 tháng", sortOrder: 1 },
  { areaCode: "THE_CHAT", code: "TC_1824_03", name: "Vận động tinh: Tháo lắp, lồng được 3-4 hộp tròn hoặc xếp chồng được 2 - 3 hình khối.", ageGroup: "18 đến 24 tháng", sortOrder: 2 },
  { areaCode: "THE_CHAT", code: "TC_1824_04", name: "Vận động thô: Đi chạy nhảy tốt.", ageGroup: "18 đến 24 tháng", sortOrder: 3 },
  // 24–36 tháng
  { areaCode: 'THE_CHAT', code: 'TC_2436_01', name: 'Chạy nhẹ nhàng, không ngã', ageGroup: '24 đến 36 tháng', sortOrder: 0 },
  { areaCode: 'THE_CHAT', code: 'TC_2436_02', name: 'Nhảy bật tại chỗ bằng 2 chân', ageGroup: '24 đến 36 tháng', sortOrder: 1 },
  { areaCode: 'THE_CHAT', code: 'TC_2436_03', name: 'Xâu hạt vào dây hoặc xếp tháp', ageGroup: '24 đến 36 tháng', sortOrder: 2 },
  // Mẫu giáo bé
  { areaCode: 'THE_CHAT', code: 'TC_MGB_01', name: 'Đi thăng bằng trên vạch kẻ', ageGroup: 'Mẫu giáo bé', sortOrder: 0 },
  { areaCode: 'THE_CHAT', code: 'TC_MGB_02', name: 'Bắt bóng bằng 2 tay từ khoảng cách gần', ageGroup: 'Mẫu giáo bé', sortOrder: 1 },
  { areaCode: 'THE_CHAT', code: 'TC_MGB_03', name: 'Tự xúc ăn gọn gàng bằng thìa', ageGroup: 'Mẫu giáo bé', sortOrder: 2 },
  // Mẫu giáo nhỡ
  { areaCode: 'THE_CHAT', code: 'TC_MGN_01', name: 'Nhảy lò cò được 4–5 bước', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 0 },
  { areaCode: 'THE_CHAT', code: 'TC_MGN_02', name: 'Cắt theo đường thẳng bằng kéo', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 1 },
  { areaCode: 'THE_CHAT', code: 'TC_MGN_03', name: 'Tự mặc quần áo, cài cúc', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 2 },
  // Mẫu giáo lớn
  { areaCode: 'THE_CHAT', code: 'TC_MGL_01', name: 'Chạy nhanh 15m trong 5 giây', ageGroup: 'Mẫu giáo lớn', sortOrder: 0 },
  { areaCode: 'THE_CHAT', code: 'TC_MGL_02', name: 'Viết tên bản thân bằng chữ in hoa', ageGroup: 'Mẫu giáo lớn', sortOrder: 1 },
  { areaCode: 'THE_CHAT', code: 'TC_MGL_03', name: 'Nhảy dây đơn giản', ageGroup: 'Mẫu giáo lớn', sortOrder: 2 },

  // ================= NHAN_THUC =================
  // 18-24 tháng (Exact 4 criteria)
  { areaCode: "NHAN_THUC", code: "NT_1824_01", name: "Chỉ và nói được tên đồ dùng, đồ chơi, con vật, hoa quả quen thuộc.", ageGroup: "18 đến 24 tháng", sortOrder: 0 },
  { areaCode: "NHAN_THUC", code: "NT_1824_02", name: "Biết sử dụng một số đồ dùng, đồ chơi.", ageGroup: "18 đến 24 tháng", sortOrder: 1 },
  { areaCode: "NHAN_THUC", code: "NT_1824_03", name: "Biết tên bản thân và một số người thân trong gia đình.", ageGroup: "18 đến 24 tháng", sortOrder: 2 },
  { areaCode: "NHAN_THUC", code: "NT_1824_04", name: "Chỉ và nói được tên một số bộ phận trên cơ thể của bản thân: mắt, mũi, chân, tay,...", ageGroup: "18 đến 24 tháng", sortOrder: 3 },
  // 24–36 tháng
  { areaCode: 'NHAN_THUC', code: 'NT_2436_01', name: 'Phân biệt to – nhỏ, nhiều – ít', ageGroup: '24 đến 36 tháng', sortOrder: 0 },
  { areaCode: 'NHAN_THUC', code: 'NT_2436_02', name: 'Ghép tranh 4–6 mảnh', ageGroup: '24 đến 36 tháng', sortOrder: 1 },
  // Mẫu giáo bé
  { areaCode: 'NHAN_THUC', code: 'NT_MGB_01', name: 'Nhận biết 4 màu cơ bản', ageGroup: 'Mẫu giáo bé', sortOrder: 0 },
  { areaCode: 'NHAN_THUC', code: 'NT_MGB_02', name: 'Đếm từ 1 đến 5', ageGroup: 'Mẫu giáo bé', sortOrder: 1 },
  // Mẫu giáo nhỡ
  { areaCode: 'NHAN_THUC', code: 'NT_MGN_01', name: 'So sánh cao – thấp, dài – ngắn', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 0 },
  { areaCode: 'NHAN_THUC', code: 'NT_MGN_02', name: 'Phân loại đồ vật theo 2 dấu hiệu', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 1 },
  // Mẫu giáo lớn
  { areaCode: 'NHAN_THUC', code: 'NT_MGL_01', name: 'Đếm, nhận biết số từ 1 đến 10', ageGroup: 'Mẫu giáo lớn', sortOrder: 0 },
  { areaCode: 'NHAN_THUC', code: 'NT_MGL_02', name: 'Giải bài toán cộng trừ trong phạm vi 5', ageGroup: 'Mẫu giáo lớn', sortOrder: 1 },

  // ================= NGON_NGU =================
  // 18-24 tháng (Exact 5 criteria)
  { areaCode: "NGON_NGU", code: "NN_1824_01", name: "Hiểu và làm theo chỉ dẫn đơn giản của người lớn.", ageGroup: "18 đến 24 tháng", sortOrder: 0 },
  { areaCode: "NGON_NGU", code: "NN_1824_02", name: "Trả lời được câu hỏi đơn giản 'Ai?'; 'Cái gì?'; 'Thế nào?'.", ageGroup: "18 đến 24 tháng", sortOrder: 1 },
  { areaCode: "NGON_NGU", code: "NN_1824_03", name: "Phát âm rõ tiếng.", ageGroup: "18 đến 24 tháng", sortOrder: 2 },
  { areaCode: "NGON_NGU", code: "NN_1824_04", name: "Nói được câu 3 từ.", ageGroup: "18 đến 24 tháng", sortOrder: 3 },
  { areaCode: "NGON_NGU", code: "NN_1824_05", name: "Nhắc lại được câu 3-4 từ.", ageGroup: "18 đến 24 tháng", sortOrder: 4 },
  // 24–36 tháng
  { areaCode: 'NGON_NGU', code: 'NN_2436_01', name: 'Nói câu 2–3 từ ghép', ageGroup: '24 đến 36 tháng', sortOrder: 0 },
  { areaCode: 'NGON_NGU', code: 'NN_2436_02', name: 'Gọi tên các bộ phận cơ thể', ageGroup: '24 đến 36 tháng', sortOrder: 1 },
  // Mẫu giáo bé
  { areaCode: 'NGON_NGU', code: 'NN_MGB_01', name: 'Kể lại sự việc đơn giản theo trình tự', ageGroup: 'Mẫu giáo bé', sortOrder: 0 },
  { areaCode: 'NGON_NGU', code: 'NN_MGB_02', name: 'Trả lời câu hỏi: Ai? Cái gì? Ở đâu?', ageGroup: 'Mẫu giáo bé', sortOrder: 1 },
  // Mẫu giáo nhỡ
  { areaCode: 'NGON_NGU', code: 'NN_MGN_01', name: 'Kể lại truyện ngắn đã nghe', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 0 },
  { areaCode: 'NGON_NGU', code: 'NN_MGN_02', name: 'Nhận biết một số chữ cái', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 1 },
  // Mẫu giáo lớn
  { areaCode: 'NGON_NGU', code: 'NN_MGL_01', name: 'Nhận biết 29 chữ cái tiếng Việt', ageGroup: 'Mẫu giáo lớn', sortOrder: 0 },
  { areaCode: 'NGON_NGU', code: 'NN_MGL_02', name: 'Đọc thơ, kể chuyện diễn cảm', ageGroup: 'Mẫu giáo lớn', sortOrder: 1 },

  // ================= TINH_CAM_XH_TM =================
  // 18-24 tháng (Exact 3 criteria)
  { areaCode: "TINH_CAM_XH_TM", code: "TM_1824_01", name: "Thích nghe hát, nghe nhạc.", ageGroup: "18 đến 24 tháng", sortOrder: 0 },
  { areaCode: "TINH_CAM_XH_TM", code: "TM_1824_02", name: "Thích xem tranh ảnh có màu sắc.", ageGroup: "18 đến 24 tháng", sortOrder: 1 },
  { areaCode: "TINH_CAM_XH_TM", code: "TC_XH_1824_01", name: "Cảm nhận và biểu lộ cảm xúc: vui, sợ hãi qua nét mặt, cử chỉ.", ageGroup: "18 đến 24 tháng", sortOrder: 2 },
  // 24–36 tháng
  { areaCode: 'TINH_CAM_XH_TM', code: 'TC_XH_2436_01', name: 'Biết chờ đợi lượt chơi', ageGroup: '24 đến 36 tháng', sortOrder: 0 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TC_XH_2436_02', name: 'Tự ăn, tự uống khi được nhắc', ageGroup: '24 đến 36 tháng', sortOrder: 1 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TM_2436_01', name: 'Hát theo bài hát quen thuộc', ageGroup: '24 đến 36 tháng', sortOrder: 2 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TM_2436_02', name: 'Nặn đất sét thành hình tròn, dài', ageGroup: '24 đến 36 tháng', sortOrder: 3 },
  // Mẫu giáo bé
  { areaCode: 'TINH_CAM_XH_TM', code: 'TC_XH_MGB_01', name: 'Chơi hợp tác với bạn trong nhóm nhỏ', ageGroup: 'Mẫu giáo bé', sortOrder: 0 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TC_XH_MGB_02', name: 'Biết nói cảm ơn, xin lỗi khi được nhắc', ageGroup: 'Mẫu giáo bé', sortOrder: 1 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TM_MGB_01', name: 'Vẽ hình tròn, hình vuông', ageGroup: 'Mẫu giáo bé', sortOrder: 2 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TM_MGB_02', name: 'Hát đúng giai điệu bài hát đơn giản', ageGroup: 'Mẫu giáo bé', sortOrder: 3 },
  // Mẫu giáo nhỡ
  { areaCode: 'TINH_CAM_XH_TM', code: 'TC_XH_MGN_01', name: 'Tuân thủ nội quy lớp học', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 0 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TC_XH_MGN_02', name: 'Chia sẻ đồ chơi với bạn', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 1 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TM_MGN_01', name: 'Tô màu không lem ra ngoài', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 2 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TM_MGN_02', name: 'Múa vận động nhịp nhàng theo nhạc', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 3 },
  // Mẫu giáo lớn
  { areaCode: 'TINH_CAM_XH_TM', code: 'TC_XH_MGL_01', name: 'Tự giác trong các hoạt động hàng ngày', ageGroup: 'Mẫu giáo lớn', sortOrder: 0 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TC_XH_MGL_02', name: 'Giải quyết xung đột bằng lời nói', ageGroup: 'Mẫu giáo lớn', sortOrder: 1 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TM_MGL_01', name: 'Vẽ sáng tạo theo chủ đề', ageGroup: 'Mẫu giáo lớn', sortOrder: 2 },
  { areaCode: 'TINH_CAM_XH_TM', code: 'TM_MGL_02', name: 'Biểu diễn trước lớp tự tin', ageGroup: 'Mẫu giáo lớn', sortOrder: 3 }
];

async function updateDb(prisma, name) {
  console.log(`\n--- Updating ${name} database ---`);

  // 1. Delete all old criteria entirely to make sure there are no orphans
  console.log("  Clearing all old criteria...");
  await prisma.preschoolDevCriteria.deleteMany({});
  
  // 2. Delete all old areas entirely
  console.log("  Clearing all old areas...");
  await prisma.preschoolDevArea.deleteMany({});

  // 3. Insert the exactly 4 new areas
  console.log("  Seeding 4 main areas...");
  const areaMap = {};
  for (const a of newAreas) {
    const created = await prisma.preschoolDevArea.create({
      data: a
    });
    areaMap[a.code] = created.id;
    console.log(`    Created Area: ${created.name} (${created.id})`);
  }

  // 4. Insert all criteria
  console.log("  Seeding criteria...");
  let count = 0;
  for (const c of newCriteria) {
    const areaId = areaMap[c.areaCode];
    if (!areaId) {
      console.error(`    Area code ${c.areaCode} not found in DB!`);
      continue;
    }
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId,
        code: c.code,
        name: c.name,
        ageGroup: c.ageGroup,
        sortOrder: c.sortOrder
      }
    });
    count++;
  }
  console.log(`    Successfully seeded ${count} criteria across all age groups.`);
}

async function main() {
  // Update local SQLite DB first
  const localPrisma = new PrismaClient({
    datasources: {
      db: {
        url: "file:./dev.db"
      }
    }
  });

  try {
    await updateDb(localPrisma, "Local SQLite");
  } catch (err) {
    console.error("Error updating Local SQLite database:", err.message);
  } finally {
    await localPrisma.$disconnect();
  }

  // Update Turso DB
  const tursoUrl = "libsql://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
  const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

  const libsql = createClient({
    url: tursoUrl,
    authToken: authToken,
  });
  const adapter = new PrismaLibSQL(libsql);
  const tursoPrisma = new PrismaClient({ adapter });

  try {
    await updateDb(tursoPrisma, "Turso Remote");
  } catch (err) {
    console.error("Error updating Turso database:", err.message);
  } finally {
    await tursoPrisma.$disconnect();
  }
}

main();
