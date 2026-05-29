import { prisma } from "./src/lib/db";

async function main() {
  const ageGroup = "18 đến 24 tháng";
  const type = "PROBATION";

  console.log("Seeding Probation criteria for:", ageGroup);

  // 1. Delete all Probation criteria for "18 đến 24 tháng" just in case
  const existingAreas = await prisma.preschoolDevArea.findMany({
    where: { type }
  });
  
  if (existingAreas.length > 0) {
     await prisma.preschoolDevCriteria.deleteMany({
       where: { 
         ageGroup,
         areaId: { in: existingAreas.map(a => a.id) }
       }
     });
  }

  // 2. We will find existing PROBATION areas by name, or create them
  const getOrCreateArea = async (name, color, sortOrder) => {
    let area = await prisma.preschoolDevArea.findFirst({
      where: { name, type }
    });
    if (!area) {
      area = await prisma.preschoolDevArea.create({
        data: {
          code: `PROB_${Date.now()}_${sortOrder}`,
          name,
          color,
          sortOrder,
          type
        }
      });
    }
    return area;
  };

  const areaNhanThuc = await getOrCreateArea("PHÁT TRIỂN NHẬN THỨC", "#f59e0b", 1);
  const areaNgonNgu = await getOrCreateArea("PHÁT TRIỂN NGÔN NGỮ", "#3b82f6", 2);
  const areaTinhCam = await getOrCreateArea("PHÁT TRIỂN TÌNH CẢM VÀ KỸ NĂNG XÃ HỘI", "#ec4899", 3);

  // Nhận thức criteria
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
        areaId: areaNhanThuc.id,
        code: `PR_NT_1824_${i}`,
        name: crits1[i],
        ageGroup,
        sortOrder: i + 1
      }
    });
  }

  // Ngôn ngữ
  const crits2 = [
    "Hiểu và thực hiện các yêu cầu đơn giản của người lớn.",
    "Nói/ Nhắc lại được 1 số từ có 2-3 tiếng: ba, mẹ, đi chơi...",
    "Sử dụng ngôn ngữ/hành động để thể hiện nhu cầu.",
    "Sử dụng ngôn ngữ/hành động để giao tiếp với cô giáo, bạn bè."
  ];

  for (let i = 0; i < crits2.length; i++) {
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId: areaNgonNgu.id,
        code: `PR_NN_1824_${i}`,
        name: crits2[i],
        ageGroup,
        sortOrder: i + 1
      }
    });
  }

  // Tình cảm
  const crits3 = [
    "Nhận ra bản thân trong gương, trong ảnh (chỉ vào hình ảnh của mình trong gương khi được hỏi)",
    "Cảm nhận và biểu lộ cảm xúc vui, buồn, sợ hãi của mình với người xung quanh.",
    "Làm theo một số yêu cầu đơn giản của cô",
    "Chào tạm biệt khi được nhắc nhở."
  ];

  for (let i = 0; i < crits3.length; i++) {
    await prisma.preschoolDevCriteria.create({
      data: {
        areaId: areaTinhCam.id,
        code: `PR_TC_1824_${i}`,
        name: crits3[i],
        ageGroup,
        sortOrder: i + 1
      }
    });
  }

  console.log("PROBATION SEED SUCCESSFUL!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
