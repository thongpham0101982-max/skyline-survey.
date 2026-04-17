const fs = require("fs");

// ============================================================
// 3. Update teachers/actions.ts - include academicYearId
// ============================================================
const teacherActions = `"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

async function getDefaultCampusId() {
  const campus = await prisma.campus.findFirst()
  if (!campus) {
    const newCampus = await prisma.campus.create({
      data: { campusCode: "MAIN", campusName: "Campus Chinh", status: "ACTIVE" }
    })
    return newCampus.id
  }
  return campus.id
}

async function getActiveYearId() {
  const year = await prisma.academicYear.findFirst({ where: { status: "ACTIVE" }, orderBy: { startDate: "desc" } })
  return year?.id || null
}

export async function createTeacherAction(data) {
  const campusId = await getDefaultCampusId()
  const academicYearId = data.academicYearId || await getActiveYearId()
  const hashedPassword = await bcrypt.hash(data.teacherCode, 10)

  const existingUser = await prisma.user.findUnique({ where: { email: data.teacherCode } })
  let userId

  if (existingUser) {
    userId = existingUser.id
  } else {
    const user = await prisma.user.create({
      data: {
        fullName: data.teacherName,
        email: data.teacherCode,
        passwordHash: hashedPassword,
        role: "TEACHER",
        status: "ACTIVE"
      }
    })
    userId = user.id
  }

  const existingTeacher = await prisma.teacher.findUnique({ where: { teacherCode: data.teacherCode } })
  if (existingTeacher) throw new Error("Ma SKL da ton tai: " + data.teacherCode)

  await prisma.teacher.create({
    data: {
      userId,
      teacherCode: data.teacherCode,
      teacherName: data.teacherName,
      homeroomClass: data.homeroomClass || null,
      email: data.email || null,
      phone: data.phone || null,
      campusId,
      academicYearId,
      status: "ACTIVE"
    }
  })

  revalidatePath("/admin/teachers")
  return { success: true }
}

export async function updateTeacherAction(data) {
  const { id, ...rest } = data
  const teacher = await prisma.teacher.update({
    where: { id },
    data: rest,
    include: { user: true }
  })
  if (rest.teacherName) {
    await prisma.user.update({ where: { id: teacher.userId }, data: { fullName: rest.teacherName } })
  }
  revalidatePath("/admin/teachers")
  return { success: true }
}

export async function deleteTeacherAction(id) {
  const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } })
  if (!teacher) return { success: false }
  await prisma.teacher.delete({ where: { id } })
  await prisma.user.delete({ where: { id: teacher.userId } }).catch(() => {})
  revalidatePath("/admin/teachers")
  return { success: true }
}

export async function importTeachersAction(rows, academicYearId) {
  const campusId = await getDefaultCampusId()
  const yearId = academicYearId || await getActiveYearId()
  let created = 0, skipped = 0
  const errors = []

  for (const row of rows) {
    if (!row.teacherCode || !row.teacherName) { skipped++; continue }
    try {
      const existing = await prisma.teacher.findUnique({ where: { teacherCode: row.teacherCode } })
      if (existing) { skipped++; continue }

      const hashedPassword = await bcrypt.hash(row.teacherCode, 10)
      const existingUser = await prisma.user.findUnique({ where: { email: row.teacherCode } })
      let userId
      if (existingUser) {
        userId = existingUser.id
      } else {
        const user = await prisma.user.create({
          data: { fullName: row.teacherName, email: row.teacherCode, passwordHash: hashedPassword, role: "TEACHER", status: "ACTIVE" }
        })
        userId = user.id
      }

      await prisma.teacher.create({
        data: {
          userId,
          teacherCode: row.teacherCode,
          teacherName: row.teacherName,
          homeroomClass: row.homeroomClass || null,
          email: row.email || null,
          phone: row.phone || null,
          campusId,
          academicYearId: yearId,
          status: "ACTIVE"
        }
      })
      created++
    } catch(e) {
      errors.push(row.teacherCode + ": " + e.message)
    }
  }

  revalidatePath("/admin/teachers")
  return { success: true, created, skipped, errors }
}

export async function resetTeacherPasswordAction(teacherId) {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } })
  if (!teacher) return { success: false }
  const hashedPassword = await bcrypt.hash(teacher.teacherCode, 10)
  await prisma.user.update({ where: { id: teacher.userId }, data: { passwordHash: hashedPassword } })
  return { success: true }
}
`;
fs.writeFileSync("src/app/admin/teachers/actions.ts", teacherActions, "utf8");
console.log("teachers/actions.ts updated");

// ============================================================
// 4. Update teachers/page.tsx - pass years to client
// ============================================================
const teacherPage = `import { prisma } from "@/lib/db"
import { TeacherManagerClient } from "./client"

export const metadata = { title: "Quan ly Giao vien | Admin Portal" }

export default async function TeacherManagerPage() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true }
  })
  const activeYearId = years.find(y => y.status === "ACTIVE")?.id || years[0]?.id || null

  const teachers = await prisma.teacher.findMany({
    orderBy: { teacherName: "asc" },
    include: {
      user: { select: { email: true, status: true } },
      academicYear: { select: { id: true, name: true } }
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quan ly Giao vien</h1>
        <p className="text-slate-500 mt-2 text-sm">Them, chinh sua thong tin giao vien theo Tung Nam hoc, quan ly Lop CN va tai khoan dang nhap.</p>
      </div>
      <TeacherManagerClient initialTeachers={teachers} years={years} defaultYearId={activeYearId} />
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/teachers/page.tsx", teacherPage, "utf8");
console.log("teachers/page.tsx updated");

// ============================================================
// 5. Update parents/page.tsx - pass years to client
// ============================================================
const parentsPage = `import { prisma } from "@/lib/db"
import { ParentAccountsClient } from "./client"

export default async function ParentAccountsPage() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true }
  })
  const activeYearId = years.find(y => y.status === "ACTIVE")?.id || years[0]?.id || null

  const classes = await prisma.class.findMany({
    include: { campus: true, academicYear: { select: { id: true, name: true } } },
    orderBy: [{ academicYear: { startDate: "desc" } }, { className: "asc" }]
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Danh Muc Tai Khoan PHHS</h1>
        <p className="text-slate-500 mt-2 font-medium">Trung tam khoi tao va sao ke dinh danh truc tuyen cho Phu huynh theo Nam hoc.</p>
      </div>
      <ParentAccountsClient classes={classes} years={years} defaultYearId={activeYearId} />
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/parents/page.tsx", parentsPage, "utf8");
console.log("parents/page.tsx updated");

console.log("=== Phase 2 done ===");
