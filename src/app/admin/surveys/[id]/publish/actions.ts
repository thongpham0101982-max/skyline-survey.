"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function dispatchSurveyAction(surveyPeriodId: string, classIds: string[]) {
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
  let studentsWithParents = 0
  let studentsWithoutParents = 0
  
  for (const cls of classes) {
    for (const student of cls.students) {
      totalStudents++
      if (student.parents.length === 0) {
        studentsWithoutParents++
        continue
      }
      studentsWithParents++
      for (const ps of student.parents) {
        if (ps.parent && ps.parentId) {
          // Check if already dispatched
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

  // Also mark the survey period as active
  await prisma.surveyPeriod.update({
    where: { id: surveyPeriodId },
    data: { isActive: true }
  })

  revalidatePath('/admin/surveys')

  return { 
    success: true, 
    created, 
    alreadyExisted, 
    totalStudents,
    studentsWithParents,
    studentsWithoutParents
  }
}
