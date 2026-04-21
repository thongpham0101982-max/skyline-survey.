"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function dispatchSurveyAction(surveyPeriodId: string, classIds: string[]) {
  const period = await prisma.surveyPeriod.findUnique({
    where: { id: surveyPeriodId }
  })
  if (!period) return { error: "Không tìm thấy đợt khảo sát" }

  const isStudentSurvey = period.targetAudience === "HocSinh" || period.targetAudience === "Hoc sinh"

  // Find all students in selected classes
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
        // For Students: No parent needed
        eligibleCount++
        const exists = await prisma.surveyForm.findFirst({
          where: {
            studentId: student.id,
            surveyPeriodId: surveyPeriodId,
            parentId: null
          }
        })

        if (!exists) {
          await prisma.surveyForm.create({
            data: {
              surveyPeriodId: surveyPeriodId,
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
        // For Parents: Need at least one parent
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
                  surveyPeriodId: surveyPeriodId
                }
              }
            })

            if (!exists) {
              await prisma.surveyForm.create({
                data: {
                  surveyPeriodId: surveyPeriodId,
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
