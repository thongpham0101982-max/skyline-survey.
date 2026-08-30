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

async function seed() {
  console.log("Seeding standard subjects, competencies, and aliases directly to Turso Cloud DB...");

  // 1. Ensure Subject "Khoa học tự nhiên" (KHTN)
  let khtn = await prisma.subject.findFirst({
    where: {
      OR: [
        { subjectCode: "KHTN" },
        { subjectName: { contains: "Khoa học tự nhiên" } }
      ]
    }
  });

  if (!khtn) {
    khtn = await prisma.subject.create({
      data: {
        subjectCode: "KHTN",
        subjectName: "Khoa học tự nhiên",
        level: "THCS",
        category: "MOET",
      }
    });
    console.log("Created Subject: Khoa học tự nhiên");
  }

  // Subject Aliases for KHTN
  const khtnAliases = [
    "KHOA HỌC TỰ NHIÊN (HÓA)",
    "KHOA HỌC TỰ NHIÊN (LÝ)",
    "KHOA HỌC TỰ NHIÊN (LÍ)",
    "KHOA HỌC TỰ NHIÊN (SINH)",
    "KHOA HỌC TỰ NHIÊN",
    "KHTN (HÓA)",
    "KHTN (LÝ)",
    "KHTN (SINH)",
    "KHTN",
    "KHOA HOC TU NHIEN"
  ];

  for (const alias of khtnAliases) {
    const norm = normalizeKey(alias);
    await prisma.subjectAlias.upsert({
      where: { aliasPattern: alias },
      create: { subjectId: khtn.id, aliasPattern: alias, normalizedKey: norm },
      update: { subjectId: khtn.id, normalizedKey: norm }
    });
  }
  console.log("Seeded Subject Aliases for KHTN");

  // Competencies for KHTN
  const khtnCompetencies = [
    {
      code: "NL_KHTN_NHAN_THUC",
      name: "Năng lực nhận thức khoa học tự nhiên",
      displayOrder: 1,
      weight: 1.0,
      aliases: [
        "Năng lực nhận thức khoa học tự nhiên",
        "Nhận thức khoa học tự nhiên",
        "Nang luc nhan thuc khoa hoc tu nhien",
        "Kĩ năng nhận thức KHTN",
        "Kỹ năng nhận thức KHTN"
      ]
    },
    {
      code: "NL_KHTN_TIM_HIEU",
      name: "Năng lực tìm hiểu tự nhiên",
      displayOrder: 2,
      weight: 1.0,
      aliases: [
        "Năng lực tìm hiểu tự nhiên",
        "Tìm hiểu tự nhiên",
        "Nang luc tim hieu tu nhien",
        "Kĩ năng tìm hiểu tự nhiên",
        "Kỹ năng tìm hiểu tự nhiên"
      ]
    },
    {
      code: "NL_KHTN_VAN_DUNG",
      name: "Năng lực vận dụng kiến thức, kỹ năng đã học",
      displayOrder: 3,
      weight: 1.0,
      aliases: [
        "Năng lực vận dụng kiến thức, kỹ năng đã học",
        "Vận dụng kiến thức kĩ năng đã học",
        "Vận dụng kiến thức, kỹ năng đã học",
        "Nang luc van dung kien thuc, ky nang da hoc",
        "Vận dụng kiến thức vào thực tiễn"
      ]
    }
  ];

  for (const comp of khtnCompetencies) {
    const createdComp = await prisma.subjectCompetency.upsert({
      where: {
        subjectId_code: {
          subjectId: khtn.id,
          code: comp.code
        }
      },
      create: {
        subjectId: khtn.id,
        code: comp.code,
        name: comp.name,
        displayOrder: comp.displayOrder,
        weight: comp.weight
      },
      update: {
        name: comp.name,
        displayOrder: comp.displayOrder,
        weight: comp.weight
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
  console.log("Seeded standard Competencies and Aliases for KHTN");

  // 2. Ensure Subject "Toán học" (TOAN)
  let toan = await prisma.subject.findFirst({
    where: {
      OR: [
        { subjectCode: "TOAN" },
        { subjectName: { contains: "Toán" } }
      ]
    }
  });

  if (!toan) {
    toan = await prisma.subject.create({
      data: {
        subjectCode: "TOAN",
        subjectName: "Toán học",
        level: "ALL",
        category: "MOET",
      }
    });
  }

  const toanAliases = ["TOÁN", "TOÁN HỌC", "TOAN", "MATHEMATICS", "MATH"];
  for (const alias of toanAliases) {
    const norm = normalizeKey(alias);
    await prisma.subjectAlias.upsert({
      where: { aliasPattern: alias },
      create: { subjectId: toan.id, aliasPattern: alias, normalizedKey: norm },
      update: { subjectId: toan.id, normalizedKey: norm }
    });
  }

  const toanCompetencies = [
    { code: "NL_TOAN_TU_DUY", name: "Năng lực tư duy và lập luận toán học", displayOrder: 1, weight: 1.0 },
    { code: "NL_TOAN_MO_HINH", name: "Năng lực mô hình hoá toán học", displayOrder: 2, weight: 1.0 },
    { code: "NL_TOAN_GIAI_QUYET", name: "Năng lực giải quyết vấn đề toán học", displayOrder: 3, weight: 1.0 },
    { code: "NL_TOAN_GIAO_TIEP", name: "Năng lực giao tiếp toán học", displayOrder: 4, weight: 1.0 },
    { code: "NL_TOAN_CONG_CU", name: "Năng lực sử dụng công cụ, phương tiện học toán", displayOrder: 5, weight: 1.0 },
  ];

  for (const comp of toanCompetencies) {
    await prisma.subjectCompetency.upsert({
      where: {
        subjectId_code: {
          subjectId: toan.id,
          code: comp.code
        }
      },
      create: {
        subjectId: toan.id,
        code: comp.code,
        name: comp.name,
        displayOrder: comp.displayOrder,
        weight: comp.weight
      },
      update: {
        name: comp.name,
        displayOrder: comp.displayOrder,
        weight: comp.weight
      }
    });
  }
  console.log("Seeded standard Competencies for Toán học");

  console.log("Turso Cloud DB catalog seeding finished successfully!");
}

seed().catch(console.error).finally(() => prisma.$disconnect());
