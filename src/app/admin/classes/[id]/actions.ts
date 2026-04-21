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

  for (const item of data) {
    try {
      if (!item.studentCode || !item.studentName) {
        skipped++
        continue
      }

      const existing = await prisma.student.findFirst({
        where: { studentCode: item.studentCode }
      })

      if (existing) {
        await prisma.student.update({
          where: { id: existing.id },
          data: {
            studentName: item.studentName,
            gender: item.gender,
            dateOfBirth: item.dateOfBirth,
            classId: cls.id,
            campusId: cls.campusId,
            academicYearId: cls.academicYearId
          }
        })
      } else {
        await prisma.student.create({
          data: {
            studentCode: item.studentCode,
            studentName: item.studentName,
            gender: item.gender,
            dateOfBirth: item.dateOfBirth,
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
    }
  }
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