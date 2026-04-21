"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function dispatchSurveyAction(surveyPeriodId: string, classIds: string[]) {
  try {
    const period = await prisma.surveyPeriod.findUnique({
      where: { id: surveyPeriodId }
    })
    if (!period) return { error: "Không tìm thấy đợt khảo sát" }

    const aud = (period.targetAudience || "").toLowerCase()
    const isStudentSurvey = aud.includes("hocsinh") || aud.includes("hoc sinh")

    // Fetch classes and their students
    const classes = await prisma.class.findMany({
      where: { id: { in: classIds } },
      include: {
        students: {
          include: { 
            parents: { include: { parent: true } } 
          }
        }
      }
    })

    // Fetch all existing forms for this period once to avoid N+1 queries
    const existingForms = await prisma.surveyForm.findMany({
      where: { surveyPeriodId },
      select: { studentId: true, parentId: true }
    })

    const existingStudentIds = new Set(existingForms.filter(f => !f.parentId).map(f => f.studentId))
    const existingParentStudentKeys = new Set(existingForms.filter(f => f.parentId).map(f => `${f.parentId}_${f.studentId}`))

    const formsToCreate: any[] = []
    let missingRequirementCount = 0
    let totalParticipants = 0

    for (const cls of classes) {
      for (const student of cls.students) {
        if (isStudentSurvey) {
          // If student already has a form in this period, skip
          if (existingStudentIds.has(student.id)) continue
          
          formsToCreate.push({
            surveyPeriodId,
            studentId: student.id,
            classId: cls.id,
            campusId: cls.campusId || null,
            academicYearId: cls.academicYearId,
            status: "PENDING",
            parentId: null
          })
          totalParticipants++
        } else {
          // Parent Survey
          if (student.parents.length === 0) {
            missingRequirementCount++
            continue
          }
          
          for (const ps of student.parents) {
            if (ps.parent && ps.parentId) {
              const key = `${ps.parentId}_${student.id}`
              if (existingParentStudentKeys.has(key)) continue
              
              formsToCreate.push({
                surveyPeriodId,
                parentId: ps.parentId,
                studentId: student.id,
                classId: cls.id,
                campusId: cls.campusId || null,
                academicYearId: cls.academicYearId,
                status: "PENDING"
              })
              totalParticipants++
            }
          }
        }
      }
    }

    // Perform bulk insertion
    if (formsToCreate.length > 0) {
      await prisma.surveyForm.createMany({
        data: formsToCreate,
        skipDuplicates: true
      })
      
      // Auto-activate period
      await prisma.surveyPeriod.update({
        where: { id: surveyPeriodId },
        data: { isActive: true }
      })
    }

    revalidatePath("/admin/surveys")
    return { 
      success: true, 
      created: formsToCreate.length,
      classCount: classIds.length,
      totalParticipants: totalParticipants,
      missingRequirementCount
    }
  } catch (err: any) {
    console.error("Dispatch Error:", err)
    return { error: `Lỗi hệ thống: ${err.message}` }
  }
}

export async function revokeSurveyAction(surveyPeriodId: string, classIds: string[]) {
  try {
    const res = await prisma.surveyForm.deleteMany({
      where: {
        surveyPeriodId,
        classId: { in: classIds },
        status: "PENDING" 
      }
    })
    
    revalidatePath("/admin/surveys")
    return { success: true, count: res.count, classCount: classIds.length }
  } catch (err: any) {
    return { error: `Lỗi khi thu hồi: ${err.message}` }
  }
}