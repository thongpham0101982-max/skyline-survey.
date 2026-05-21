const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding PreschoolDevArea + PreschoolDevCriteria...');

  const areas = [
    {
      code: 'THE_CHAT',
      name: 'Thể chất',
      description: 'Đánh giá sự phát triển vận động thô, vận động tinh và sức khỏe thể chất của trẻ',
      color: '#10b981',
      sortOrder: 0,
      criteria: [
        // 18–24 tháng
        { code: 'TC_1824_01', name: 'Đi vững, không cần hỗ trợ', ageGroup: '18 đến 24 tháng', sortOrder: 0 },
        { code: 'TC_1824_02', name: 'Leo cầu thang có người giữ tay', ageGroup: '18 đến 24 tháng', sortOrder: 1 },
        { code: 'TC_1824_03', name: 'Cầm bình uống nước tự đưa lên miệng', ageGroup: '18 đến 24 tháng', sortOrder: 2 },
        // 24–36 tháng
        { code: 'TC_2436_01', name: 'Chạy nhẹ nhàng, không ngã', ageGroup: '24 đến 36 tháng', sortOrder: 0 },
        { code: 'TC_2436_02', name: 'Nhảy bật tại chỗ bằng 2 chân', ageGroup: '24 đến 36 tháng', sortOrder: 1 },
        { code: 'TC_2436_03', name: 'Xâu hạt vào dây hoặc xếp tháp', ageGroup: '24 đến 36 tháng', sortOrder: 2 },
        // Mẫu giáo bé
        { code: 'TC_MGB_01', name: 'Đi thăng bằng trên vạch kẻ', ageGroup: 'Mẫu giáo bé', sortOrder: 0 },
        { code: 'TC_MGB_02', name: 'Bắt bóng bằng 2 tay từ khoảng cách gần', ageGroup: 'Mẫu giáo bé', sortOrder: 1 },
        { code: 'TC_MGB_03', name: 'Tự xúc ăn gọn gàng bằng thìa', ageGroup: 'Mẫu giáo bé', sortOrder: 2 },
        // Mẫu giáo nhỡ
        { code: 'TC_MGN_01', name: 'Nhảy lò cò được 4–5 bước', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 0 },
        { code: 'TC_MGN_02', name: 'Cắt theo đường thẳng bằng kéo', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 1 },
        { code: 'TC_MGN_03', name: 'Tự mặc quần áo, cài cúc', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 2 },
        // Mẫu giáo lớn
        { code: 'TC_MGL_01', name: 'Chạy nhanh 15m trong 5 giây', ageGroup: 'Mẫu giáo lớn', sortOrder: 0 },
        { code: 'TC_MGL_02', name: 'Viết tên bản thân bằng chữ in hoa', ageGroup: 'Mẫu giáo lớn', sortOrder: 1 },
        { code: 'TC_MGL_03', name: 'Nhảy dây đơn giản', ageGroup: 'Mẫu giáo lớn', sortOrder: 2 },
      ]
    },
    {
      code: 'NHAN_THUC',
      name: 'Nhận thức',
      description: 'Đánh giá khả năng tư duy, giải quyết vấn đề và khám phá thế giới xung quanh',
      color: '#6366f1',
      sortOrder: 1,
      criteria: [
        { code: 'NT_1824_01', name: 'Chỉ và gọi tên được 3–5 đồ vật quen', ageGroup: '18 đến 24 tháng', sortOrder: 0 },
        { code: 'NT_1824_02', name: 'Lắp ráp đồ chơi đơn giản (xếp chồng 3 khối)', ageGroup: '18 đến 24 tháng', sortOrder: 1 },
        { code: 'NT_2436_01', name: 'Phân biệt to – nhỏ, nhiều – ít', ageGroup: '24 đến 36 tháng', sortOrder: 0 },
        { code: 'NT_2436_02', name: 'Ghép tranh 4–6 mảnh', ageGroup: '24 đến 36 tháng', sortOrder: 1 },
        { code: 'NT_MGB_01', name: 'Nhận biết 4 màu cơ bản', ageGroup: 'Mẫu giáo bé', sortOrder: 0 },
        { code: 'NT_MGB_02', name: 'Đếm từ 1 đến 5', ageGroup: 'Mẫu giáo bé', sortOrder: 1 },
        { code: 'NT_MGN_01', name: 'So sánh cao – thấp, dài – ngắn', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 0 },
        { code: 'NT_MGN_02', name: 'Phân loại đồ vật theo 2 dấu hiệu', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 1 },
        { code: 'NT_MGL_01', name: 'Đếm, nhận biết số từ 1 đến 10', ageGroup: 'Mẫu giáo lớn', sortOrder: 0 },
        { code: 'NT_MGL_02', name: 'Giải bài toán cộng trừ trong phạm vi 5', ageGroup: 'Mẫu giáo lớn', sortOrder: 1 },
      ]
    },
    {
      code: 'NGON_NGU',
      name: 'Ngôn ngữ',
      description: 'Đánh giá khả năng nghe, nói, giao tiếp và tiền đọc viết',
      color: '#f59e0b',
      sortOrder: 2,
      criteria: [
        { code: 'NN_1824_01', name: 'Nói được 10–20 từ đơn', ageGroup: '18 đến 24 tháng', sortOrder: 0 },
        { code: 'NN_1824_02', name: 'Hiểu và thực hiện yêu cầu đơn giản', ageGroup: '18 đến 24 tháng', sortOrder: 1 },
        { code: 'NN_2436_01', name: 'Nói câu 2–3 từ ghép', ageGroup: '24 đến 36 tháng', sortOrder: 0 },
        { code: 'NN_2436_02', name: 'Gọi tên các bộ phận cơ thể', ageGroup: '24 đến 36 tháng', sortOrder: 1 },
        { code: 'NN_MGB_01', name: 'Kể lại sự việc đơn giản theo trình tự', ageGroup: 'Mẫu giáo bé', sortOrder: 0 },
        { code: 'NN_MGB_02', name: 'Trả lời câu hỏi: Ai? Cái gì? Ở đâu?', ageGroup: 'Mẫu giáo bé', sortOrder: 1 },
        { code: 'NN_MGN_01', name: 'Kể lại truyện ngắn đã nghe', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 0 },
        { code: 'NN_MGN_02', name: 'Nhận biết một số chữ cái', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 1 },
        { code: 'NN_MGL_01', name: 'Nhận biết 29 chữ cái tiếng Việt', ageGroup: 'Mẫu giáo lớn', sortOrder: 0 },
        { code: 'NN_MGL_02', name: 'Đọc thơ, kể chuyện diễn cảm', ageGroup: 'Mẫu giáo lớn', sortOrder: 1 },
      ]
    },
    {
      code: 'TINH_CAM_XH',
      name: 'Tình cảm - Xã hội',
      description: 'Đánh giá sự phát triển cảm xúc, kỹ năng xã hội và hành vi ứng xử',
      color: '#ec4899',
      sortOrder: 3,
      criteria: [
        { code: 'TC_XH_1824_01', name: 'Thể hiện vui – buồn rõ ràng', ageGroup: '18 đến 24 tháng', sortOrder: 0 },
        { code: 'TC_XH_1824_02', name: 'Chơi cạnh bạn (chơi song song)', ageGroup: '18 đến 24 tháng', sortOrder: 1 },
        { code: 'TC_XH_2436_01', name: 'Biết chờ đợi lượt chơi', ageGroup: '24 đến 36 tháng', sortOrder: 0 },
        { code: 'TC_XH_2436_02', name: 'Tự ăn, tự uống khi được nhắc', ageGroup: '24 đến 36 tháng', sortOrder: 1 },
        { code: 'TC_XH_MGB_01', name: 'Chơi hợp tác với bạn trong nhóm nhỏ', ageGroup: 'Mẫu giáo bé', sortOrder: 0 },
        { code: 'TC_XH_MGB_02', name: 'Biết nói cảm ơn, xin lỗi khi được nhắc', ageGroup: 'Mẫu giáo bé', sortOrder: 1 },
        { code: 'TC_XH_MGN_01', name: 'Tuân thủ nội quy lớp học', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 0 },
        { code: 'TC_XH_MGN_02', name: 'Chia sẻ đồ chơi với bạn', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 1 },
        { code: 'TC_XH_MGL_01', name: 'Tự giác trong các hoạt động hàng ngày', ageGroup: 'Mẫu giáo lớn', sortOrder: 0 },
        { code: 'TC_XH_MGL_02', name: 'Giải quyết xung đột bằng lời nói', ageGroup: 'Mẫu giáo lớn', sortOrder: 1 },
      ]
    },
    {
      code: 'THAM_MY',
      name: 'Thẩm mỹ',
      description: 'Đánh giá khả năng cảm nhận cái đẹp, sáng tạo qua âm nhạc và tạo hình',
      color: '#8b5cf6',
      sortOrder: 4,
      criteria: [
        { code: 'TM_1824_01', name: 'Vận động theo nhạc đơn giản', ageGroup: '18 đến 24 tháng', sortOrder: 0 },
        { code: 'TM_1824_02', name: 'Vẽ nguệch ngoạc bằng bút chì màu', ageGroup: '18 đến 24 tháng', sortOrder: 1 },
        { code: 'TM_2436_01', name: 'Hát theo bài hát quen thuộc', ageGroup: '24 đến 36 tháng', sortOrder: 0 },
        { code: 'TM_2436_02', name: 'Nặn đất sét thành hình tròn, dài', ageGroup: '24 đến 36 tháng', sortOrder: 1 },
        { code: 'TM_MGB_01', name: 'Vẽ hình tròn, hình vuông', ageGroup: 'Mẫu giáo bé', sortOrder: 0 },
        { code: 'TM_MGB_02', name: 'Hát đúng giai điệu bài hát đơn giản', ageGroup: 'Mẫu giáo bé', sortOrder: 1 },
        { code: 'TM_MGN_01', name: 'Tô màu không lem ra ngoài', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 0 },
        { code: 'TM_MGN_02', name: 'Múa vận động nhịp nhàng theo nhạc', ageGroup: 'Mẫu giáo nhỡ', sortOrder: 1 },
        { code: 'TM_MGL_01', name: 'Vẽ sáng tạo theo chủ đề', ageGroup: 'Mẫu giáo lớn', sortOrder: 0 },
        { code: 'TM_MGL_02', name: 'Biểu diễn trước lớp tự tin', ageGroup: 'Mẫu giáo lớn', sortOrder: 1 },
      ]
    }
  ];

  for (const area of areas) {
    const { criteria, ...areaData } = area;
    const created = await prisma.preschoolDevArea.upsert({
      where: { code: areaData.code },
      create: areaData,
      update: { name: areaData.name, description: areaData.description, color: areaData.color, sortOrder: areaData.sortOrder }
    });
    console.log(`  Area: ${created.name} (${created.id})`);

    for (const c of criteria) {
      try {
        await prisma.preschoolDevCriteria.upsert({
          where: { areaId_code_ageGroup: { areaId: created.id, code: c.code, ageGroup: c.ageGroup } },
          create: { ...c, areaId: created.id },
          update: { name: c.name, sortOrder: c.sortOrder }
        });
      } catch (e) {
        console.log(`    Skip duplicate: ${c.code}`);
      }
    }
    console.log(`    ${criteria.length} criteria seeded.`);
  }

  console.log('\\nDone! Seed completed.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
