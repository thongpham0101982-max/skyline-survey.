const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE Teacher ADD COLUMN homeroomClassId TEXT");
    console.log("homeroomClassId column added");
  } catch(e) {
    console.log("homeroomClassId already exists or error:", e.message.split("\n")[0]);
  }
  await prisma.$disconnect();
}
main();
