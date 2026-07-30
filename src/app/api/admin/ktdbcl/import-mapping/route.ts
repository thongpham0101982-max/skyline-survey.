import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const ALLOWED_ROLES = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GIAO_VU_CS", "GIAO_VU"]

async function checkAuth() {
  const session = await auth()
  if (!session) return null
  const role = (session?.user as any)?.role || ""
  if (!ALLOWED_ROLES.includes(role)) return null
  return session
}

export async function POST(req: NextRequest) {
  const session = await checkAuth()
  if (!session) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { academicYearId, mappings } = body

    if (!academicYearId || !mappings || !Array.isArray(mappings)) {
      return NextResponse.json({ error: "Dữ liệu yêu cầu không hợp lệ" }, { status: 400 })
    }

    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId }
    })
    if (!academicYear) {
      return NextResponse.json({ error: "Năm học không tồn tại" }, { status: 404 })
    }

    let successCount = 0
    const errors: string[] = []

    for (const m of mappings) {
      const dbCode = String(m.databaseCode || "").trim().toUpperCase()
      const mfCode = String(m.markFileCode || "").trim().toUpperCase()
      if (!dbCode || !mfCode) continue

      try {
        await prisma.studentCodeMapping.upsert({
          where: {
            academicYearId_databaseCode: {
              academicYearId,
              databaseCode: dbCode
            }
          },
          update: {
            markFileCode: mfCode
          },
          create: {
            academicYearId,
            databaseCode: dbCode,
            markFileCode: mfCode
          }
        })
        successCount++
      } catch (err: any) {
        errors.push(`Lỗi khớp mã CSDL ${dbCode} với mã File ${mfCode}: ${err.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      successCount,
      errors
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = await checkAuth()
  if (!session) {
    return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const academicYearId = searchParams.get("academicYearId")
    if (!academicYearId) {
      return NextResponse.json({ error: "Thiếu academicYearId" }, { status: 400 })
    }

    const [mappings, students] = await Promise.all([
      prisma.studentCodeMapping.findMany({
        where: { academicYearId },
        orderBy: { createdAt: "desc" }
      }),
      prisma.student.findMany({
        where: { academicYearId },
        include: {
          class: true,
          campus: true
        }
      })
    ])

    const studentMap = new Map<string, any>(students.map(s => [s.studentCode.toUpperCase(), s]))

    const joinedMappings = mappings.map(m => {
      const student = studentMap.get(m.databaseCode.toUpperCase())
      return {
        id: m.id,
        databaseCode: m.databaseCode,
        markFileCode: m.markFileCode,
        createdAt: m.createdAt,
        studentName: student ? student.studentName : "—",
        classCode: student?.class ? student.class.classCode : "—",
        campusName: student?.campus ? student.campus.campusName : "—",
        dateOfBirth: student?.dateOfBirth ? student.dateOfBirth : null,
        gender: student?.gender ? student.gender : "—"
      }
    })

    return NextResponse.json({ success: true, mappings: joinedMappings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
