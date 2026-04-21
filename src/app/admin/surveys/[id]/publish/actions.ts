"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function dispatchSurveyAction(surveyPeriodId: string, classIds: string[]) {
  const period = await prisma.surveyPeriod.findUnique({
    where: { id: surveyPeriodId }
  })
  if (!period) return { error: "Không tìm thấy đợt khảo sát" }

  const isStudentSurvey = period.targetAudience === "HocSinh" || period.targetAudience === "Hoc sinh"

  const classes = await prisma.class.findMany({
    where: { id: { in: classIds } },
    include: {
      students: {
        include: { parents: { include: { parent: true } } }
      }
    }
  })

  let created = 0
  let alreadyExisted = 0
  let totalStudents = 0
  let eligibleCount = 0
  let missingRequirementCount = 0
  
  for (const cls of classes) {
    for (const student of cls.students) {
      totalStudents++
      
      if (isStudentSurvey) {
        eligibleCount++
        const exists = await prisma.surveyForm.findFirst({
          where: { studentId: student.id, surveyPeriodId, parentId: null }
        })

        if (!exists) {
          await prisma.surveyForm.create({
            data: {
              surveyPeriodId,
              studentId: student.id,
              classId: cls.id,
              campusId: cls.campusId,
              academicYearId: cls.academicYearId,
              status: "PENDING",
              parentId: null
            }
          })
          created++
        } else {
          alreadyExisted++
        }
      } else {
        if (student.parents.length === 0) {
          missingRequirementCount++
          continue
        }
        eligibleCount++
        for (const ps of student.parents) {
          if (ps.parent && ps.parentId) {
            const exists = await prisma.surveyForm.findUnique({
              where: {
                parentId_studentId_surveyPeriodId: {
                  parentId: ps.parentId,
                  studentId: student.id,
                  surveyPeriodId
                }
              }
            })

            if (!exists) {
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
              created++
            } else {
              alreadyExisted++
            }
          }
        }
      }
    }
  }

  await prisma.surveyPeriod.update({
    where: { id: surveyPeriodId },
    data: { isActive: true }
  })

  revalidatePath("/admin/surveys")
  return { 
    success: true, 
    created, 
    alreadyExisted, 
    totalStudents,
    eligibleCount,
    missingRequirementCount,
    isStudentSurvey
  }
}

export async function revokeSurveyAction(surveyPeriodId: string, classIds: string[]) {
  const res = await prisma.surveyForm.deleteMany({
    where: {
      surveyPeriodId,
      classId: { in: classIds },
      status: "PENDING" // Only revoke if not yet started/completed
    }
  })
  
  revalidatePath("/admin/surveys")
  return { success: true, count: res.count }
}
