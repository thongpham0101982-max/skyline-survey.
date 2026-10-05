import { prisma } from "../src/lib/db";
import { normalizeKey } from "../src/lib/competency-service";

async function main() {
  console.log("=== BẮT ĐẦU CHUẨN HÓA ALIAS VÀ TIÊU CHÍ NĂNG LỰC ===");

  // 1. Khắc phục xung đột TVI và NVA
  const tvi = await prisma.subject.findUnique({ where: { subjectCode: "TVI" } });
  const nva = await prisma.subject.findUnique({ where: { subjectCode: "NVA" } });

  if (tvi && nva) {
    // Xóa alias ngữ văn khỏi TVI
    await prisma.subjectAlias.deleteMany({
      where: {
        subjectId: tvi.id,
        normalizedKey: { in: ["nguvan", "van"] }
      }
    });

    // Gán đúng vào NVA
    const nvaAliases = ["Ngữ văn", "NGỮ VĂN", "NGU VAN", "Văn", "VĂN", "NVA", "NV"];
    for (const a of nvaAliases) {
      const norm = normalizeKey(a);
      await prisma.subjectAlias.upsert({
        where: { aliasPattern: a },
        create: { subjectId: nva.id, aliasPattern: a, normalizedKey: norm },
        update: { subjectId: nva.id, normalizedKey: norm }
      });
    }
    console.log("✓ Đã chuẩn hóa phân tách TVI (Tiếng Việt) và NVA (Ngữ văn)");
  }

  // 2. Thêm alias chuẩn cho các môn MOET phổ biến
  const moetAliasMappings: Record<string, string[]> = {
    TOA: ["Toán", "TOÁN", "TOAN", "Toán học", "Math", "MATH", "Mathematics", "MATHEMATICS", "DG_TO0", "TO", "TOA"],
    TVI: ["Tiếng Việt", "TIẾNG VIỆT", "TIENG VIET", "Tiếng việt", "TV", "TVI", "DG_TV0"],
    TA: ["Tiếng Anh", "TIẾNG ANH", "TIENG ANH", "TA", "TAV", "TA-BGD", "Tiếng Anh (BGD)", "DG_IB0", "DG_TA0", "ENGLISH"],
    KHT: ["Khoa học tự nhiên", "KHOA HỌC TỰ NHIÊN", "KHTN", "DG_KH0", "DG_KH1", "DG_KH2", "DG_KH3", "Khoa học tự nhiên (Lý)", "Khoa học tự nhiên (Hóa)", "Khoa học tự nhiên (Sinh)"],
    LSU: ["Lịch sử và Địa lí", "LỊCH SỬ VÀ ĐỊA LÍ", "Lịch sử - Địa lí", "LỊCH SỬ - ĐỊA LÍ", "LS-DL", "LSDL", "DG_LD0", "LS&ĐL", "Lịch sử & giáo dục địa phương"],
    LICH_SU: ["Lịch sử", "LỊCH SỬ", "LICH SU", "Sử", "DG_LS0"],
    DLI: ["Địa lí", "ĐỊA LÍ", "DIA LI", "Địa lý", "ĐỊA LÝ", "Địa", "DG_DL0"],
    GCD: ["Giáo dục công dân", "GIÁO DỤC CÔNG DÂN", "GDCD", "GD CÔNG DÂN", "DG_GC0", "DG_CD0"],
    GDKTPL: ["Giáo dục Kinh tế và Pháp luật", "GDKT&PL", "GDKTPL", "KTPL", "GD Kinh tế và Pháp luật", "DG_KP0"],
    GDQPAN: ["Giáo dục Quốc phòng và An ninh", "GDQP&AN", "GDQPAN", "GDQP-AN", "GDQP", "Quốc phòng an ninh", "DG_QP0"],
    HDTNHN: ["Hoạt động trải nghiệm, hướng nghiệp", "HĐTN&HN", "HDTNHN", "HDTN-HN", "HĐTN-HN", "HĐTN", "Hoạt động trải nghiệm", "DG_TN0"],
    TIN_HOC: ["Tin học", "TIN HỌC", "TIN HOC", "Tin học / ICT", "ICT", "Tin", "DG_IT0", "CÔNG NGHỆ THÔNG TIN"],
    GTC: ["Giáo dục thể chất", "GIÁO DỤC THỂ CHẤT", "GDTC", "Thể dục", "THỂ DỤC", "DG_TC0"],
    AM_NHAC: ["Âm nhạc", "ÂM NHẠC", "AM NHAC", "Nhạc", "Music", "MUSIC", "DG_AN0"],
    MI_THUAT: ["Mĩ thuật", "MĨ THUẬT", "Mỹ thuật", "MỸ THUẬT", "MI THUAT", "Art", "ART", "DG_MT0"],
    VLI: ["Vật lí", "VẬT LÍ", "Vật lý", "VẬT LÝ", "VAT LI", "Lý", "LÝ", "DG_LI0", "DG_VL0"],
    HHO: ["Hóa học", "HÓA HỌC", "HOA HOC", "Hóa", "HÓA", "DG_HO0", "DG_HH0"],
    SHO: ["Sinh học", "SINH HỌC", "SINH HOC", "Sinh", "SINH", "DG_SI0", "DG_SH0"],
    NDGDCDP: ["Nội dung giáo dục địa phương", "Giáo dục địa phương", "GDĐP", "GDDP", "GDCĐP", "DG_DP0"]
  };

  for (const [code, aliases] of Object.entries(moetAliasMappings)) {
    const sub = await prisma.subject.findUnique({ where: { subjectCode: code } });
    if (!sub) continue;
    for (const a of aliases) {
      const norm = normalizeKey(a);
      if (!norm) continue;
      try {
        await prisma.subjectAlias.upsert({
          where: { aliasPattern: a },
          create: { subjectId: sub.id, aliasPattern: a, normalizedKey: norm },
          update: { subjectId: sub.id, normalizedKey: norm }
        });
      } catch (err: any) {
        console.error(`Lỗi upsert alias "${a}":`, err.message);
      }
    }
  }
  console.log("✓ Đã cập nhật xong bộ alias toàn diện cho môn MOET");

  // 3. Chuẩn hóa Khung Năng Lực (SubjectCompetency) cho các môn ĐBCL
  const standardCompetencies: Record<string, Array<{ code: string; name: string; order: number; weight: number }>> = {
    NVA: [
      { code: "NVA_DOC", name: "Đọc hiểu văn bản", order: 1, weight: 1.0 },
      { code: "NVA_VIET", name: "Viết văn bản", order: 2, weight: 1.0 },
      { code: "NVA_NOI_NGHE", name: "Nói và Nghe", order: 3, weight: 1.0 }
    ],
    TA: [
      { code: "TA_NGHE", name: "Kĩ năng Nghe (Listening)", order: 1, weight: 1.0 },
      { code: "TA_NOI", name: "Kĩ năng Nói (Speaking)", order: 2, weight: 1.0 },
      { code: "TA_DOC", name: "Kĩ năng Đọc (Reading)", order: 3, weight: 1.0 },
      { code: "TA_VIET", name: "Kĩ năng Viết (Writing)", order: 4, weight: 1.0 }
    ],
    VLI: [
      { code: "VLI_NT", name: "Nhận thức vật lí", order: 1, weight: 1.0 },
      { code: "VLI_TH", name: "Tìm hiểu thế giới tự nhiên dưới góc độ vật lí", order: 2, weight: 1.0 },
      { code: "VLI_VD", name: "Vận dụng kiến thức, kĩ năng đã học", order: 3, weight: 1.0 }
    ],
    HHO: [
      { code: "HHO_NT", name: "Nhận thức hóa học", order: 1, weight: 1.0 },
      { code: "HHO_TH", name: "Tìm hiểu thế giới tự nhiên dưới góc độ hóa học", order: 2, weight: 1.0 },
      { code: "HHO_VD", name: "Vận dụng kiến thức, kĩ năng đã học", order: 3, weight: 1.0 }
    ],
    SHO: [
      { code: "SHO_NT", name: "Nhận thức sinh học", order: 1, weight: 1.0 },
      { code: "SHO_TH", name: "Tìm hiểu thế giới sống", order: 2, weight: 1.0 },
      { code: "SHO_VD", name: "Vận dụng kiến thức, kĩ năng đã học", order: 3, weight: 1.0 }
    ],
    DLI: [
      { code: "DLI_NT", name: "Nhận thức khoa học địa lí", order: 1, weight: 1.0 },
      { code: "DLI_TH", name: "Tìm hiểu địa lí", order: 2, weight: 1.0 },
      { code: "DLI_VD", name: "Vận dụng kiến thức, kĩ năng đã học", order: 3, weight: 1.0 }
    ],
    GCD: [
      { code: "GCD_HV", name: "Điều chỉnh hành vi", order: 1, weight: 1.0 },
      { code: "GCD_BT", name: "Phát triển bản thân", order: 2, weight: 1.0 },
      { code: "GCD_KTXH", name: "Tìm hiểu và tham gia hoạt động kinh tế - xã hội", order: 3, weight: 1.0 }
    ],
    IEL: [
      { code: "IEL_LIS", name: "IELTS Listening", order: 1, weight: 1.0 },
      { code: "IEL_REA", name: "IELTS Reading", order: 2, weight: 1.0 },
      { code: "IEL_WRI", name: "IELTS Writing", order: 3, weight: 1.0 },
      { code: "IEL_SPE", name: "IELTS Speaking", order: 4, weight: 1.0 }
    ],
    IL: [
      { code: "IL_PLAN", name: "Tự lập kế hoạch học tập (Self-Planning)", order: 1, weight: 1.0 },
      { code: "IL_EXEC", name: "Quản lý thời gian & Thực thi (Execution)", order: 2, weight: 1.0 },
      { code: "IL_REFL", name: "Tự đánh giá & Phản tư (Self-Reflection)", order: 3, weight: 1.0 }
    ],
    BSS: [
      { code: "BSS_KNOW", name: "Kiến thức Kinh doanh & Tài chính", order: 1, weight: 1.0 },
      { code: "BSS_PROB", name: "Phân tích & Giải quyết vấn đề", order: 2, weight: 1.0 },
      { code: "BSS_PROJ", name: "Kỹ năng Thuyết trình & Dự án", order: 3, weight: 1.0 }
    ]
  };

  let countCreated = 0;
  for (const [subCode, comps] of Object.entries(standardCompetencies)) {
    const sub = await prisma.subject.findUnique({ where: { subjectCode: subCode } });
    if (!sub) continue;

    for (const c of comps) {
      let comp = await prisma.subjectCompetency.findFirst({
        where: { subjectId: sub.id, code: c.code }
      });

      if (!comp) {
        comp = await prisma.subjectCompetency.create({
          data: {
            subjectId: sub.id,
            code: c.code,
            name: c.name,
            displayOrder: c.order,
            weight: c.weight
          }
        });
        countCreated++;
      }

      // Tạo alias cho competency
      if (comp) {
        const compNorm = normalizeKey(c.name);
        const codeNorm = normalizeKey(c.code);
        try {
          await prisma.subjectCompetencyAlias.upsert({
            where: { aliasPattern: c.name },
            create: { competencyId: comp.id, aliasPattern: c.name, normalizedKey: compNorm },
            update: { competencyId: comp.id, normalizedKey: compNorm }
          });
        } catch (e: any) {}
        try {
          await prisma.subjectCompetencyAlias.upsert({
            where: { aliasPattern: c.code },
            create: { competencyId: comp.id, aliasPattern: c.code, normalizedKey: codeNorm },
            update: { competencyId: comp.id, normalizedKey: codeNorm }
          });
        } catch (e: any) {}
      }
    }
  }
  console.log(`✓ Đã tạo/đồng bộ thêm ${countCreated} tiêu chí năng lực cho các môn ĐBCL`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
