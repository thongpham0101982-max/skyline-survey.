"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getSurveyPeriodTrackingAction(periodId: string) {
  if (!periodId) return null

  // Fetch all forms for this period
  const forms = await prisma.surveyForm.findMany({
    where: { surveyPeriodId: periodId },
    include: {
      student: true,
      parent: {
        include: { user: true }
      },
      class: {
        include: {
          campus: true,
        }
      }
    }
  })

  const rawClasses = await prisma.class.findMany({
    where: { id: { in: forms.map(f => f.classId) } },
    include: {
      campus: true,
      teachers: {
        include: { teacher: true }
      }
    }
  })

  // Group forms by Class ID
  const classMap = rawClasses.reduce((acc: any, cls: any) => {
    const homeroom = cls.teachers.find((t: any) => t.roleInClass === 'GVCN')?.teacher?.teacherName || "Chưa phân công"
    const subjectTeachers = cls.teachers.filter((t: any) => t.roleInClass !== 'GVCN').map((t: any) => t.teacher?.teacherName).join(", ") || "Chưa cập nhật GVBM"
    
    acc[cls.id] = { ...cls, homeroom, subjectTeachers }
    return acc
  }, {})

  const grouped = forms.reduce((acc: any, form: any) => {
    if (!acc[form.classId]) {
      acc[form.classId] = {
        classInfo: classMap[form.classId],
        forms: [],
        total: 0,
        completed: 0,
        pending: 0
      }
    }
    
    acc[form.classId].forms.push(form)
    acc[form.classId].total++
    if (form.status === "COMPLETED" || form.status === "SUBMITTED") acc[form.classId].completed++
    else acc[form.classId].pending++
    
    return acc
  }, {})

  return Object.values(grouped).sort((a: any, b: any) => a.classInfo?.className?.localeCompare(b.classInfo?.className))
}

export async function sendClassReminderAction(classId: string, surveyPeriodId: string) {
  const pendingForms = await prisma.surveyForm.findMany({
    where: { classId, surveyPeriodId, status: { notIn: ["COMPLETED", "SUBMITTED"] } },
    include: {
      student: true,
      parent: true,
      surveyPeriod: true
    }
  })

  if (pendingForms.length === 0) return { success: true, count: 0, msg: "Tất cả phụ huynh đã hoàn thành." }

  let notifiedParents = 0

  for (const form of pendingForms) {
    if (form.parent?.userId) {
      await prisma.notification.create({
        data: {
          userId: form.parent.userId,
          title: "Lời nhắc: Hoàn thành khảo sát",
          message: `Kính gửi Phụ huynh, phiếu khảo sát đánh giá "${form.surveyPeriod?.name}" cho học sinh ${form.student?.studentName} vẫn đang trong trạng thái chưa hoàn thành. Quý vị vui lòng dành ít phút thực hiện.`
        }
      })
      notifiedParents++
    }
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      teachers: {
        include: { teacher: true }
      }
    }
  })

  let gvcnNotified = false
  const gvcn = cls?.teachers.find(t => t.roleInClass === 'GVCN')
  if (gvcn?.teacher?.userId) {
     await prisma.notification.create({
        data: {
          userId: gvcn.teacher.userId,
          title: "Hệ thống cập nhật tiến độ Survey",
          message: `Lớp ${cls?.className} hiện còn ${pendingForms.length} phụ huynh chưa làm khảo sát. Thầy/Cô vui lòng đôn đốc học sinh nhắc nhở ba mẹ nhé.`
        }
     })
     gvcnNotified = true
  }

  return { success: true, parents: notifiedParents, gvcn: gvcnNotified }
}

export async function resetSurveyFormAction(formId: string) {
  try {
    await prisma.surveyResponse.deleteMany({
      where: { formId }
    })

    await prisma.surveyForm.update({
      where: { id: formId },
      data: {
        status: "DRAFT",
        submissionDateTime: new Date(),
        submittedByEmail: null,
        overallAverageScore: null,
        npsScoreRaw: null,
        npsCategory: null
      }
    })

    revalidatePath("/admin/reports")
    return { success: true }
  } catch (error: any) {
    console.error("Reset Error:", error)
    return { success: false, error: error.message }
  }
}

export async function getFormResponsesAction(formId: string) {
  try {
    const responses = await prisma.surveyResponse.findMany({
      where: { formId },
      include: {
        question: {
          include: { section: true }
        }
      },
      orderBy: [{ question: { sectionId: "asc" } }, { question: { sortOrder: "asc" } }]
    })
    const form = await prisma.surveyForm.findUnique({
      where: { id: formId },
      include: { student: true, parent: true }
    })
    return { responses, form }
  } catch (e: any) {
    return { responses: [], form: null }
  }
}

export async function deleteMultipleFormResponsesAction(formIds: string[]) {
  try {
    await prisma.surveyResponse.deleteMany({ where: { formId: { in: formIds } } })
    await prisma.surveyForm.updateMany({
      where: { id: { in: formIds } },
      data: {
        status: "DRAFT",
        submittedByEmail: null,
        overallAverageScore: null,
        npsScoreRaw: null,
        npsCategory: null
      }
    })
    revalidatePath("/admin/reports")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
export async function deleteSurveyFormAction(formId: string) {
  try {
    // Delete all responses first (cascade)
    await prisma.surveyResponse.deleteMany({ where: { formId } })
    // Delete the form itself
    await prisma.surveyForm.delete({ where: { id: formId } })
    revalidatePath('/admin/reports')
    return { success: true }
  } catch (error: any) {
    console.error('Delete Form Error:', error)
    return { success: false, error: error.message }
  }
}
export async function deleteSurveyFormsByClassAction(classId: string) {
  try {
    // Find all forms for the class
    const forms = await prisma.surveyForm.findMany({ where: { classId }, select: { id: true } })
    const formIds = forms.map(f => f.id)
    if (formIds.length > 0) {
      // Delete responses
      await prisma.surveyResponse.deleteMany({ where: { formId: { in: formIds } } })
      // Delete forms
      await prisma.surveyForm.deleteMany({ where: { id: { in: formIds } } })
    }
    revalidatePath('/admin/reports')
    return { success: true, deletedCount: formIds.length }
  } catch (error: any) {
    console.error('Delete Forms By Class Error:', error)
    return { success: false, error: error.message }
  }
}
export async function getAllClassesAction() {
  const classes = await prisma.class.findMany({
    select: { id: true, className: true }
  })
  return classes
}

export async function addSurveyFormsForClassAction(classId: string, periodId: string) {
  try {
    // Get students in class
    const students = await prisma.student.findMany({ where: { classId } })
    // For each student, find parent link
    const parentLinks = await prisma.parentStudentLink.findMany({
      where: { studentId: { in: students.map(s => s.id) } },
      include: { parent: true }
    })
    const parentMap = new Map(parentLinks.map(pl => [pl.studentId, pl.parent.id]))
    // Create survey forms (draft) for each student with a parent
    const createOps = []
    for (const student of students) {
      const parentId = parentMap.get(student.id)
      if (!parentId) continue // skip if no parent
      createOps.push(prisma.surveyForm.create({
        data: {
          surveyPeriodId: periodId,
          parentId,
          studentId: student.id,
          classId,
          campusId: student.campusId,
          academicYearId: student.academicYearId,
          status: "DRAFT"
        }
      }))
    }
    await Promise.all(createOps)
    revalidatePath('/admin/reports')
    return { success: true, created: createOps.length }
  } catch (error: any) {
    console.error('Add Survey Forms Error:', error)
    return { success: false, error: error.message }
  }
}
export async function getAllCampusesAction() {
  const campuses = await prisma.campus.findMany({ select: { id: true, campusName: true } })
  return campuses
}

export async function getAcademicLevelsAction() {
  const levels = await prisma.class.groupBy({ by: ['level'] })
  return levels.map(l => l.level)
}

// Get students in a class that do NOT yet have a form in this survey period
export async function getStudentsNotInSurveyAction(classId: string, periodId: string) {
  const existingForms = await prisma.surveyForm.findMany({
    where: { classId, surveyPeriodId: periodId },
    select: { studentId: true }
  })
  const assignedStudentIds = existingForms.map(f => f.studentId)

  const students = await prisma.student.findMany({
    where: {
      classId,
      id: { notIn: assignedStudentIds }
    },
    include: {
      parents: {
        include: { parent: true }
      }
    }
  })
  return students
}

// Add multiple students to a survey period (create draft forms)
export async function addStudentsToSurveyAction(studentIds: string[], periodId: string) {
  try {
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
      include: {
        parents: {
          include: { parent: true }
        }
      }
    })

    const createOps = []
    for (const student of students) {
      const parentId = student.parents[0]?.parent.id
      if (!parentId) continue
      createOps.push(
        prisma.surveyForm.upsert({
          where: { parentId_studentId_surveyPeriodId: { parentId, studentId: student.id, surveyPeriodId: periodId } },
          create: {
            surveyPeriodId: periodId,
            parentId,
            studentId: student.id,
            classId: student.classId,
            campusId: student.campusId,
            academicYearId: student.academicYearId,
            status: 'DRAFT'
          },
          update: {}
        })
      )
    }
    await Promise.all(createOps)
    revalidatePath('/admin/reports')
    return { success: true, created: createOps.length }
  } catch (error: any) {
    console.error('Add Students Error:', error)
    return { success: false, error: error.message }
  }
}

// Fully delete multiple survey forms (and their responses)
export async function deleteMultipleSurveyFormsAction(formIds: string[]) {
  try {
    await prisma.surveyResponse.deleteMany({ where: { formId: { in: formIds } } })
    await prisma.surveyForm.deleteMany({ where: { id: { in: formIds } } })
    revalidatePath('/admin/reports')
    return { success: true }
  } catch (error: any) {
    console.error('Delete Forms Error:', error)
    return { success: false, error: error.message }
  }
}