const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ageGroup = "18 đến 24 tháng";

  // Delete existing areas for this age group
  await prisma.preschoolDevArea.deleteMany({
    where: { ageGroup }
  });

  // 1. Phát triển nhận thức
  const area1 = await prisma.preschoolDevArea.create({
    data: {
      ageGroup,
      name: "PHÁT TRIỂN NHẬN THỨC",
      orderIndex: 1,
      color: "#f59e0b"
    }
  });

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
        areaId: area1.id,
        name: crits1[i],
        orderIndex: i + 1
      }
    });
  }

  // 2. Phát triển ngôn ngữ
  const area2 = await prisma.preschoolDevArea.create({
    data: {
      ageGroup,
      name: "PHÁT TRIỂN NGÔN NGỮ",
      orderIndex: 2,
      color: "#3b82f6"
    }
  });

  const crits2 = [
    "Hiểu và thực hiện các yêu cầu đơn giản của người lớn.",
    "Nói/ Nhắc lại được 1 số từ có 2-3 tiếng: ba, mẹ, đi chơi...",
    "Sử dụng ngôn ngữ/hành động để thể hiện nhu cầu.",
    "Sử dụng ngôn ngữ/hành động để giao tiếp với cô giáo, bạn bè."
  ];

  for (let i = 0; i < crits2.length; i++) {
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId: area2.id,
        name: crits2[i],
        orderIndex: i + 1
      }
    });
  }

  // 3. Phát triển tình cảm và kỹ năng xã hội
  const area3 = await prisma.preschoolDevArea.create({
    data: {
      ageGroup,
      name: "PHÁT TRIỂN TÌNH CẢM VÀ KỸ NĂNG XÃ HỘI",
      orderIndex: 3,
      color: "#ec4899"
    }
  });

  const crits3 = [
    "Nhận ra bản thân trong gương, trong ảnh (chỉ vào hình ảnh của mình trong gương khi được hỏi)",
    "Cảm nhận và biểu lộ cảm xúc vui, buồn, sợ hãi của mình với người xung quanh.",
    "Làm theo một số yêu cầu đơn giản của cô",
    "Chào tạm biệt khi được nhắc nhở."
  ];

  for (let i = 0; i < crits3.length; i++) {
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId: area3.id,
        name: crits3[i],
        orderIndex: i + 1
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
