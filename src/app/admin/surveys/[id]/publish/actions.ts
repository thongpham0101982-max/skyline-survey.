"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function applyEmergencyDbFix() {
  try {
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "SurveyForm_backup" AS SELECT * FROM "SurveyForm"`)
    await prisma.$executeRawUnsafe(`DROP TABLE "SurveyForm"`)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE "SurveyForm" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "surveyPeriodId" TEXT NOT NULL,
        "parentId" TEXT,
        "studentId" TEXT NOT NULL,
        "classId" TEXT NOT NULL,
        "campusId" TEXT NOT NULL,
        "academicYearId" TEXT NOT NULL,
        "submissionDateTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "submittedByEmail" TEXT,
        "overallAverageScore" REAL,
        "npsScoreRaw" INTEGER,
        "npsCategory" TEXT,
        "status" TEXT NOT NULL DEFAULT 'DRAFT'
      )
    `)
    await prisma.$executeRawUnsafe(`INSERT INTO "SurveyForm" SELECT * FROM "SurveyForm_backup"`)
    await prisma.$executeRawUnsafe(`DROP TABLE "SurveyForm_backup"`)
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "SurveyForm_parentId_studentId_surveyPeriodId_key" ON "SurveyForm"("parentId", "studentId", "surveyPeriodId")`)
    return { success: true, message: "✅ Database đã được cập nhật thành công!" }
  } catch (err: any) {
    return { error: `Lỗi Migrator: ${err.message}` }
  }
}

export async function dispatchSurveyAction(surveyPeriodId: string, classIds: string[]) {
  try {
    const period = await prisma.surveyPeriod.findUnique({ where: { id: surveyPeriodId } })
    if (!period) return { error: "Không tìm thấy đợt khảo sát" }

    // CRITICAL: Ensure AY-2026 exists to prevent Foreign Key errors
    await prisma.academicYear.upsert({
       where: { id: "AY-2026" },
       update: {},
       create: { id: "AY-2026", name: "2025-2026", startDate: new Date("2025-01-01"), endDate: new Date("2026-12-31") }
    })

    const aud = (period.targetAudience || "").toLowerCase()
    const isStudentSurvey = aud.includes("hocsinh") || aud.includes("hoc sinh")

    const classes = await prisma.class.findMany({
      where: { id: { in: classIds } },
      include: { students: true }
    })

    const existingForms = await prisma.surveyForm.findMany({
      where: { surveyPeriodId },
      select: { studentId: true, parentId: true }
    })

    const existingStudentIds = new Set(existingForms.filter(f => !f.parentId).map(f => f.studentId))

    let createdCount = 0
    let skippedCount = 0
    let samples: any[] = []

    for (const cls of classes) {
      for (const student of cls.students) {
        if (isStudentSurvey) {
          if (existingStudentIds.has(student.id)) {
            skippedCount++
            continue
          }
          
          samples.push({
            id: `sf_${Math.random().toString(36).substr(2, 9)}_${Date.now()}_${createdCount}`,
            surveyPeriodId,
            studentId: student.id,
            classId: cls.id,
            campusId: cls.campusId,
            academicYearId: cls.academicYearId || "AY-2026", // Fallback to avoid FK error
            status: "PENDING",
            parentId: null
          })
          createdCount++
        }
      }
    }

    if (samples.length > 0) {
      try {
        const batchSize = 50
        for (let i = 0; i < samples.length; i += batchSize) {
          const batch = samples.slice(i, i + batchSize)
          await prisma.surveyForm.createMany({ data: batch })
        }
      } catch (e: any) {
        if (e.message.includes("NOT NULL constraint failed")) return { error: "DATABASE_MIGRATION_REQUIRED" }
        return { error: `Lỗi Database: ${e.message}` }
      }
      await prisma.surveyPeriod.update({ where: { id: surveyPeriodId }, data: { isActive: true } })
    }

    revalidatePath("/admin/surveys")
    return { success: true, created: createdCount, skipped: skippedCount, classCount: classIds.length, totalParticipants: createdCount }
  } catch (err: any) {
    return { error: `Lỗi hệ thống: ${err.message}` }
  }
}

export async function revokeSurveyAction(surveyPeriodId: string, classIds: string[]) {
  try {
    const res = await prisma.surveyForm.deleteMany({
      where: { surveyPeriodId, classId: { in: classIds }, status: "PENDING" }
    })
    revalidatePath("/admin/surveys")
    return { success: true, count: res.count, classCount: classIds.length }
  } catch (err: any) {
    return { error: `Lỗi khi thu hồi: ${err.message}` }
  }
}