"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function getStudentsByClassAction(classId: string, examId: string) {
  if (!classId || !examId) return []

  // Fetch all students in the class
  const students = await prisma.student.findMany({
    where: {
      classId,
      status: "ACTIVE"
    },
    orderBy: {
      studentName: "asc"
    }
  })

  // Fetch registrations in the exam for these students
  const registrations = await prisma.examStudent.findMany({
    where: {
      examId,
      studentId: {
        in: students.map(s => s.id)
      }
    },
    select: {
      studentId: true
    }
  })

  const registeredStudentIds = new Set(registrations.map(r => r.studentId))

  return students.map(s => ({
    id: s.id,
    studentCode: s.studentCode,
    studentName: s.studentName,
    gender: s.gender || "Chưa xác định",
    dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString() : null,
    isRegistered: registeredStudentIds.has(s.id)
  }))
}

export async function registerStudentsAction(examId: string, studentIds: string[]) {
  if (!examId || studentIds.length === 0) return

  // Query existing registrations to avoid duplicates
  const existing = await prisma.examStudent.findMany({
    where: {
      examId,
      studentId: { in: studentIds }
    },
    select: { studentId: true }
  })
  const existingSet = new Set(existing.map(r => r.studentId))
  const newStudentIds = studentIds.filter(id => !existingSet.has(id))

  if (newStudentIds.length > 0) {
    await prisma.examStudent.createMany({
      data: newStudentIds.map(studentId => ({
        examId,
        studentId
      }))
    })
  }
  
  revalidatePath("/admin/ktdbcl/students")
}

export async function deregisterStudentsAction(examId: string, studentIds: string[]) {
  if (!examId || studentIds.length === 0) return

  await prisma.examStudent.deleteMany({
    where: {
      examId,
      studentId: {
        in: studentIds
      }
    }
  })

  revalidatePath("/admin/ktdbcl/students")
}
