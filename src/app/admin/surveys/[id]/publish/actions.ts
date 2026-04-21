"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function applyEmergencyDbFix() {
  try {
    const info: any = await prisma.$queryRawUnsafe(`PRAGMA table_info(SurveyForm)`)
    const parentIdCol = info.find((c: any) => c.name === "parentId")
    if (parentIdCol && parentIdCol.notnull === 0) return { success: true, message: "Database đã được sửa từ trước." }

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
    
    return { success: true, message: "✅ Đã sửa xong cấu trúc Database! Bây giờ bạn có thể phát hành." }
  } catch (err: any) {
    console.error("Migration Error:", err)
    return { error: `Không thể sửa tự động: ${err.message}` }
  }
}

export async function dispatchSurveyAction(surveyPeriodId: string, classIds: string[]) {
  try {
    const period = await prisma.surveyPeriod.findUnique({ where: { id: surveyPeriodId } })
    if (!period) return { error: "Không tìm thấy đợt khảo sát" }

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
    const existingParentStudentKeys = new Set(existingForms.filter(f => f.parentId).map(f => `${f.parentId}_${f.studentId}`))

    const formsToCreate: any[] = []
    for (const cls of classes) {
      for (const student of cls.students) {
        if (isStudentSurvey) {
          if (existingStudentIds.has(student.id)) continue
          formsToCreate.push({
            id: `sf_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`, // Manual ID for createMany
            surveyPeriodId,
            studentId: student.id,
            classId: cls.id,
            campusId: cls.campusId,
            academicYearId: cls.academicYearId,
            status: "PENDING",
            parentId: null
          })
        }
      }
    }

    if (formsToCreate.length > 0) {
      try {
        // SQLite doesn't support skipDuplicates in createMany. 
        // We already deduplicated using the 'Set' above.
        await prisma.surveyForm.createMany({ data: formsToCreate })
      } catch (e: any) {
        if (e.message.includes("NOT NULL constraint failed: SurveyForm.parentId")) {
          return { error: "DATABASE_MIGRATION_REQUIRED" }
        }
        throw e
      }
      
      await prisma.surveyPeriod.update({ where: { id: surveyPeriodId }, data: { isActive: true } })
    }

    revalidatePath("/admin/surveys")
    return { 
      success: true, 
      created: formsToCreate.length,
      classCount: classIds.length,
      totalParticipants: formsToCreate.length
    }
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