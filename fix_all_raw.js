const fs = require("fs");

// ===== teachers/page.tsx - use $queryRaw for everything =====
const teacherPage = `import { prisma } from "@/lib/db"
import { TeacherManagerClient } from "./client"

export const metadata = { title: "Quan ly Giao vien | Admin Portal" }

export default async function TeacherManagerPage() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true }
  })
  const defaultYearId = years.find(y => y.status === "ACTIVE")?.id || years[0]?.id || null

  // Query teachers using raw SQL to include academicYearId column
  const rawTeachers = await prisma.$queryRaw\`
    SELECT t.id, t.teacherCode, t.teacherName, t.homeroomClass,
           t.email, t.phone, t.status, t.academicYearId,
           u.email as userEmail, u.status as userStatus
    FROM Teacher t
    LEFT JOIN User u ON t.userId = u.id
    ORDER BY t.teacherName ASC
  \` as any[]

  const yearsById = new Map(years.map(y => [y.id, y]))

  const teachers = rawTeachers.map(t => ({
    id: t.id,
    teacherCode: t.teacherCode,
    teacherName: t.teacherName,
    homeroomClass: t.homeroomClass || null,
    email: t.email || null,
    phone: t.phone || null,
    status: t.status,
    academicYear: t.academicYearId ? (yearsById.get(t.academicYearId) ?? null) : null,
    user: { email: t.userEmail || t.teacherCode, status: t.userStatus || "ACTIVE" }
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quan ly Giao vien</h1>
        <p className="text-slate-500 mt-2 text-sm">Them, chinh sua thong tin giao vien theo Tung Nam hoc.</p>
      </div>
      <TeacherManagerClient initialTeachers={teachers} years={years} defaultYearId={defaultYearId} />
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/teachers/page.tsx", teacherPage, "utf8");
console.log("teachers/page.tsx OK");

// ===== academic-years/page.tsx - use $queryRaw for teacher/parent counts =====
const ayPage = `import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { AcademicYearsClient } from "./client"

async function createAcademicYear(formData) {
  "use server"
  const name = formData.get("name")
  const startDate = new Date(formData.get("startDate"))
  const endDate = new Date(formData.get("endDate"))
  try {
    await prisma.academicYear.create({ data: { name, startDate, endDate } })
  } catch(e) {}
  revalidatePath("/admin/academic-years")
}

async function updateAcademicYear(data) {
  "use server"
  const payload = {}
  if (data.name) payload.name = data.name
  if (data.startDate) payload.startDate = data.startDate
  if (data.endDate) payload.endDate = data.endDate
  if (data.status) payload.status = data.status
  await prisma.academicYear.update({ where: { id: data.id }, data: payload })
  revalidatePath("/admin/academic-years")
}

async function deleteAcademicYear(id) {
  "use server"
  await prisma.academicYear.delete({ where: { id } }).catch(()=>{})
  revalidatePath("/admin/academic-years")
}

async function setActiveYear(id) {
  "use server"
  await prisma.academicYear.updateMany({ data: { status: "INACTIVE" } })
  await prisma.academicYear.update({ where: { id }, data: { status: "ACTIVE" } })
  revalidatePath("/admin/academic-years")
  revalidatePath("/admin/teachers")
  revalidatePath("/admin/parents")
}

export default async function AcademicYearsPage() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { classes: true, students: true } } }
  })

  const teacherCounts = await prisma.$queryRaw\`
    SELECT academicYearId, COUNT(*) as cnt FROM Teacher WHERE academicYearId IS NOT NULL GROUP BY academicYearId
  \` as { academicYearId: string, cnt: bigint }[]

  const parentCounts = await prisma.$queryRaw\`
    SELECT academicYearId, COUNT(*) as cnt FROM Parent WHERE academicYearId IS NOT NULL GROUP BY academicYearId
  \` as { academicYearId: string, cnt: bigint }[]

  const yearsWithCounts = years.map(y => ({
    ...y,
    teacherCount: Number(teacherCounts.find(r => r.academicYearId === y.id)?.cnt ?? 0),
    parentCount: Number(parentCounts.find(r => r.academicYearId === y.id)?.cnt ?? 0),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quan ly Nam hoc</h1>
        <p className="text-slate-500 mt-2 text-sm">Moi tai khoan Phu huynh va Giao vien deu thuoc ve mot Nam hoc cu the.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-base font-bold mb-4 text-slate-800">Tao Nam hoc Moi</h2>
        <form action={createAcademicYear} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ten Nam hoc</label>
            <input name="name" type="text" required placeholder="2025-2026" className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngay bat dau</label>
            <input name="startDate" type="date" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngay ket thuc</label>
            <input name="endDate" type="date" required className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none" />
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-2.5 px-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20">
            Tao Nam hoc
          </button>
        </form>
      </div>

      <AcademicYearsClient initialYears={yearsWithCounts} updateAction={updateAcademicYear} deleteAction={deleteAcademicYear} setActiveAction={setActiveYear} />
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/academic-years/page.tsx", ayPage, "utf8");
console.log("academic-years/page.tsx OK");

// ===== teachers/actions.ts - use executeRaw for academicYearId =====
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
      data: { fullName: data.teacherName, email: data.teacherCode, passwordHash: hashedPassword, role: "TEACHER", status: "ACTIVE" }
    })
    userId = user.id
  }

  const existing = await prisma.teacher.findUnique({ where: { teacherCode: data.teacherCode } })
  if (existing) throw new Error("Ma SKL da ton tai: " + data.teacherCode)

  // Create teacher without academicYearId in Prisma (handled separately)
  const teacher = await prisma.teacher.create({
    data: {
      userId, teacherCode: data.teacherCode, teacherName: data.teacherName,
      homeroomClass: data.homeroomClass || null, email: data.email || null,
      phone: data.phone || null, campusId, status: "ACTIVE"
    }
  })

  // Set academicYearId via raw SQL
  if (academicYearId) {
    await prisma.$executeRawUnsafe(
      \`UPDATE Teacher SET academicYearId = ? WHERE id = ?\`,
      academicYearId, teacher.id
    )
  }

  revalidatePath("/admin/teachers")
  return { success: true }
}

export async function updateTeacherAction(data) {
  const { id, academicYearId, ...rest } = data
  await prisma.teacher.update({ where: { id }, data: rest })
  if (rest.teacherName) {
    const t = await prisma.teacher.findUnique({ where: { id } })
    if (t) await prisma.user.update({ where: { id: t.userId }, data: { fullName: rest.teacherName } })
  }
  if (academicYearId !== undefined) {
    await prisma.$executeRawUnsafe(\`UPDATE Teacher SET academicYearId = ? WHERE id = ?\`, academicYearId || null, id)
  }
  revalidatePath("/admin/teachers")
  return { success: true }
}

export async function deleteTeacherAction(id) {
  const teacher = await prisma.teacher.findUnique({ where: { id } })
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

      const teacher = await prisma.teacher.create({
        data: {
          userId, teacherCode: row.teacherCode, teacherName: row.teacherName,
          homeroomClass: row.homeroomClass || null, email: row.email || null,
          phone: row.phone || null, campusId, status: "ACTIVE"
        }
      })
      if (yearId) {
        await prisma.$executeRawUnsafe(\`UPDATE Teacher SET academicYearId = ? WHERE id = ?\`, yearId, teacher.id)
      }
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
console.log("teachers/actions.ts OK");

console.log("=== All raw-SQL fixes applied ===");
