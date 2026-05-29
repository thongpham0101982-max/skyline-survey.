import { prisma } from "./src/lib/db";

async function main() {
  const ageGroup = "18 đến 24 tháng";

  console.log("Restoring original data for:", ageGroup);

  // 1. Delete all criteria for "18 đến 24 tháng"
  await prisma.preschoolDevCriteria.deleteMany({
    where: { ageGroup }
  });

  // 2. We will find existing areas by name, or create them if not exist
  const getOrCreateArea = async (name, color, sortOrder) => {
    let area = await prisma.preschoolDevArea.findFirst({
      where: { name: { contains: name } }
    });
    if (!area) {
      area = await prisma.preschoolDevArea.create({
        data: {
          code: `AREA_${Date.now()}_${sortOrder}`,
          name,
          color,
          sortOrder
        }
      });
    }
    return area;
  };

  const areaTheChat = await getOrCreateArea("Thể chất", "#10b981", 1);
  const areaNhanThuc = await getOrCreateArea("Nhận thức", "#6366f1", 2);
  const areaNgonNgu = await getOrCreateArea("Ngôn ngữ", "#f59e0b", 3);
  const areaTinhCam = await getOrCreateArea("Tình cảm", "#ec4899", 4);

  // Thể chất criteria
  const crits1 = [
    "Sức khỏe - Chiều cao (cm)",
    "Sức khỏe - Cân nặng (Kg)",
    "Vận động tinh: Tháo lắp, lồng được 3-4 hộp tròn hoặc xếp chồng được 2 - 3 hình khối.",
    "Vận động thô: Đi chạy nhảy tốt."
  ];

  for (let i = 0; i < crits1.length; i++) {
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId: areaTheChat.id,
        code: `TC_1824_${i}`,
        name: crits1[i],
        ageGroup,
        sortOrder: i + 1
      }
    });
  }

  // Nhận thức criteria
  const crits2 = [
    "* Chỉ và nói được tên đồ dùng, đồ chơi, con vật, hoa quả quen thuộc.",
    "* Biết sử dụng một số đồ dùng, đồ chơi.",
    "* Biết tên bản thân và một số người thân trong gia đình.",
    "* Chỉ và nói được tên một số bộ phận trên cơ thể của bản thân: mắt, mũi, miệng, tay..."
  ];

  for (let i = 0; i < crits2.length; i++) {
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId: areaNhanThuc.id,
        code: `NT_1824_${i}`,
        name: crits2[i],
        ageGroup,
        sortOrder: i + 1
      }
    });
  }

  // Ngôn ngữ
  const crits3 = [
    "* Hiểu và làm theo chỉ dẫn đơn giản của người lớn.",
    "* Trả lời được câu hỏi đơn giản (\"Ai?\"; \"Cái gì?\"; \"Thế nào?\").",
    "* Phát âm rõ tiếng.",
    "* Nói được câu 2 từ.",
    "* Nhắc lại được câu 3-4 từ."
  ];

  for (let i = 0; i < crits3.length; i++) {
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId: areaNgonNgu.id,
        code: `NN_1824_${i}`,
        name: crits3[i],
        ageGroup,
        sortOrder: i + 1
      }
    });
  }

  // Tình cảm
  const crits4 = [
    "* Thích nghe hát, nghe nhạc.",
    "* Thích xem tranh ảnh có màu sắc.",
    "* Cảm nhận và biểu lộ cảm xúc vui, sợ hãi qua nét mặt, cử chỉ."
  ];

  for (let i = 0; i < crits4.length; i++) {
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId: areaTinhCam.id,
        code: `TC_KN_1824_${i}`,
        name: crits4[i],
        ageGroup,
        sortOrder: i + 1
      }
    });
  }

  // Also delete the "PHÁT TRIỂN NHẬN THỨC", "PHÁT TRIỂN NGÔN NGỮ", "PHÁT TRIỂN TÌNH CẢM VÀ KỸ NĂNG XÃ HỘI" areas I mistakenly created to clean up
  await prisma.preschoolDevArea.deleteMany({
    where: {
      name: {
        in: ["PHÁT TRIỂN NHẬN THỨC", "PHÁT TRIỂN NGÔN NGỮ", "PHÁT TRIỂN TÌNH CẢM VÀ KỸ NĂNG XÃ HỘI"]
      }
    }
  });

  console.log("RESTORE SUCCESSFUL!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
