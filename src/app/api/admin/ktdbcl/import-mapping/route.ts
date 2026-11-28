import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const ALLOWED_ROLES = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "KHAO_THI", "ĐBCL", "DBCL", "GDCS", "GIAO_VU_CS", "GIAO_VU"]

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
        // Kiểm tra xem mã VNEdu đã được gán cho học sinh khác chưa
        const existingMapping = await prisma.studentCodeMapping.findFirst({
          where: {
            markFileCode: mfCode,
            databaseCode: { not: dbCode }
          }
        })

        if (existingMapping) {
          const otherStudent = await prisma.student.findFirst({
            where: { studentCode: existingMapping.databaseCode },
            select: { studentName: true, studentCode: true }
          })
          const otherName = otherStudent ? `${otherStudent.studentName} (${otherStudent.studentCode})` : existingMapping.databaseCode
          errors.push(`Mã VNEdu '${mfCode}' đã được gán cho học sinh ${otherName}! Mỗi học sinh chỉ có 1 Mã VNEdu duy nhất.`)
          continue
        }

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

        // Đồng bộ xuyên suốt: cập nhật sang các năm học khác của học sinh này
        const otherYearMappings = await prisma.studentCodeMapping.findMany({
          where: {
            databaseCode: dbCode,
            academicYearId: { not: academicYearId }
          }
        })
        for (const otherMap of otherYearMappings) {
          await prisma.studentCodeMapping.update({
            where: { id: otherMap.id },
            data: { markFileCode: mfCode }
          }).catch(() => {})
        }

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

    const studentMap = new Map<string, any>()
    for (const s of students) {
      const codeUpper = String(s.studentCode || "").trim().toUpperCase()
      if (!codeUpper) continue
      studentMap.set(codeUpper, s)
      const stripped = codeUpper.replace(/^0+/, "")
      if (stripped && !studentMap.has(stripped)) {
        studentMap.set(stripped, s)
      }
    }

    // Gom theo từng học sinh (ưu tiên bản ghi của academicYearId hiện tại, kế thừa bản ghi năm trước nếu học sinh đang học ở academicYearId hiện tại)
    const chosenMappingsByCode = new Map<string, any>()
    for (const m of mappings) {
      const rawDb = String(m.databaseCode || "").trim().toUpperCase()
      const matchedStudent = studentMap.get(rawDb)
      const canonicalDb = matchedStudent ? String(matchedStudent.studentCode).trim().toUpperCase() : rawDb
      if (m.academicYearId !== academicYearId && !matchedStudent) continue

      const existing = chosenMappingsByCode.get(canonicalDb)
      if (!existing || (existing.academicYearId !== academicYearId && m.academicYearId === academicYearId)) {
        chosenMappingsByCode.set(canonicalDb, {
          ...m,
          databaseCode: matchedStudent ? matchedStudent.studentCode : m.databaseCode,
        })
      }
    }

    const joinedMappings = Array.from(chosenMappingsByCode.values()).map(m => {
      const student = studentMap.get(String(m.databaseCode || "").trim().toUpperCase())
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
