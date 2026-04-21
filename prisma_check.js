const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
async function main() {
  try {
    const cols = await prisma.$queryRawUnsafe("PRAGMA table_info(SurveyPeriod)")
    // Support BigInt serialization
    console.log("SURVEY_COLUMNS:", JSON.stringify(cols, (key, value) => 
      typeof value === "bigint" ? value.toString() : value
    ))
  } catch(e) {
    console.error("DB_ERROR:", e.message)
  } finally {
    await prisma.$disconnect()
    process.exit(0)
  }
}
main()
