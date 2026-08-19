import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const targetStudentId = searchParams.get("studentId")
  const targetStudentCode = searchParams.get("studentCode")
  const classId = searchParams.get("classId")
  const academicYearId = searchParams.get("academicYearId")

  try {
    let targetStudentIds: string[] = []
    if (targetStudentId) targetStudentIds.push(targetStudentId)

    let codeToLookup = targetStudentCode
    if (!codeToLookup && targetStudentId) {
      const stObj = await prisma.student.findUnique({
        where: { id: targetStudentId },
        select: { studentCode: true }
      }).catch(() => null)
      codeToLookup = stObj?.studentCode
    }

    if (codeToLookup) {
      const sameCodeStudents = await prisma.student.findMany({
        where: { studentCode: codeToLookup },
        select: { id: true }
      }).catch(() => [])
      if (sameCodeStudents.length > 0) {
        targetStudentIds = Array.from(new Set([...targetStudentIds, ...sameCodeStudents.map(s => s.id)]))
      }
    }

    let whereCondition: any = {}
    if (targetStudentIds.length > 0) {
      whereCondition.studentId = { in: targetStudentIds }
    } else if (classId) {
      const classStudents = await prisma.student.findMany({
        where: { classId },
        select: { id: true }
      }).catch(() => [])
      whereCondition.studentId = { in: classStudents.map(s => s.id) }
    }

    let logs = await prisma.academicConsultationLog.findMany({
      where: {
        ...whereCondition,
        ...(academicYearId ? { academicYearId } : {})
      },
      include: {
        student: { select: { id: true, studentCode: true, studentName: true, class: { select: { className: true } } } },
        teacher: { select: { id: true, teacherName: true } }
      },
      orderBy: { meetingDate: "desc" }
    }).catch(() => [])

    // Fallback without academicYearId filter if empty
    if (logs.length === 0 && targetStudentIds.length > 0) {
      logs = await prisma.academicConsultationLog.findMany({
        where: { studentId: { in: targetStudentIds } },
        include: {
          student: { select: { id: true, studentCode: true, studentName: true, class: { select: { className: true } } } },
          teacher: { select: { id: true, teacherName: true } }
        },
        orderBy: { meetingDate: "desc" }
      }).catch(() => [])
    }

    const formattedLogs = logs.map(l => ({
      ...l,
      evaluatorName: l.teacher?.teacherName || "Giáo Viên Cố Vấn"
    }))

    return NextResponse.json(formattedLogs)
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
    }).catch(() => null)
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


export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, studentReflection, content, difficulties, nextActions, deadline, notes } = body

    if (!id) {
      return NextResponse.json({ error: "Missing log id" }, { status: 400 })
    }

    const updateData: any = { updatedAt: new Date() }
    if (studentReflection !== undefined) updateData.studentReflection = studentReflection
    if (content !== undefined) updateData.content = content
    if (difficulties !== undefined) updateData.difficulties = difficulties
    if (nextActions !== undefined) updateData.nextActions = nextActions
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null
    if (notes !== undefined) updateData.notes = notes

    const updated = await prisma.academicConsultationLog.update({
      where: { id },
      data: updateData,
      include: {
        student: { select: { id: true, studentCode: true, studentName: true, class: { select: { className: true } } } },
        teacher: { select: { id: true, teacherName: true } }
      }
    })

    return NextResponse.json({ success: true, log: updated })
  } catch (error: any) {
    console.error("PUT /api/advisory/consultations error:", error)
    return NextResponse.json({ error: error.message || "Server error" }, { status: 500 })
  }
}