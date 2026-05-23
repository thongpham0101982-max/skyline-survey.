const { PrismaClient } = require("@prisma/client")
const prisma = new PrismaClient()
async function main() {
  try {
    console.log("Applying manual migrations to Turso...")
    // Add campusId to SurveyPeriod
    try {
       await prisma.$executeRawUnsafe("ALTER TABLE SurveyPeriod ADD COLUMN campusId TEXT")
       console.log("Added campusId to SurveyPeriod")
    } catch(e) { console.log("campusId already exists or error:", e.message) }
    
    // Add targetAudience if missing (though it seems present in my local check, better safe)
    try {
       await prisma.$executeRawUnsafe("ALTER TABLE SurveyPeriod ADD COLUMN targetAudience TEXT DEFAULT 'PHHS'")
       console.log("Ensured targetAudience exists")
    } catch(e) { console.log("targetAudience already exists or error:", e.message) }

  } catch(e) {
    console.error("MIGRATION_ERROR:", e.message)
  } finally {
    await prisma.$disconnect()
    process.exit(0)
  }
}
main()
