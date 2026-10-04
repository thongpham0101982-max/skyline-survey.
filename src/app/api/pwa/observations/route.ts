import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id },
      include: {
        departmentRel: true,
        campus: true
      }
    })

    if (!teacher) {
      return NextResponse.json({ success: true, mySlots: [], availableSlots: [] })
    }

    const teacherId = teacher.id

    // 1. Fetch personal slots (user is teaching or registered as observer)
    const rawMySlots = await prisma.observationSlot.findMany({
      where: {
        OR: [
          { teacherId },
          { registrations: { some: { teacherId } } }
        ]
      },
      include: {
        teacher: { select: { id: true, teacherName: true } },
        registrations: {
          include: {
            teacher: { select: { id: true, teacherName: true } },
            evaluation: true
          }
        }
      },
      orderBy: { date: "desc" },
      take: 30
    })

    // 2. Fetch available open slots for registration
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const rawAvailableSlots = await prisma.observationSlot.findMany({
      where: {
        date: { gte: today },
        teacherId: { not: teacherId },
        registrations: { none: { teacherId } },
        status: { in: ["ACTIVE", "OPEN", "PENDING_TEACHER_APPROVAL"] }
      },
      include: {
        teacher: { select: { id: true, teacherName: true } },
        registrations: true
      },
      orderBy: { date: "asc" },
      take: 20
    })

    const formatSlot = (s: any) => {
      const isMyTeaching = s.teacherId === teacherId
      const myReg = s.registrations?.find((r: any) => r.teacherId === teacherId)
      const myEval = myReg?.evaluation || null

      let roleType = isMyTeaching ? "TEACHING" : "OBSERVING"
      let statusLabel = s.status || "ACTIVE"
      if (myReg) {
        statusLabel = myReg.isApproved ? "Đã duyệt dự" : "Đã đăng ký"
      }

      let dateStr = ""
      if (s.date instanceof Date) {
        dateStr = s.date.toISOString().split("T")[0]
      } else if (typeof s.date === "string") {
        dateStr = s.date.split("T")[0]
      }

      const timeRange = (s.startTime && s.endTime) ? `${s.startTime} - ${s.endTime}` : (s.startTime || "Trong ngày")

      return {
        id: s.id,
        date: dateStr,
        slotIndex: s.startTime || "Tiết học",
        time: timeRange,
        teacherName: s.teacher?.teacherName || "Giáo viên",
        teacherId: s.teacherId,
        subjectName: s.subjectName || "Môn học",
        className: s.className || "Lớp học",
        room: s.room || "Phòng học",
        roleType,
        status: statusLabel,
        hasEvaluated: Boolean(myEval),
        myEvaluation: myEval ? {
          id: myEval.id,
          totalScore: myEval.totalScore || 0,
          rating: myEval.overallRating || "Đạt",
          feedback: myEval.generalComment || myEval.strengths || ""
        } : null,
        observersCount: s.registrations?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      mySlots: rawMySlots.map(formatSlot),
      availableSlots: rawAvailableSlots.map(formatSlot)
    })
  } catch (error: any) {
    console.error("[API PWA Observations GET Error]:", error?.message || error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const { slotId, scores, strengths, weaknesses, rating } = body

    if (!slotId) {
      return NextResponse.json({ error: "Missing slotId" }, { status: 400 })
    }

    const totalScore = Array.isArray(scores)
      ? scores.reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)
      : (parseFloat(body.totalScore) || 0)

    // Ensure registration exists for this evaluator
    let reg = await prisma.observationRegistration.findUnique({
      where: {
        slotId_teacherId: {
          slotId,
          teacherId: teacher.id
        }
      }
    })

    if (!reg) {
      reg = await prisma.observationRegistration.create({
        data: {
          slotId,
          teacherId: teacher.id,
          isApproved: true,
          approvedAt: new Date()
        }
      })
    }

    const overallRating = rating || (totalScore >= 14 ? "Tốt" : totalScore >= 11 ? "Khá" : "Đạt")
    const numScores = Array.isArray(scores) ? scores.map(Number) : []

    const evalData = {
      slotId,
      evaluatorId: teacher.id,
      totalScore,
      overallRating,
      strengths: strengths || "",
      improvements: weaknesses || "",
      score1: numScores[0] ?? null,
      score2: numScores[1] ?? null,
      score3: numScores[2] ?? null,
      score4: numScores[3] ?? null,
      submittedAt: new Date()
    }

    await prisma.observationEvaluation.upsert({
      where: { registrationId: reg.id },
      update: evalData,
      create: {
        ...evalData,
        registrationId: reg.id
      }
    })

    return NextResponse.json({
      success: true,
      message: "Đã lưu phiếu đánh giá dự giờ thành công"
    })
  } catch (error: any) {
    console.error("[API PWA Observations POST Error]:", error?.message || error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const teacher = await prisma.teacher.findUnique({
      where: { userId: session.user.id }
    })

    if (!teacher) {
      return NextResponse.json({ error: "Teacher profile not found" }, { status: 404 })
    }

    const body = await req.json().catch(() => ({}))
    const { slotId } = body

    if (!slotId) {
      return NextResponse.json({ error: "Missing slotId" }, { status: 400 })
    }

    const existingReg = await prisma.observationRegistration.findUnique({
      where: {
        slotId_teacherId: { slotId, teacherId: teacher.id }
      }
    })

    if (existingReg) {
      return NextResponse.json({ success: true, message: "Thầy/Cô đã đăng ký tiết này trước đó" })
    }

    await prisma.observationRegistration.create({
      data: {
        slotId,
        teacherId: teacher.id,
        isApproved: true,
        approvedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: "Đã đăng ký tham gia dự giờ thành công"
    })
  } catch (error: any) {
    console.error("[API PWA Observations PUT Error]:", error?.message || error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
