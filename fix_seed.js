const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ageGroup = "18 đến 24 tháng";

  // First, delete existing criteria for this age group
  await prisma.preschoolDevCriteria.deleteMany({
    where: { ageGroup }
  });

  // Find or create Areas
  const areas = [
    { code: "A1_1824", name: "PHÁT TRIỂN NHẬN THỨC", color: "#f59e0b", sortOrder: 1 },
    { code: "A2_1824", name: "PHÁT TRIỂN NGÔN NGỮ", color: "#3b82f6", sortOrder: 2 },
    { code: "A3_1824", name: "PHÁT TRIỂN TÌNH CẢM VÀ KỸ NĂNG XÃ HỘI", color: "#ec4899", sortOrder: 3 }
  ];

  const dbAreas = [];
  for (const a of areas) {
    let dbArea = await prisma.preschoolDevArea.findUnique({ where: { code: a.code } });
    if (!dbArea) {
      dbArea = await prisma.preschoolDevArea.create({
        data: {
          code: a.code,
          name: a.name,
          color: a.color,
          sortOrder: a.sortOrder
        }
      });
    } else {
      dbArea = await prisma.preschoolDevArea.update({
        where: { id: dbArea.id },
        data: { name: a.name, color: a.color }
      });
    }
    dbAreas.push(dbArea);
  }

  // 1. Phát triển nhận thức
  const crits1 = [
    "Chú ý quan sát các sự vật, hiện tượng xung quanh.",
    "Đặt câu hỏi về sự thay đổi của các sự vật, hiện tượng gần gũi/ quen thuộc",
    "Nhận biết được sự vật, đồ vật gần gũi khi sờ nắn, nghe, ngửi, nếm ...",
    "Tìm kiếm sự trợ giúp của người khác khi khám phá sự vật, hiện tượng gần gũi",
    "Nhận biết được tên, đặc điểm bên ngoài và chức năng chính của 1 số bộ phận cơ thể người."
  ];

  for (let i = 0; i < crits1.length; i++) {
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId: dbAreas[0].id,
        code: `C1_1824_${i}`,
        name: crits1[i],
        ageGroup,
        sortOrder: i + 1
      }
    });
  }

  // 2. Phát triển ngôn ngữ
  const crits2 = [
    "Hiểu và thực hiện các yêu cầu đơn giản của người lớn.",
    "Nói/ Nhắc lại được 1 số từ có 2-3 tiếng: ba, mẹ, đi chơi...",
    "Sử dụng ngôn ngữ/hành động để thể hiện nhu cầu.",
    "Sử dụng ngôn ngữ/hành động để giao tiếp với cô giáo, bạn bè."
  ];

  for (let i = 0; i < crits2.length; i++) {
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId: dbAreas[1].id,
        code: `C2_1824_${i}`,
        name: crits2[i],
        ageGroup,
        sortOrder: i + 1
      }
    });
  }

  // 3. Phát triển tình cảm và kỹ năng xã hội
  const crits3 = [
    "Nhận ra bản thân trong gương, trong ảnh (chỉ vào hình ảnh của mình trong gương khi được hỏi)",
    "Cảm nhận và biểu lộ cảm xúc vui, buồn, sợ hãi của mình với người xung quanh.",
    "Làm theo một số yêu cầu đơn giản của cô",
    "Chào tạm biệt khi được nhắc nhở."
  ];

  for (let i = 0; i < crits3.length; i++) {
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId: dbAreas[2].id,
        code: `C3_1824_${i}`,
        name: crits3[i],
        ageGroup,
        sortOrder: i + 1
      }
    });
  }

  console.log("Seed data for 18-24 months updated successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
