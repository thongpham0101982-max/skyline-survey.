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

    // Fetch personal slots (teaching or observing)
    const rawMySlots = await prisma.observationSlot.findMany({
      where: {
        OR: [
          { teacherId },
          { registrations: { some: { teacherId } } }
        ]
      },
      include: {
        teacher: { select: { id: true, teacherName: true, user: { select: { name: true } } } },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        registrations: {
          include: {
            teacher: { select: { id: true, teacherName: true } }
          }
        },
        evaluations: {
          where: { evaluatorTeacherId: teacherId },
          select: { id: true, totalScore: true, rating: true, feedback: true, updatedAt: true }
        }
      },
      orderBy: { date: "desc" },
      take: 30
    })

    // Fetch available open slots for registration
    const todayStr = new Date().toISOString().split("T")[0]
    const rawAvailableSlots = await prisma.observationSlot.findMany({
      where: {
        date: { gte: todayStr },
        teacherId: { not: teacherId },
        registrations: { none: { teacherId } }
      },
      include: {
        teacher: { select: { id: true, teacherName: true } },
        subject: { select: { id: true, name: true } },
        class: { select: { id: true, name: true } },
        registrations: true
      },
      orderBy: { date: "asc" },
      take: 20
    })

    const formatSlot = (s: any) => {
      const isMyTeaching = s.teacherId === teacherId
      const myReg = s.registrations?.find((r: any) => r.teacherId === teacherId)
      const myEval = s.evaluations?.[0] || null

      let roleType = isMyTeaching ? "TEACHING" : "OBSERVING"
      let statusLabel = s.status || "OPEN"
      if (myReg) {
        statusLabel = myReg.status || "REGISTERED"
      }

      return {
        id: s.id,
        date: s.date,
        slotIndex: s.slotIndex || s.period || 1,
        time: s.time || "Tiết " + (s.slotIndex || s.period || 1),
        teacherName: s.teacher?.teacherName || s.teacher?.user?.name || "Giáo viên",
        teacherId: s.teacherId,
        subjectName: s.subject?.name || s.subjectName || "Môn học",
        className: s.class?.name || s.className || "Lớp học",
        room: s.room || "Phòng học",
        roleType,
        status: statusLabel,
        hasEvaluated: !!myEval,
        myEvaluation: myEval,
        observersCount: s.registrations?.length || 0
      }
    }

    return NextResponse.json({
      success: true,
      mySlots: rawMySlots.map(formatSlot),
      availableSlots: rawAvailableSlots.map(formatSlot)
    })
  } catch (error) {
    console.error("[API PWA Observations GET Error]:", error)
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

    const body = await req.json()
    const { slotId, scores, strengths, weaknesses, rating } = body

    if (!slotId) {
      return NextResponse.json({ error: "Missing slotId" }, { status: 400 })
    }

    const totalScore = Array.isArray(scores)
      ? scores.reduce((sum: number, val: any) => sum + (parseFloat(val) || 0), 0)
      : (parseFloat(body.totalScore) || 0)

    const criteriaText = JSON.stringify({
      scores: scores || [],
      strengths: strengths || "",
      weaknesses: weaknesses || ""
    })

    // Upsert observation evaluation
    const existing = await prisma.observationEvaluation.findFirst({
      where: {
        slotId,
        evaluatorTeacherId: teacher.id
      }
    })

    if (existing) {
      await prisma.observationEvaluation.update({
        where: { id: existing.id },
        data: {
          totalScore,
          rating: rating || (totalScore >= 18 ? "Tốt" : totalScore >= 14 ? "Khá" : "Đạt"),
          feedback: criteriaText,
          updatedAt: new Date()
        }
      })
    } else {
      await prisma.observationEvaluation.create({
        data: {
          slotId,
          evaluatorTeacherId: teacher.id,
          totalScore,
          rating: rating || (totalScore >= 18 ? "Tốt" : totalScore >= 14 ? "Khá" : "Đạt"),
          feedback: criteriaText
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: "Đã lưu phiếu đánh giá dự giờ thành công"
    })
  } catch (error) {
    console.error("[API PWA Observations POST Error]:", error)
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

    const body = await req.json()
    const { slotId } = body

    if (!slotId) {
      return NextResponse.json({ error: "Missing slotId" }, { status: 400 })
    }

    const existingReg = await prisma.observationRegistration.findFirst({
      where: { slotId, teacherId: teacher.id }
    })

    if (existingReg) {
      return NextResponse.json({ success: true, message: "Thầy/Cô đã đăng ký tiết này trước đó" })
    }

    await prisma.observationRegistration.create({
      data: {
        slotId,
        teacherId: teacher.id,
        status: "APPROVED"
      }
    })

    return NextResponse.json({
      success: true,
      message: "Đã đăng ký tham gia dự giờ thành công"
    })
  } catch (error) {
    console.error("[API PWA Observations PUT Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
