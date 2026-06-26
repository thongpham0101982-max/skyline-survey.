"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function importStudentsAction(classId: string, data: any[]) {
  const cls = await prisma.class.findUnique({ where: { id: classId } })
  if (!cls) return { success: false, error: "Class not found" }

  if (!data || data.length === 0) return { success: false, error: "Dữ liệu trống hoặc không tìm thấy cột phù hợp trong Excel." }

  let count = 0
  let skipped = 0
  let errorMsg = ""

  // 1. Pre-fetch existing students to avoid N+1 lookups inside loop
  const studentCodes = data.map(item => item.studentCode).filter(Boolean)
  const existingStudents = await prisma.student.findMany({
    where: { studentCode: { in: studentCodes } }
  })
  const existingStudentsMap = new Map(existingStudents.map(s => [s.studentCode, s]))

  // 2. Use a transaction block to batch inserts/updates together
  await prisma.$transaction(async (tx) => {
    for (const item of data) {
      try {
        if (!item.studentCode || !item.studentName) {
          skipped++
          continue
        }

        const existing = existingStudentsMap.get(item.studentCode)

        if (existing) {
          await tx.student.update({
            where: { id: existing.id },
            data: {
              studentName: item.studentName,
              gender: item.gender,
              dateOfBirth: item.dateOfBirth ? new Date(item.dateOfBirth) : null,
              classId: cls.id,
              campusId: cls.campusId,
              academicYearId: cls.academicYearId
            }
          })
        } else {
          await tx.student.create({
            data: {
              studentCode: item.studentCode,
              studentName: item.studentName,
              gender: item.gender,
              dateOfBirth: item.dateOfBirth ? new Date(item.dateOfBirth) : null,
              classId: cls.id,
              campusId: cls.campusId,
              academicYearId: cls.academicYearId,
              status: "ACTIVE"
            }
          })
        }
        count++
      } catch(e: any) {
        console.error("Error importing student: ", item, e)
        errorMsg = e.message
        throw e // rollback transaction on individual row failure to ensure consistency
      }
    }
  })
  revalidatePath(`/admin/classes/${classId}`)
  if (count === 0 && data.length > 0) {
    return { success: false, error: "Lỗi lưu dữ liệu: " + (errorMsg || "Không rõ nguyên nhân") + ". Skpped: " + skipped }
  }
  return { success: true, count, skipped }
}

export async function addStudentAction(classId: string, data: any) {
  const cls = await prisma.class.findUnique({ where: { id: classId } })
  if (!cls) return { success: false, error: "Class not found" }
  try {
    await prisma.student.create({
      data: {
        studentCode: data.studentCode,
        studentName: data.studentName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        classId: cls.id,
        campusId: cls.campusId,
        academicYearId: cls.academicYearId,
        status: "ACTIVE"
      }
    })
    revalidatePath(`/admin/classes/${classId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateStudentAction(classId: string, studentId: string, data: any) {
  try {
    await prisma.student.update({
      where: { id: studentId },
      data: {
        studentCode: data.studentCode,
        studentName: data.studentName,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      }
    })
    revalidatePath(`/admin/classes/${classId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteStudentsAction(classId: string, studentIds: string[]) {
  try {
    await prisma.student.deleteMany({
      where: { id: { in: studentIds } }
    })
    revalidatePath(`/admin/classes/${classId}`)
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
export async function assignSurveyToStudentAction(studentId: string, surveyPeriodId: string) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true }
    })
    if (!student) return { success: false, error: "Không tìm thấy học sinh" }

    const period = await prisma.surveyPeriod.findUnique({
      where: { id: surveyPeriodId }
    })
    if (!period) return { success: false, error: "Không tìm thấy đợt khảo sát" }

    const existing = await prisma.surveyForm.findFirst({
      where: {
        studentId: student.id,
        surveyPeriodId: period.id,
        parentId: null
      }
    })
    if (existing) return { success: false, error: "Đã gán đợt khảo sát này cho học sinh." }

    await prisma.surveyForm.create({
      data: {
        surveyPeriodId: period.id,
        studentId: student.id,
        classId: student.classId,
        campusId: student.campusId,
        academicYearId: student.academicYearId || 'AY-2026',
        status: 'PENDING'
      }
    })

    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}


export async function getPaginatedStudentsInClassAction(classId: string, page: number = 1, pageSize: number = 20) {
  try {
    const students = await prisma.student.findMany({
      where: { classId, status: "ACTIVE" },
      orderBy: { studentName: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
    const total = await prisma.student.count({
      where: { classId, status: "ACTIVE" }
    })
    return { success: true, students, total }
  } catch (e: any) {
    return { success: false, students: [], total: 0, error: e.message }
  }
}
