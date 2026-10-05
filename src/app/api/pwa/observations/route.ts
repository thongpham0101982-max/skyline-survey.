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
        level: s.level || "",
        departmentName: s.teacher?.departmentRel?.name || "",
        requestOrigin: s.requestOrigin || "",
        topic: s.topic || "",
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
    const { slotId, evaluationType = "K12", scores, strengths, weaknesses, rating, generalComment } = body

    if (!slotId) {
      return NextResponse.json({ error: "Missing slotId" }, { status: 400 })
    }

    const numScores = Array.isArray(scores) ? scores.map(Number) : []
    const totalScore = typeof body.totalScore === "number"
      ? body.totalScore
      : numScores.reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)

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

    // Map fields accurately according to evaluationType (K12, MAM_NON, GVNN)
    const evalData: any = {
      slotId,
      evaluatorId: teacher.id,
      totalScore,
      overallRating,
      strengths: strengths || "",
      improvements: weaknesses || "",
      generalComment: generalComment || `[Mobile Evaluation - ${evaluationType}] ${strengths || ""}`,
      submittedAt: new Date()
    }

    if (evaluationType === "MAM_NON") {
      // 5 criteria for preschool
      evalData.criterion1 = Math.round(numScores[0] || 0)
      evalData.criterion2 = Math.round(numScores[1] || 0)
      evalData.criterion3 = Math.round(numScores[2] || 0)
      evalData.criterion4 = Math.round(numScores[3] || 0)
      evalData.criterion5 = Math.round(numScores[4] || 0)

      evalData.score1 = numScores[0] ?? null
      evalData.score2 = numScores[1] ?? null
      evalData.score3 = numScores[2] ?? null
      evalData.score4 = numScores[3] ?? null
      evalData.score5 = numScores[4] ?? null
    } else if (evaluationType === "GVNN") {
      // 6 criteria for foreign teachers walkthrough
      evalData.score1 = numScores[0] ?? null
      evalData.score2 = numScores[1] ?? null
      evalData.score3 = numScores[2] ?? null
      evalData.score4 = numScores[3] ?? null
      evalData.score5 = numScores[4] ?? null
      evalData.score6 = numScores[5] ?? null
    } else {
      // Default: K-12 (11 criteria Y1 - Y11)
      evalData.score1 = numScores[0] ?? null
      evalData.score2 = numScores[1] ?? null
      evalData.score3 = numScores[2] ?? null
      evalData.score4 = numScores[3] ?? null
      evalData.score5 = numScores[4] ?? null
      evalData.score6 = numScores[5] ?? null
      evalData.score7 = numScores[6] ?? null
      evalData.score8 = numScores[7] ?? null
      evalData.score9 = numScores[8] ?? null
      evalData.score10 = numScores[9] ?? null
      evalData.score11 = numScores[10] ?? null
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
