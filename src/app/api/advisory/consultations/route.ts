import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const studentId = searchParams.get("studentId")
  const classId = searchParams.get("classId")
  const academicYearId = searchParams.get("academicYearId")

  try {
    const whereCondition: any = {}
    if (academicYearId) whereCondition.academicYearId = academicYearId
    if (studentId) whereCondition.studentId = studentId

    if (classId && !studentId) {
      const classStudents = await prisma.student.findMany({
        where: { classId },
        select: { id: true }
      })
      whereCondition.studentId = { in: classStudents.map(s => s.id) }
    }

    const logs = await prisma.academicConsultationLog.findMany({
      where: whereCondition,
      include: {
        student: { select: { id: true, studentCode: true, studentName: true, class: { select: { className: true } } } },
        teacher: { select: { id: true, teacherName: true } }
      },
      orderBy: { meetingDate: "desc" }
    })

    return NextResponse.json(logs)
  } catch (error: any) {
    console.error("GET /api/advisory/consultations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const {
      id,
      studentId,
      academicYearId,
      meetingDate,
      content,
      difficulties,
      nextActions,
      deadline,
      notes
    } = body

    if (!studentId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })
    const teacherId = teacher ? teacher.id : session.user.id

    let log
    if (id) {
      log = await prisma.academicConsultationLog.update({
        where: { id },
        data: {
          meetingDate: meetingDate ? new Date(meetingDate) : undefined,
          content,
          difficulties,
          nextActions,
          deadline: deadline ? new Date(deadline) : null,
          notes
        }
      })
    } else {
      log = await prisma.academicConsultationLog.create({
        data: {
          studentId,
          teacherId,
          academicYearId: academicYearId || "",
          meetingDate: meetingDate ? new Date(meetingDate) : new Date(),
          content,
          difficulties,
          nextActions,
          deadline: deadline ? new Date(deadline) : null,
          notes
        }
      })
    }

    return NextResponse.json({ success: true, log })
  } catch (error: any) {
    console.error("POST /api/advisory/consultations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  try {
    await prisma.academicConsultationLog.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}
