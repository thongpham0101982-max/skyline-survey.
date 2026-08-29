const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function seedPermissions() {
  console.log("Seeding permissions for Competency Assessment modules...");
  const modules = [
    "COMPETENCY_ASSESSMENT",
    "COMPETENCY_IMPORT",
    "COMPETENCY_ALIASES",
    "COMPETENCY_HISTORY"
  ];

  const roles = await prisma.role.findMany();
  console.log("Found roles:", roles.map(r => r.code));

  for (const role of roles) {
    for (const mod of modules) {
      await prisma.permission.upsert({
        where: {
          roleCode_module: {
            roleCode: role.code,
            module: mod
          }
        },
        create: {
          roleCode: role.code,
          module: mod,
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: role.code.includes("ADMIN") || role.code.includes("DBCL")
        },
        update: {
          canRead: true,
          canCreate: true,
          canUpdate: true,
          canDelete: role.code.includes("ADMIN") || role.code.includes("DBCL")
        }
      });
    }
  }

  console.log("Seeded permissions successfully!");
}

seedPermissions().catch(console.error).finally(() => prisma.$disconnect());