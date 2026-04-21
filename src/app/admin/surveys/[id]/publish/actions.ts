"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function dispatchSurveyAction(surveyPeriodId: string, classIds: string[]) {
  try {
    const period = await prisma.surveyPeriod.findUnique({ where: { id: surveyPeriodId } })
    if (!period) return { error: "Không tìm thấy đợt khảo sát" }

    const aud = (period.targetAudience || "").toLowerCase()
    const isStudentSurvey = aud.includes("hocsinh") || aud.includes("hoc sinh")

    const classes = await prisma.class.findMany({
      where: { id: { in: classIds } },
      include: {
        students: {
          include: { parents: { include: { parent: true } } }
        }
      }
    })

    const existingForms = await prisma.surveyForm.findMany({
      where: { surveyPeriodId },
      select: { studentId: true, parentId: true }
    })

    const existingStudentIds = new Set(existingForms.filter(f => !f.parentId).map(f => f.studentId))
    const existingParentStudentKeys = new Set(existingForms.filter(f => f.parentId).map(f => `${f.parentId}_${f.studentId}`))

    let successCount = 0
    let errorDetails = ""

    for (const cls of classes) {
      for (const student of cls.students) {
        try {
          if (isStudentSurvey) {
            if (existingStudentIds.has(student.id)) continue
            await prisma.surveyForm.create({
              data: {
                surveyPeriodId,
                studentId: student.id,
                classId: cls.id,
                campusId: cls.campusId,
                academicYearId: cls.academicYearId,
                status: "PENDING",
                parentId: null as any // Bypass strict typing for null if DB requires it
              }
            })
            successCount++
          } else {
            // Parent Survey logic...
            for (const ps of student.parents) {
               const key = `${ps.parentId}_${student.id}`
               if (existingParentStudentKeys.has(key)) continue
               await prisma.surveyForm.create({
                 data: {
                   surveyPeriodId,
                   parentId: ps.parentId,
                   studentId: student.id,
                   classId: cls.id,
                   campusId: cls.campusId,
                   academicYearId: cls.academicYearId,
                   status: "PENDING"
                 }
               })
               successCount++
            }
          }
        } catch (e: any) {
          console.error("Single Insert Error:", e.message)
          errorDetails = e.message
        }
      }
    }

    if (successCount > 0) {
      await prisma.surveyPeriod.update({ where: { id: surveyPeriodId }, data: { isActive: true } })
    }

    revalidatePath("/admin/surveys")
    
    if (successCount === 0 && errorDetails) {
       return { error: `Không thể tạo phiếu. Lỗi database: ${errorDetails}. Có thể do bảng SurveyForm chưa cho phép parentId là NULL.` }
    }

    return { 
      success: true, 
      created: successCount,
      classCount: classIds.length,
      totalParticipants: successCount
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