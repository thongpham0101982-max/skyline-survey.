import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const session = await auth()
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId")
  const classId = searchParams.get("classId")

  try {
    const whereCondition: any = {}
    if (studentId) whereCondition.studentId = studentId

    if (classId && !studentId) {
      const classStudents = await prisma.student.findMany({
        where: { classId },
        select: { id: true }
      })
      whereCondition.studentId = { in: classStudents.map(s => s.id) }
    }

    const requests = await prisma.studentHelpRequest.findMany({
      where: whereCondition,
      include: {
        student: { select: { id: true, studentCode: true, studentName: true, class: { select: { className: true } } } },
        teacher: { select: { id: true, teacherName: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(requests)
  } catch (error: any) {
    console.error("GET /api/advisory/help-requests error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { studentId, academicYearId, category, content, urgency } = body

    if (!studentId || !content) {
      return NextResponse.json({ error: "Vui lòng nhập đầy đủ nội dung yêu cầu hỗ trợ" }, { status: 400 })
    }

    // Find student's homeroom teacher to assign request
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true }
    })

    if (!student) {
      return NextResponse.json({ error: "Không tìm thấy thông tin học sinh" }, { status: 404 })
    }

    let targetAyId = academicYearId || student?.academicYearId
    if (!targetAyId) {
      const activeAy = await prisma.academicYear.findFirst({
        where: { status: "ACTIVE" }
      }).catch(() => null)
      const firstAy = activeAy || await prisma.academicYear.findFirst().catch(() => null)
      targetAyId = firstAy?.id || "default_ay"
    }

    const teacherId = student?.class?.homeroomTeacherId || null

    const newRequest = await prisma.studentHelpRequest.create({
      data: {
        studentId,
        academicYearId: targetAyId,
        teacherId,
        category: category || "HOC_TAP",
        content,
        urgency: urgency || "MEDIUM",
        status: "PENDING"
      }
    })

    return NextResponse.json({ success: true, request: newRequest })
  } catch (error: any) {
    console.error("POST /api/advisory/help-requests error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const { id, status, responseNotes } = body

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

    const updated = await prisma.studentHelpRequest.update({
      where: { id },
      data: {
        status: status || "PROCESSING",
        responseNotes: responseNotes || undefined,
        resolvedAt: status === "RESOLVED" ? new Date() : undefined
      }
    })

    return NextResponse.json({ success: true, request: updated })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
