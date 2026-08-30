const { PrismaClient } = require("@prisma/client");
const { createClient } = require("@libsql/client/web");
const { PrismaLibSQL } = require("@prisma/adapter-libsql");

const TURSO_URL = "https://skyline-survey-thongpham0101982-max.aws-ap-northeast-1.turso.io";
const TURSO_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJleHAiOjE4MDc5NjcwNjEsImlhdCI6MTc3NjQzMTA2MSwiaWQiOiIwMTlkOWEzYS1mMjAxLTczODgtYTY5ZC1jN2MwMTA1NGFmMzQiLCJyaWQiOiIyNDkwM2JhMC02N2Y3LTQ3YzgtYjdiZC1mMWJiZjc3MTA3N2QifQ.fb-srs0AEaF5lVeCM0Xjk06ItbIfuCqEaOWbKxrUv0kzJNcLbZEvwp_Kw4rtScLG8VTZqNUm0buXKjtAE9_ZAw";

const libsql = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });
const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });

function normalizeKey(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function seedAll() {
  console.log("Seeding all standard subject competencies and aliases...");

  const subjectsConfig = [
    {
      subjectCode: "TIENG_VIET",
      subjectName: "Tiếng Việt",
      aliases: ["TIẾNG VIỆT", "TIENG VIET", "NGỮ VĂN", "NGU VAN", "VĂN"],
      competencies: [
        { code: "NL_NGON_NGU", name: "Năng lực ngôn ngữ", aliases: ["Năng lực ngôn ngữ", "Ngon ngu", "Kĩ năng ngôn ngữ"] },
        { code: "NL_VAN_HOC", name: "Năng lực văn học", aliases: ["Năng lực văn học", "Van hoc", "Kiến thức", "Cảm thụ văn học"] }
      ]
    },
    {
      subjectCode: "ESL",
      subjectName: "Tiếng Anh (ESL)",
      aliases: ["ESL", "TIẾNG ANH", "TIENG ANH", "ENGLISH"],
      competencies: [
        { code: "NL_ESL_READING", name: "Reading", aliases: ["Reading", "Kĩ năng Đọc"] },
        { code: "NL_ESL_WRITING", name: "Writing", aliases: ["Writing", "Kĩ năng Viết"] },
        { code: "NL_ESL_SPEAKING", name: "Speaking", aliases: ["Speaking", "Kĩ năng Nói"] },
        { code: "NL_ESL_LISTENING", name: "Listening", aliases: ["Listening", "Kĩ năng Nghe"] },
        { code: "NL_ESL_USE_OF_ENGLISH", name: "Use of English", aliases: ["Use of English", "Ngữ pháp và Từ vựng"] }
      ]
    },
    {
      subjectCode: "GLOBAL_STUDIES",
      subjectName: "Global Studies",
      aliases: ["GLOBAL STUDIES", "GLOBAL STUDY"],
      competencies: [
        { code: "NL_GS_COGNITION", name: "Cognition ability", aliases: ["Cognition ability", "Năng lực nhận thức"] },
        { code: "NL_GS_READING", name: "Reading", aliases: ["Reading"] },
        { code: "NL_GS_WRITING", name: "Writing", aliases: ["Writing"] },
        { code: "NL_GS_SPEAKING", name: "Speaking", aliases: ["Speaking"] },
        { code: "NL_GS_LISTENING", name: "Listening", aliases: ["Listening"] }
      ]
    },
    {
      subjectCode: "SCIENCE_CAMBRIDGE",
      subjectName: "Science",
      aliases: ["SCIENCE", "KHOA HỌC"],
      competencies: [
        { code: "NL_SCI_PHYSICS", name: "Physics", aliases: ["Physics", "Vật lí"] },
        { code: "NL_SCI_CHEMISTRY", name: "Chemistry", aliases: ["Chemistry", "Hóa học"] },
        { code: "NL_SCI_BIOLOGY", name: "Biology", aliases: ["Biology", "Biolology", "Sinh học"] },
        { code: "NL_SCI_EARTH_SPACE", name: "Earth & Space", aliases: ["Earth & Space", "Trái đất và Không gian"] }
      ]
    },
    {
      subjectCode: "MATHS_CAMBRIDGE",
      subjectName: "Maths (Cambridge)",
      aliases: ["MATHS", "MATHEMATICS CAMBRIDGE"],
      competencies: [
        { code: "NL_MATH_NUMBER", name: "Number", aliases: ["Number", "Số học"] },
        { code: "NL_MATH_GEOMETRY", name: "Geometry and Measure", aliases: ["Geometry and Measure", "Hình học và Đo lường"] },
        { code: "NL_MATH_STATISTICS", name: "Statistics and Probability", aliases: ["Statistics and Probability", "Thống kê và Xác suất"] }
      ]
    },
    {
      subjectCode: "STEM",
      subjectName: "STEM",
      aliases: ["STEM", "GIÁO DỤC STEM"],
      competencies: [
        { code: "NL_STEM_NHAN_THUC", name: "Năng lực nhận thức khoa học", aliases: ["Năng lực nhận thức khoa học", "Năng lực nhận thức khoa học công nghệ"] },
        { code: "NL_STEM_TIM_HIEU", name: "Năng lực tìm hiểu môi trường tự nhiên xung quanh", aliases: ["Năng lực tìm hiểu môi trường tự nhiên xung quanh", "Tìm hiểu môi trường tự nhiên"] },
        { code: "NL_STEM_VAN_DUNG", name: "Năng lực vận dụng kiến thức kĩ năng đã học", aliases: ["Năng lực vận dụng kiến thức kĩ năng đã học", "Vận dụng kiến thức kĩ năng"] }
      ]
    },
    {
      subjectCode: "TIN_HOC",
      subjectName: "Tin học / ICT",
      aliases: ["TIN HỌC", "TIN HOC", "ICT", "CÔNG NGHỆ THÔNG TIN"],
      competencies: [
        { code: "NL_ICT_GIAI_QUYET", name: "Năng lực giải quyết vấn đề với ICT", aliases: ["Năng lực giải quyết vấn đề với sự hỗ trợ của công nghệ thông tin và truyền thông", "Giải quyết vấn đề ICT"] },
        { code: "NL_ICT_SU_DUNG", name: "Năng lực sử dụng và quản lí phương tiện ICT", aliases: ["Năng lực sử dụng và quản lí các phương tiện công nghệ thông tin và truyền thông", "Sử dụng và quản lí ICT"] }
      ]
    },
    {
      subjectCode: "MI_THUAT",
      subjectName: "Mĩ thuật",
      aliases: ["MĨ THUẬT", "MỸ THUẬT", "MI THUAT"],
      competencies: [
        { code: "NL_MT_QUAN_SAT", name: "Quan sát và nhận thức thẩm mĩ", aliases: ["Quan sát và nhận thức thẩm mĩ", "Quan sát thẩm mĩ"] },
        { code: "NL_MT_SANG_TAO", name: "Sáng tạo và ứng dụng thẩm mĩ", aliases: ["Sáng tạo và ứng dụng thẩm mĩ", "Sáng tạo thẩm mĩ"] },
        { code: "NL_MT_PHAN_TICH", name: "Phân tích và đánh giá thẩm mĩ", aliases: ["Phân tích và đánh giá thẩm mĩ", "Đánh giá thẩm mĩ"] }
      ]
    },
    {
      subjectCode: "AM_NHAC",
      subjectName: "Âm nhạc",
      aliases: ["ÂM NHẠC", "AM NHAC", "MUSIC"],
      competencies: [
        { code: "NL_AN_THE_HIEN", name: "Thể hiện âm nhạc", aliases: ["Thể hiện âm nhạc"] },
        { code: "NL_AN_CAM_THU", name: "Cảm thụ và hiểu biết âm nhạc", aliases: ["Cảm thụ và hiểu biết âm nhạc", "Hiểu biết âm nhạc"] }
      ]
    },
    {
      subjectCode: "GDTC",
      subjectName: "Giáo dục thể chất",
      aliases: ["GIÁO DỤC THỂ CHẤT", "GIAO DUC THE CHAT", "THỂ DỤC"],
      competencies: [
        { code: "NL_GDTC_VAN_DONG", name: "Vận động cơ bản", aliases: ["Vận động cơ bản", "Hoạt động thể dục thể thao"] },
        { code: "NL_GDTC_SUC_KHOE", name: "Chăm sóc sức khỏe", aliases: ["Chăm sóc sức khỏe"] }
      ]
    },
    {
      subjectCode: "CAM_XUC_XA_HOI",
      subjectName: "Cảm xúc xã hội (SEL)",
      aliases: ["CẢM XÚC XÃ HỘI", "CAM XUC XA HOI", "SEL"],
      competencies: [
        { code: "NL_SEL_NHAN_DIEN", name: "Nhận diện, biết", aliases: ["Nhận diện, biết", "Nhận biết cảm xúc"] },
        { code: "NL_SEL_GIAI_THICH", name: "Giải thích được", aliases: ["Giải thích được", "Thấu hiểu"] },
        { code: "NL_SEL_VAN_DUNG", name: "Vận dụng", aliases: ["Vận dụng", "Đề xuất và thực hiện các giải pháp"] }
      ]
    },
    {
      subjectCode: "LICH_SU",
      subjectName: "Lịch sử & Địa lí",
      aliases: ["LỊCH SỬ", "LICH SU", "LỊCH SỬ VÀ ĐỊA LÍ", "ĐỊA LÍ"],
      competencies: [
        { code: "NL_LS_TIM_HIEU", name: "Tìm hiểu Lịch sử", aliases: ["Tìm hiểu Lịch sử", "Nhận thức khoa học lịch sử và địa lí"] }
      ]
    }
  ];

  for (const item of subjectsConfig) {
    let sub = await prisma.subject.findFirst({
      where: {
        OR: [
          { subjectCode: item.subjectCode },
          { subjectName: item.subjectName }
        ]
      }
    });

    if (!sub) {
      sub = await prisma.subject.create({
        data: {
          subjectCode: item.subjectCode,
          subjectName: item.subjectName,
          level: "ALL",
          category: "MOET"
        }
      });
    }

    // Aliases
    for (const a of item.aliases) {
      const norm = normalizeKey(a);
      await prisma.subjectAlias.upsert({
        where: { aliasPattern: a },
        create: { subjectId: sub.id, aliasPattern: a, normalizedKey: norm },
        update: { subjectId: sub.id, normalizedKey: norm }
      });
    }

    // Competencies
    let order = 1;
    for (const comp of item.competencies) {
      const createdComp = await prisma.subjectCompetency.upsert({
        where: {
          subjectId_code: {
            subjectId: sub.id,
            code: comp.code
          }
        },
        create: {
          subjectId: sub.id,
          code: comp.code,
          name: comp.name,
          displayOrder: order++,
          weight: 1.0
        },
        update: {
          name: comp.name,
          displayOrder: order
        }
      });

      for (const a of comp.aliases) {
        const norm = normalizeKey(a);
        await prisma.subjectCompetencyAlias.upsert({
          where: { aliasPattern: a },
          create: { competencyId: createdComp.id, aliasPattern: a, normalizedKey: norm },
          update: { competencyId: createdComp.id, normalizedKey: norm }
        });
      }
    }
    console.log(`Seeded: ${item.subjectName}`);
  }

  console.log("All subjects and competencies seeded successfully!");
}

seedAll().catch(console.error).finally(() => prisma.$disconnect());
