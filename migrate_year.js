const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const ops = [
    "ALTER TABLE Teacher ADD COLUMN academicYearId TEXT",
    "ALTER TABLE Parent ADD COLUMN academicYearId TEXT"
  ];
  for (const sql of ops) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log("OK:", sql.split(" ").slice(0,5).join(" "));
    } catch(e) {
      console.log("Skip (exists):", sql.split(" ").slice(0,5).join(" "));
    }
  }
  await prisma.$disconnect();
}
main();
