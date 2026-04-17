"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

async function getDefaultCampusId() {
  const campus = await prisma.campus.findFirst()
  if (!campus) {
    const c = await prisma.campus.create({ data: { campusCode: "MAIN", campusName: "Campus Chinh", status: "ACTIVE" } })
    return c.id
  }
  return campus.id
}

/** Tim departmentId theo name (neu truyen string name) hoac lay chinh no neu la id */
async function resolveDepartmentId(value: string | null | undefined): Promise<string | null> {
  if (!value) return null
  const dept = await prisma.department.findFirst({ where: { OR: [{ id: value }, { name: value }], status: "ACTIVE" } })
  return dept?.id || null
}

/** Tim subjectId theo subjectName hoac id */
async function resolveSubjectId(value: string | null | undefined): Promise<string | null> {
  if (!value) return null
  const sub = await prisma.subject.findFirst({ where: { OR: [{ id: value }, { subjectName: value }], status: "ACTIVE" } })
  return sub?.id || null
}

/** Assign a Class as homeroom for a teacher (bidirectional sync) */
async function assignHomeroomClass(teacherId: string, classId: string | null) {
  if (classId) {
    await prisma.$executeRawUnsafe(
      `UPDATE Class SET homeroomTeacherId = NULL WHERE homeroomTeacherId = ?`,
      teacherId
    )
    await prisma.$executeRawUnsafe(
      `UPDATE Class SET homeroomTeacherId = ? WHERE id = ?`,
      teacherId, classId
    )
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { className: true } })
    const className = cls?.className || ""
    await prisma.$executeRawUnsafe(
      `UPDATE Teacher SET homeroomClass = ?, homeroomClassId = ? WHERE id = ?`,
      className, classId, teacherId
    )
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE Class SET homeroomTeacherId = NULL WHERE homeroomTeacherId = ?`,
      teacherId
    )
    await prisma.$executeRawUnsafe(
      `UPDATE Teacher SET homeroomClass = NULL, homeroomClassId = NULL WHERE id = ?`,
      teacherId
    )
  }
}

export async function createTeacherAction(data: any) {
  const campusId = await getDefaultCampusId()
  const hashedPassword = await bcrypt.hash(data.teacherCode, 10)

  const existingUser = await prisma.user.findUnique({ where: { email: data.teacherCode } })
  let userId: string

  if (existingUser) {
    userId = existingUser.id
  } else {
    const user = await prisma.user.create({
      data: { fullName: data.teacherName, email: data.teacherCode, passwordHash: hashedPassword, role: "TEACHER", status: "ACTIVE" }
    })
    userId = user.id
  }

  const existing = await prisma.teacher.findUnique({ where: { teacherCode: data.teacherCode } })
  if (existing) throw new Error("Ma GV da ton tai: " + data.teacherCode)

  // Resolve FK IDs from name values
  const departmentId = await resolveDepartmentId(data.department)
  const mainSubjectId = await resolveSubjectId(data.mainSubject)

  const teacher = await prisma.teacher.create({
    data: {
      userId, teacherCode: data.teacherCode, teacherName: data.teacherName,
      homeroomClass: null, email: data.email || null, phone: data.phone || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      departmentId: departmentId,
      mainSubjectId: mainSubjectId,
      campusId, status: "ACTIVE"
    }
  })

  if (data.homeroomClassId) {
    await assignHomeroomClass(teacher.id, data.homeroomClassId)
  }

  revalidatePath("/admin/teachers")
  revalidatePath("/admin/classes")
  return { success: true }
}

export async function updateTeacherAction(data: any) {
  const { id, teacherName, dateOfBirth } = data

  const updateData: any = {}
  if (teacherName) updateData.teacherName = teacherName
  if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null

  // Resolve FK IDs
  if (data.department !== undefined) {
    updateData.departmentId = await resolveDepartmentId(data.department)
  }
  if (data.mainSubject !== undefined) {
    updateData.mainSubjectId = await resolveSubjectId(data.mainSubject)
  }

  await prisma.teacher.update({ where: { id }, data: updateData })

  if (teacherName) {
    const teacher = await prisma.teacher.findUnique({ where: { id } })
    if (teacher) await prisma.user.update({ where: { id: teacher.userId }, data: { fullName: teacherName } }).catch(() => {})
  }

  revalidatePath("/admin/teachers")
  return { success: true }
}

export async function deleteTeacherAction(id: string) {
  await prisma.$executeRawUnsafe(`UPDATE Class SET homeroomTeacherId = NULL WHERE homeroomTeacherId = ?`, id)
  const teacher = await prisma.teacher.findUnique({ where: { id } })
  if (!teacher) return { success: false }
  await prisma.teacher.delete({ where: { id } })
  await prisma.user.delete({ where: { id: teacher.userId } }).catch(() => {})
  revalidatePath("/admin/teachers")
  revalidatePath("/admin/classes")
  return { success: true }
}

export async function importTeachersAction(rows: any[], academicYearId?: string) {
  const campusId = await getDefaultCampusId()
  let created = 0, skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    if (!row.teacherCode || !row.teacherName) { skipped++; continue }
    try {
      const existing = await prisma.teacher.findUnique({ where: { teacherCode: row.teacherCode } })
      if (existing) { skipped++; continue }

      const hashedPassword = await bcrypt.hash(row.teacherCode, 10)
      const existingUser = await prisma.user.findUnique({ where: { email: row.teacherCode } })
      let userId: string
      if (existingUser) {
        userId = existingUser.id
      } else {
        const user = await prisma.user.create({
          data: { fullName: row.teacherName, email: row.teacherCode, passwordHash: hashedPassword, role: "TEACHER", status: "ACTIVE" }
        })
        userId = user.id
      }

      const departmentId = await resolveDepartmentId(row.department)
      const mainSubjectId = await resolveSubjectId(row.mainSubject)

      const teacher = await prisma.teacher.create({
        data: {
          userId, teacherCode: row.teacherCode, teacherName: row.teacherName,
          email: row.email || null, phone: row.phone || null,
          departmentId, mainSubjectId,
          campusId, status: "ACTIVE"
        }
      })

      if (row.homeroomClass) {
        const matchedClass = await prisma.class.findFirst({
          where: { className: { equals: row.homeroomClass } }
        })
        if (matchedClass) {
          await assignHomeroomClass(teacher.id, matchedClass.id)
        } else {
          await prisma.$executeRawUnsafe(`UPDATE Teacher SET homeroomClass = ? WHERE id = ?`, row.homeroomClass, teacher.id)
        }
      }
      created++
    } catch(e: any) {
      errors.push(row.teacherCode + ": " + e.message)
    }
  }

  revalidatePath("/admin/teachers")
  revalidatePath("/admin/classes")
  return { success: true, created, skipped, errors }
}

export async function resetTeacherPasswordAction(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } })
  if (!teacher) return { success: false }
  const hashedPassword = await bcrypt.hash(teacher.teacherCode, 10)
  await prisma.user.update({ where: { id: teacher.userId }, data: { passwordHash: hashedPassword } })
  return { success: true }
}
