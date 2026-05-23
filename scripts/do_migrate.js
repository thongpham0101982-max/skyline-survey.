// Use prisma client to run raw SQL
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe("ALTER TABLE Teacher ADD COLUMN homeroomClass TEXT");
    console.log("Column added OK");
  } catch(e) {
    if (e.message && e.message.includes("duplicate")) {
      console.log("Column already exists");
    } else {
      console.error("Error:", e.message);
    }
  }
  await prisma.$disconnect();
}

main();
