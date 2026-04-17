"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function importStudentsAction(classId: string, data: any[]) {
  const cls = await prisma.class.findUnique({ where: { id: classId } })
  if (!cls) throw new Error("Class not found")

  let count = 0
  for (const item of data) {
    try {
      await prisma.student.upsert({
        where: { studentCode: item.studentCode },
        update: {
          studentName: item.studentName,
          gender: item.gender,
          dateOfBirth: item.dateOfBirth
        },
        create: {
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
      count++
    } catch(e) {
      console.error("Error importing student: ", item, e)
    }
  }
  revalidatePath(`/admin/classes/${classId}`)
  return { success: true, count }
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