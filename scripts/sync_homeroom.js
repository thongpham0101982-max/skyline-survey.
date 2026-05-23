const fs = require("fs");

// ===== teachers/actions.ts - sync homeroomClass with Class model =====
const teacherActions = `"use server"
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

async function getActiveYearId() {
  const year = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } })
  return year?.id || null
}

/** Assign a Class as homeroom for a teacher (bidirectional sync) */
async function assignHomeroomClass(teacherId: string, classId: string | null) {
  // Clear previous homeroom assignment for this teacher
  if (classId) {
    // Remove old homeroomTeacherId from any class that had this teacher
    await prisma.$executeRawUnsafe(
      \`UPDATE Class SET homeroomTeacherId = NULL WHERE homeroomTeacherId = ?\`,
      teacherId
    )
    // Set new class's homeroomTeacherId
    await prisma.$executeRawUnsafe(
      \`UPDATE Class SET homeroomTeacherId = ? WHERE id = ?\`,
      teacherId, classId
    )
    // Get class name for homeroomClass field
    const cls = await prisma.class.findUnique({ where: { id: classId }, select: { className: true } })
    const className = cls?.className || ""
    // Update teacher's homeroomClass text and academicYearId link
    await prisma.$executeRawUnsafe(
      \`UPDATE Teacher SET homeroomClass = ?, homeroomClassId = ? WHERE id = ?\`,
      className, classId, teacherId
    )
  } else {
    // Remove assignment
    await prisma.$executeRawUnsafe(
      \`UPDATE Class SET homeroomTeacherId = NULL WHERE homeroomTeacherId = ?\`,
      teacherId
    )
    await prisma.$executeRawUnsafe(
      \`UPDATE Teacher SET homeroomClass = NULL, homeroomClassId = NULL WHERE id = ?\`,
      teacherId
    )
  }
}

export async function createTeacherAction(data: any) {
  const campusId = await getDefaultCampusId()
  const academicYearId = data.academicYearId || await getActiveYearId()
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
  if (existing) throw new Error("Ma SKL da ton tai: " + data.teacherCode)

  const teacher = await prisma.teacher.create({
    data: {
      userId, teacherCode: data.teacherCode, teacherName: data.teacherName,
      homeroomClass: null, email: data.email || null,
      phone: data.phone || null, campusId, status: "ACTIVE"
    }
  })

  // Set academic year
  if (academicYearId) {
    await prisma.$executeRawUnsafe(\`UPDATE Teacher SET academicYearId = ? WHERE id = ?\`, academicYearId, teacher.id)
  }

  // Assign homeroom class (bidirectional)
  if (data.homeroomClassId) {
    await assignHomeroomClass(teacher.id, data.homeroomClassId)
  }

  revalidatePath("/admin/teachers")
  revalidatePath("/admin/classes")
  return { success: true }
}

export async function updateTeacherAction(data: any) {
  const { id, academicYearId, homeroomClassId, ...rest } = data
  // Remove homeroomClass from rest (we handle it separately)
  delete rest.homeroomClass
  
  await prisma.teacher.update({ where: { id }, data: rest })
  if (rest.teacherName) {
    const t = await prisma.teacher.findUnique({ where: { id } })
    if (t) await prisma.user.update({ where: { id: t.userId }, data: { fullName: rest.teacherName } })
  }
  if (academicYearId !== undefined) {
    await prisma.$executeRawUnsafe(\`UPDATE Teacher SET academicYearId = ? WHERE id = ?\`, academicYearId || null, id)
  }
  // Sync homeroom class bidirectionally
  if (homeroomClassId !== undefined) {
    await assignHomeroomClass(id, homeroomClassId || null)
  }

  revalidatePath("/admin/teachers")
  revalidatePath("/admin/classes")
  return { success: true }
}

export async function deleteTeacherAction(id: string) {
  // Remove homeroom assignment first
  await prisma.$executeRawUnsafe(\`UPDATE Class SET homeroomTeacherId = NULL WHERE homeroomTeacherId = ?\`, id)
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
  const yearId = academicYearId || await getActiveYearId()
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

      const teacher = await prisma.teacher.create({
        data: { userId, teacherCode: row.teacherCode, teacherName: row.teacherName, email: row.email || null, phone: row.phone || null, campusId, status: "ACTIVE" }
      })
      
      if (yearId) await prisma.$executeRawUnsafe(\`UPDATE Teacher SET academicYearId = ? WHERE id = ?\`, yearId, teacher.id)

      // Try to match homeroomClass from import to actual class
      if (row.homeroomClass) {
        const matchedClass = await prisma.class.findFirst({
          where: { className: { equals: row.homeroomClass } }
        })
        if (matchedClass) {
          await assignHomeroomClass(teacher.id, matchedClass.id)
        } else {
          // Store as plain text if no match
          await prisma.$executeRawUnsafe(\`UPDATE Teacher SET homeroomClass = ? WHERE id = ?\`, row.homeroomClass, teacher.id)
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
`;
fs.writeFileSync("src/app/admin/teachers/actions.ts", teacherActions, "utf8");
console.log("teachers/actions.ts synced with Class");
