const fs = require("fs");

// ============================================
// FILE 1: src/app/admin/teachers/actions.ts
// ============================================
const actionsContent = `"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"

// Get default campusId (first campus)
async function getDefaultCampusId(): Promise<string> {
  const campus = await prisma.campus.findFirst()
  if (!campus) {
    const newCampus = await prisma.campus.create({
      data: { campusCode: "MAIN", campusName: "Campus Chinh", status: "ACTIVE" }
    })
    return newCampus.id
  }
  return campus.id
}

// Create single teacher + auto-create login account
export async function createTeacherAction(data: {
  teacherCode: string
  teacherName: string
  homeroomClass?: string
  email?: string
  phone?: string
}) {
  const campusId = await getDefaultCampusId()
  const hashedPassword = await bcrypt.hash(data.teacherCode, 10)

  // Create User account (username = teacherCode, password = teacherCode)
  const existingUser = await prisma.user.findUnique({ where: { email: data.teacherCode } })
  let userId: string

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

  // Check if teacher code already exists
  const existingTeacher = await prisma.teacher.findUnique({ where: { teacherCode: data.teacherCode } })
  if (existingTeacher) {
    throw new Error("Ma SKL da ton tai: " + data.teacherCode)
  }

  await prisma.teacher.create({
    data: {
      userId,
      teacherCode: data.teacherCode,
      teacherName: data.teacherName,
      homeroomClass: data.homeroomClass || null,
      email: data.email || null,
      phone: data.phone || null,
      campusId,
      status: "ACTIVE"
    }
  })

  revalidatePath("/admin/teachers")
  return { success: true }
}

// Update teacher
export async function updateTeacherAction(data: {
  id: string
  teacherName?: string
  homeroomClass?: string
  email?: string
  phone?: string
  status?: string
}) {
  const { id, ...rest } = data
  
  const teacher = await prisma.teacher.update({
    where: { id },
    data: rest,
    include: { user: true }
  })

  // Also update user fullName if name changed
  if (rest.teacherName) {
    await prisma.user.update({
      where: { id: teacher.userId },
      data: { fullName: rest.teacherName }
    })
  }

  revalidatePath("/admin/teachers")
  return { success: true }
}

// Delete teacher + user account
export async function deleteTeacherAction(id: string) {
  const teacher = await prisma.teacher.findUnique({ where: { id }, include: { user: true } })
  if (!teacher) return { success: false }
  
  await prisma.teacher.delete({ where: { id } })
  await prisma.user.delete({ where: { id: teacher.userId } }).catch(() => {})
  
  revalidatePath("/admin/teachers")
  return { success: true }
}

// Bulk import teachers from Excel data
export async function importTeachersAction(rows: {
  teacherCode: string
  teacherName: string
  homeroomClass?: string
  email?: string
  phone?: string
}[]) {
  const campusId = await getDefaultCampusId()
  let created = 0
  let skipped = 0
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
          data: {
            fullName: row.teacherName,
            email: row.teacherCode,
            passwordHash: hashedPassword,
            role: "TEACHER",
            status: "ACTIVE"
          }
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
          status: "ACTIVE"
        }
      })
      created++
    } catch(e: any) {
      errors.push(\`\${row.teacherCode}: \${e.message}\`)
    }
  }

  revalidatePath("/admin/teachers")
  return { success: true, created, skipped, errors }
}

// Reset teacher password to teacherCode
export async function resetTeacherPasswordAction(teacherId: string) {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } })
  if (!teacher) return { success: false }
  
  const hashedPassword = await bcrypt.hash(teacher.teacherCode, 10)
  await prisma.user.update({
    where: { id: teacher.userId },
    data: { passwordHash: hashedPassword }
  })
  
  return { success: true }
}
`;
fs.writeFileSync("src/app/admin/teachers/actions.ts", actionsContent, "utf8");
console.log("actions.ts created");

// ============================================
// FILE 2: src/app/admin/teachers/page.tsx
// ============================================
const pageContent = `import { prisma } from "@/lib/db"
import { TeacherManagerClient } from "./client"

export const metadata = {
  title: "Quan ly Giao vien | Admin Portal"
}

export default async function TeacherManagerPage() {
  const teachers = await prisma.teacher.findMany({
    orderBy: { teacherName: "asc" },
    include: {
      user: { select: { email: true, status: true } },
      campus: { select: { campusName: true } }
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quan ly Giao vien</h1>
        <p className="text-slate-500 mt-2 text-sm">Them, chinh sua thong tin giao vien, quan ly Lop CN va tai khoan dang nhap.</p>
      </div>
      <TeacherManagerClient initialTeachers={teachers} />
    </div>
  )
}
`;
fs.writeFileSync("src/app/admin/teachers/page.tsx", pageContent, "utf8");
console.log("page.tsx created");

// ============================================
// FILE 3: src/app/api/admin/teachers/import/route.ts
// ============================================
const apiImportDir = "src/app/api/admin/teachers/import";
if (!require("fs").existsSync(apiImportDir)) {
  require("fs").mkdirSync(apiImportDir, { recursive: true });
}
const apiContent = `import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const wb = XLSX.read(buffer, { type: "buffer" })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]

    // Detect if first row is header
    const dataRows = rows.filter(r => r.length > 0)
    // Expected columns: STT | Ma SKL | Ho va ten | Lop CN | Email | Phone
    const result = []
    for (const row of dataRows) {
      // Skip header rows (if first cell is "STT" or number pattern)
      const firstCell = String(row[0] || "").trim()
      if (firstCell.toLowerCase() === "stt" || firstCell.toLowerCase() === "ma skl") continue
      
      const teacherCode = String(row[1] || row[0] || "").trim()
      const teacherName = String(row[2] || row[1] || "").trim()
      const homeroomClass = String(row[3] || "").trim()
      const email = String(row[4] || "").trim()
      const phone = String(row[5] || "").trim()

      if (!teacherCode || !teacherName) continue
      
      result.push({
        teacherCode,
        teacherName,
        homeroomClass: homeroomClass || undefined,
        email: email || undefined,
        phone: phone || undefined
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch(e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
`;
fs.writeFileSync("src/app/api/admin/teachers/import/route.ts", apiContent, "utf8");
console.log("API route created");

console.log("=== All essential files created ===");
