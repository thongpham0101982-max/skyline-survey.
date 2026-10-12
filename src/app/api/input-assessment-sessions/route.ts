import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const session = await auth()
    const user = session?.user as any
    const isGDCS = user?.role === "GDCS"
    const allowedCampusIds: string[] = user?.campusIds || []

    const { searchParams } = new URL(req.url)
    const academicYearId = searchParams.get("academicYearId")
    const campusId = searchParams.get("campusId")
    const periodId = searchParams.get("periodId")
    const batchId = searchParams.get("batchId")
    const sessionType = searchParams.get("sessionType")
    const status = searchParams.get("status")
    const date = searchParams.get("date") // YYYY-MM-DD

    const where: any = {}

    if (academicYearId) {
      where.academicYearId = academicYearId
    }

    if (isGDCS && allowedCampusIds.length > 0) {
      if (campusId && allowedCampusIds.includes(campusId)) {
        where.campusId = campusId
      } else {
        where.campusId = { in: allowedCampusIds }
      }
    } else if (campusId && campusId !== "all") {
      where.campusId = campusId
    }

    if (periodId && periodId !== "all") {
      where.periodId = periodId
    }

    if (batchId && batchId !== "all") {
      if (batchId === "null") {
        where.batchId = null
      } else {
        where.batchId = batchId
      }
    }

    if (sessionType && sessionType !== "all") {
      where.sessionType = sessionType
    }

    if (status && status !== "all") {
      where.status = status
    }

    if (date) {
      const startOfDay = new Date(`${date}T00:00:00.000Z`)
      const endOfDay = new Date(`${date}T23:59:59.999Z`)
      where.sessionDate = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    const sessions = await (prisma as any).inputAssessmentSession.findMany({
      where,
      include: {
        campus: {
          select: { id: true, campusCode: true, campusName: true }
        },
        academicYear: {
          select: { id: true, name: true }
        },
        period: {
          select: { id: true, code: true, name: true }
        },
        batch: {
          select: { id: true, batchNumber: true, name: true }
        },
        examiners: {
          include: {
            user: {
              select: { id: true, fullName: true, email: true, role: true }
            }
          }
        },
        studentSessions: {
          include: {
            student: {
              select: {
                id: true,
                studentCode: true,
                fullName: true,
                gender: true,
                dateOfBirth: true,
                className: true,
                grade: true,
                admissionCriteria: true,
                surveySystem: true,
                admissionCampus: true,
                registeredCampus: true,
                admissionResult: true,
                isAbsent: true,
                scores: {
                  select: { id: true, subjectId: true, scores: true }
                }
              }
            }
          }
        }
      },
      orderBy: [
        { sessionDate: "desc" },
        { startTime: "asc" }
      ]
    })

    return NextResponse.json(sessions)
  } catch (error: any) {
    console.error("GET /api/input-assessment-sessions error:", error)
    return NextResponse.json({ error: error.message || "Lỗi máy chủ" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    const user = session?.user as any
    const body = await req.json()

    const {
      sessionCode,
      name,
      sessionDate,
      startTime,
      endTime,
      room,
      campusId,
      academicYearId,
      periodId,
      batchId,
      maxCapacity = 30,
      sessionType = "LE",
      status = "SCHEDULED",
      notes,
      examinerUserIds = [], // string[] or { userId, role, subjectCode }[]
      studentIds = [] // string[]
    } = body

    if (!name || !sessionDate || !campusId || !academicYearId) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Tên phiên, Ngày khảo sát, Cơ sở và Năm học." },
        { status: 400 }
      )
    }

    // Auto-generate sessionCode if missing
    let finalCode = sessionCode
    if (!finalCode) {
      const dateStr = new Date(sessionDate).toISOString().slice(0, 10).replace(/-/g, "")
      const randSuffix = Math.floor(1000 + Math.random() * 9000)
      finalCode = `SES-${dateStr}-${randSuffix}`
    }

    const createdSession = await (prisma as any).inputAssessmentSession.create({
      data: {
        sessionCode: finalCode,
        name,
        sessionDate: new Date(sessionDate),
        startTime: startTime || null,
        endTime: endTime || null,
        room: room || null,
        campusId,
        academicYearId,
        periodId: periodId || null,
        batchId: batchId || null,
        maxCapacity: parseInt(maxCapacity, 10) || 30,
        sessionType,
        status,
        notes: notes || null,
        createdById: user?.id || null,
        examiners: {
          create: examinerUserIds.map((item: any) => {
            if (typeof item === "string") {
              return { userId: item, role: "EXAMINER" }
            }
            return {
              userId: item.userId,
              role: item.role || "EXAMINER",
              subjectCode: item.subjectCode || null
            }
          })
        },
        studentSessions: {
          create: studentIds.map((stId: string, idx: number) => ({
            studentId: stId,
            seatNumber: `SBD-${(idx + 1).toString().padStart(2, "0")}`,
            status: "ASSIGNED"
          }))
        }
      },
      include: {
        campus: true,
        academicYear: true,
        examiners: { include: { user: true } },
        studentSessions: { include: { student: true } }
      }
    })

    return NextResponse.json(createdSession, { status: 201 })
  } catch (error: any) {
    console.error("POST /api/input-assessment-sessions error:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Mã phiên khảo sát đã tồn tại." }, { status: 409 })
    }
    return NextResponse.json({ error: error.message || "Lỗi tạo phiên khảo sát." }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    const user = session?.user as any
    const body = await req.json()
    const { id, data, addStudentIds = [], removeStudentIds = [], examiners = null } = body

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID phiên khảo sát." }, { status: 400 })
    }

    const updateData: any = {}
    if (data) {
      if (data.name !== undefined) updateData.name = data.name
      if (data.sessionDate !== undefined) updateData.sessionDate = new Date(data.sessionDate)
      if (data.startTime !== undefined) updateData.startTime = data.startTime
      if (data.endTime !== undefined) updateData.endTime = data.endTime
      if (data.room !== undefined) updateData.room = data.room
      if (data.campusId !== undefined) updateData.campusId = data.campusId
      if (data.academicYearId !== undefined) updateData.academicYearId = data.academicYearId
      if (data.periodId !== undefined) updateData.periodId = data.periodId || null
      if (data.batchId !== undefined) updateData.batchId = data.batchId || null
      if (data.maxCapacity !== undefined) updateData.maxCapacity = parseInt(data.maxCapacity, 10)
      if (data.sessionType !== undefined) updateData.sessionType = data.sessionType
      if (data.status !== undefined) updateData.status = data.status
      if (data.notes !== undefined) updateData.notes = data.notes
    }

    // Process update in transaction
    await (prisma as any).$transaction(async (tx: any) => {
      if (Object.keys(updateData).length > 0) {
        await tx.inputAssessmentSession.update({
          where: { id },
          data: updateData
        })
      }

      // Add students
      if (addStudentIds.length > 0) {
        for (const stId of addStudentIds) {
          await tx.inputAssessmentStudentSession.upsert({
            where: {
              sessionId_studentId: {
                sessionId: id,
                studentId: stId
              }
            },
            create: {
              sessionId: id,
              studentId: stId,
              status: "ASSIGNED"
            },
            update: {}
          })
        }
      }

      // Remove students
      if (removeStudentIds.length > 0) {
        await tx.inputAssessmentStudentSession.deleteMany({
          where: {
            sessionId: id,
            studentId: { in: removeStudentIds }
          }
        })
      }

      // Replace examiners if provided
      if (Array.isArray(examiners)) {
        await tx.inputAssessmentSessionExaminer.deleteMany({
          where: { sessionId: id }
        })
        if (examiners.length > 0) {
          await tx.inputAssessmentSessionExaminer.createMany({
            data: examiners.map((e: any) => ({
              sessionId: id,
              userId: typeof e === "string" ? e : e.userId,
              role: typeof e === "string" ? "EXAMINER" : (e.role || "EXAMINER"),
              subjectCode: typeof e === "string" ? null : (e.subjectCode || null)
            }))
          })
        }
      }
    })

    const updated = await (prisma as any).inputAssessmentSession.findUnique({
      where: { id },
      include: {
        campus: true,
        academicYear: true,
        period: true,
        batch: true,
        examiners: { include: { user: true } },
        studentSessions: { include: { student: true } }
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("PUT /api/input-assessment-sessions error:", error)
    return NextResponse.json({ error: error.message || "Lỗi cập nhật phiên khảo sát." }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID phiên khảo sát." }, { status: 400 })
    }

    // Check if session has students with scores
    const session = await (prisma as any).inputAssessmentSession.findUnique({
      where: { id },
      include: {
        studentSessions: {
          include: {
            student: {
              include: { scores: true }
            }
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json({ error: "Phiên khảo sát không tồn tại." }, { status: 404 })
    }

    const hasScores = session.studentSessions.some((ss: any) => ss.student?.scores?.length > 0)
    if (hasScores) {
      return NextResponse.json(
        { error: "Phiên khảo sát này đã có học sinh nhập điểm. Không thể xóa để bảo toàn dữ liệu." },
        { status: 400 }
      )
    }

    await (prisma as any).inputAssessmentSession.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: "Đã xóa phiên khảo sát thành công." })
  } catch (error: any) {
    console.error("DELETE /api/input-assessment-sessions error:", error)
    return NextResponse.json({ error: error.message || "Lỗi xóa phiên khảo sát." }, { status: 500 })
  }
}
