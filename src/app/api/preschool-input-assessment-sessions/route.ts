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
    const date = searchParams.get("date")

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

    const sessions = await (prisma as any).preschoolInputAssessmentSession.findMany({
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
                grade: true,
                admissionCriteria: true,
                surveySystem: true,
                admissionCampus: true,
                admissionResult: true,
                isAbsent: true
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
    console.error("GET /api/preschool-input-assessment-sessions error:", error)
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
      maxCapacity = 20,
      sessionType = "LE",
      status = "SCHEDULED",
      notes,
      examinerUserIds = [],
      studentIds = []
    } = body

    if (!name || !sessionDate || !campusId || !academicYearId) {
      return NextResponse.json(
        { error: "Vui lòng nhập đầy đủ Tên phiên, Ngày khảo sát, Cơ sở và Năm học." },
        { status: 400 }
      )
    }

    let finalCode = sessionCode
    if (!finalCode) {
      const dateStr = new Date(sessionDate).toISOString().slice(0, 10).replace(/-/g, "")
      const randSuffix = Math.floor(1000 + Math.random() * 9000)
      finalCode = `MN-SES-${dateStr}-${randSuffix}`
    }

    const createdSession = await (prisma as any).preschoolInputAssessmentSession.create({
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
        maxCapacity: parseInt(maxCapacity, 10) || 20,
        sessionType,
        status,
        notes: notes || null,
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
            seatNumber: `MN-SBD-${(idx + 1).toString().padStart(2, "0")}`,
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
    console.error("POST /api/preschool-input-assessment-sessions error:", error)
    if (error.code === "P2002") {
      return NextResponse.json({ error: "Mã phiên khảo sát đã tồn tại." }, { status: 409 })
    }
    return NextResponse.json({ error: error.message || "Lỗi tạo phiên khảo sát mầm non." }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID phiên khảo sát." }, { status: 400 })
    }

    await (prisma as any).preschoolInputAssessmentSession.delete({
      where: { id }
    })

    return NextResponse.json({ success: true, message: "Đã xóa phiên khảo sát mầm non thành công." })
  } catch (error: any) {
    console.error("DELETE /api/preschool-input-assessment-sessions error:", error)
    return NextResponse.json({ error: error.message || "Lỗi xóa phiên khảo sát." }, { status: 500 })
  }
}
