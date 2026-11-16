"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { getAdminSession } from "@/lib/session"

async function verifyStudentExamPermission(actionType: "create" | "update" | "delete") {
  const session = await getAdminSession()
  if (!session.userId) {
    throw new Error("Vui lòng đăng nhập để thực hiện thao tác này.")
  }
  if (session.isFullAccess) return session

  try {
    const pAny = prisma as any
    if (pAny && pAny.permission) {
      const perms = await pAny.permission.findMany({
        where: {
          roleCode: session.role,
          module: {
            in: ["KTDBCL_EXAM_STUDENTS", "KTDBCL_EXAMS", "KTDBCL", "ADMIN"],
          },
        },
      })
      const hasPerm = perms.some((p: any) => {
        if (actionType === "create") return p.canCreate || p.canUpdate
        if (actionType === "update") return p.canUpdate
        if (actionType === "delete") return p.canDelete || p.canUpdate
        return p.canRead
      })
      if (hasPerm) return session
    }
  } catch (e) {
    console.error("Error checking student exam permissions:", e)
  }

  throw new Error("Forbidden: Bạn không có quyền thực hiện thao tác này.")
}

export async function getStudentsByClassAction(classId: string, examId: string) {
  const session = await getAdminSession()
  if (!session.userId) return []
  if (!classId || !examId) return []

  const students = await prisma.student.findMany({
    where: {
      classId,
      status: "ACTIVE",
    },
    include: {
      class: { select: { className: true, grade: true } },
      campus: { select: { campusName: true } },
    },
    orderBy: {
      studentName: "asc",
    },
  })

  const registrations = await prisma.examStudent.findMany({
    where: {
      examId,
      studentId: {
        in: students.map((s) => s.id),
      },
    },
    select: {
      studentId: true,
    },
  })

  const registeredStudentIds = new Set(registrations.map((r) => r.studentId))

  return students.map((s) => ({
    id: s.id,
    studentCode: s.studentCode,
    studentName: s.studentName,
    gender: s.gender || "Chưa xác định",
    dateOfBirth: s.dateOfBirth ? s.dateOfBirth.toISOString() : null,
    isRegistered: registeredStudentIds.has(s.id),
    classId: s.classId,
    className: s.class?.className || "—",
    campusId: s.campusId,
    campusName: s.campus?.campusName || "—",
    grade: s.class?.grade || "—",
    studentType: s.studentType || "CHINH_KHOA",
    studentTypeNote: s.studentTypeNote || "",
  }))
}

export async function registerStudentsAction(examId: string, studentIds: string[]) {
  await verifyStudentExamPermission("create")
  if (!examId || studentIds.length === 0) return { added: 0 }

  const existing = await prisma.examStudent.findMany({
    where: {
      examId,
      studentId: { in: studentIds },
    },
    select: { studentId: true },
  })
  const existingSet = new Set(existing.map((r) => r.studentId))
  const newStudentIds = studentIds.filter((id) => !existingSet.has(id))

  if (newStudentIds.length > 0) {
    await prisma.examStudent.createMany({
      data: newStudentIds.map((studentId) => ({
        examId,
        studentId,
      })),
    })
  }

  revalidatePath("/admin/ktdbcl/students")
  revalidatePath("/admin/ktdbcl/results")
  revalidatePath("/admin/ktdbcl/exams")
  return { added: newStudentIds.length }
}

export async function registerStudentsByCodesAction(examId: string, rawCodes: string[]) {
  await verifyStudentExamPermission("create")
  if (!examId || !rawCodes || rawCodes.length === 0) {
    return { added: 0, matched: 0, notFound: [] as string[] }
  }

  const cleanedCodes = Array.from(
    new Set(
      rawCodes
        .map((c) => String(c || "").trim())
        .filter(Boolean)
    )
  )

  if (cleanedCodes.length === 0) {
    return { added: 0, matched: 0, notFound: [] as string[] }
  }

  const foundStudents = await prisma.student.findMany({
    where: {
      studentCode: { in: cleanedCodes },
    },
    select: { id: true, studentCode: true },
  })

  const foundCodeSet = new Set(foundStudents.map((s) => s.studentCode.toUpperCase()))
  const notFound = cleanedCodes.filter((c) => !foundCodeSet.has(c.toUpperCase()))

  let added = 0
  if (foundStudents.length > 0) {
    const res = await registerStudentsAction(
      examId,
      foundStudents.map((s) => s.id)
    )
    added = res?.added || 0
  }

  return {
    added,
    matched: foundStudents.length,
    notFound,
  }
}

export async function deregisterStudentsAction(examId: string, studentIds: string[]) {
  await verifyStudentExamPermission("delete")
  if (!examId || studentIds.length === 0) return

  await prisma.examStudent.deleteMany({
    where: {
      examId,
      studentId: {
        in: studentIds,
      },
    },
  })

  revalidatePath("/admin/ktdbcl/students")
  revalidatePath("/admin/ktdbcl/results")
  revalidatePath("/admin/ktdbcl/exams")
}

export async function getAllRegisteredStudentsAction(examId: string) {
  const session = await getAdminSession()
  if (!session.userId) return []
  if (!examId) return []

  const registrations = await prisma.examStudent.findMany({
    where: { examId },
    include: {
      student: {
        include: {
          class: true,
          campus: true,
        },
      },
    },
    orderBy: {
      student: {
        studentName: "asc",
      },
    },
  })

  const seenStudentIds = new Set<string>()
  return registrations
    .filter((r) => {
      if (!r.student) return false
      if (seenStudentIds.has(r.student.id)) return false
      seenStudentIds.add(r.student.id)
      return true
    })
    .map((r) => ({
      id: r.student.id,
      studentCode: r.student.studentCode,
      studentName: r.student.studentName,
      gender: r.student.gender || "Chưa xác định",
      dateOfBirth: r.student.dateOfBirth ? r.student.dateOfBirth.toISOString() : null,
      isRegistered: true,
      classId: r.student.classId,
      className: r.student.class?.className || "—",
      campusId: r.student.campusId,
      campusName: r.student.campus?.campusName || "—",
      grade: r.student.class?.grade || "—",
      studentType: r.student.studentType || "CHINH_KHOA",
      studentTypeNote: r.student.studentTypeNote || "",
    }))
}
