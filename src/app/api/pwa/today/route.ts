import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = ((session.user as any)?.role || "TEACHER").toUpperCase().trim()

    // 1. Fetch user & teacher info
    const dbUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teacher: {
          include: {
            campus: true,
            departmentRel: true,
            departmentAssignments: true,
          }
        }
      }
    })

    const teacher = dbUser?.teacher
    const teacherId = teacher?.id

    // Check if homeroom teacher (GVCN)
    let isGVCN = false
    let homeroomClassNames: string[] = []
    let homeroomClassIds: string[] = []

    if (teacherId) {
      const homeroomClasses = await prisma.class.findMany({
        where: {
          OR: [
            { homeroomTeacherId: teacherId },
            { homeroomTeacherId: { contains: teacherId } }
          ]
        },
        select: { id: true, name: true }
      }).catch(() => [])

      if (homeroomClasses.length > 0) {
        isGVCN = true
        homeroomClassNames = homeroomClasses.map(c => c.name)
        homeroomClassIds = homeroomClasses.map(c => c.id)
      }
    }

    const isTTCM = ["TTCM", "TPCM", "TO_TRUONG", "TO_PHO"].some(r => userRole.includes(r))
    const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GIAM_DOC_CO_SO"].some(r => userRole.includes(r))
    const isTBP = ["TBP", "TRUONG_BO_PHAN", "QLCM", "BAN_DHCM"].some(r => userRole.includes(r))

    // 2. Fetch Aggregated Metrics
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfWeek = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000)

    // A. Dự giờ (Observations)
    let upcomingObservations = 0
    let pendingObservationEvals = 0
    let myObservationProgress = "0/2"

    if (teacherId) {
      // Slots host or registered
      const upcomingRegs = await prisma.observationRegistration.count({
        where: {
          observerTeacherId: teacherId,
          status: { in: ["APPROVED", "CONFIRMED", "REGISTERED"] },
          slot: {
            date: { gte: startOfToday, lte: endOfWeek }
          }
        }
      }).catch(() => 0)

      const upcomingHost = await prisma.observationSlot.count({
        where: {
          hostTeacherId: teacherId,
          date: { gte: startOfToday, lte: endOfWeek }
        }
      }).catch(() => 0)

      upcomingObservations = upcomingRegs + upcomingHost

      // Pending evaluations where observed but evaluation not submitted
      pendingObservationEvals = await prisma.observationRegistration.count({
        where: {
          observerTeacherId: teacherId,
          status: "ATTENDED",
          evaluations: { none: {} }
        }
      }).catch(() => 0)

      // Active target progress
      const target = await prisma.teacherAcademicYearTarget.findFirst({
        where: { teacherId },
        orderBy: { createdAt: "desc" }
      }).catch(() => null)

      const completedCount = await prisma.observationRegistration.count({
        where: {
          observerTeacherId: teacherId,
          status: "COMPLETED"
        }
      }).catch(() => 0)

      myObservationProgress = `${completedCount}/${target?.targetQuantity || 2}`
    }

    // B. Cố vấn & Hỗ trợ (Advisory & Support)
    let pendingGoalUnlocks = 0
    let pendingHelpRequests = 0

    if (homeroomClassIds.length > 0) {
      pendingGoalUnlocks = await prisma.studentGoalUnlock.count({
        where: {
          status: "PENDING",
          goal: {
            student: {
              classId: { in: homeroomClassIds }
            }
          }
        }
      }).catch(() => 0)

      pendingHelpRequests = await prisma.studentHelpRequest.count({
        where: {
          status: "OPEN",
          student: {
            classId: { in: homeroomClassIds }
          }
        }
      }).catch(() => 0)
    }

    // C. Nhiệm vụ nội bộ (WorkTasks)
    const pendingWorkTasks = await prisma.workTask.count({
      where: {
        assignedToUserId: userId,
        progress: { in: ["PENDING", "IN_PROGRESS"] }
      }
    }).catch(() => 0)

    const overdueWorkTasks = await prisma.workTask.count({
      where: {
        assignedToUserId: userId,
        progress: { in: ["PENDING", "IN_PROGRESS"] },
        endDate: { lt: startOfToday }
      }
    }).catch(() => 0)

    // D. Học sinh cần chú ý (Attention Students)
    interface AttentionStudent {
      id: string
      studentCode: string
      fullName: string
      className: string
      reason: string
      severity: "urgent" | "attention" | "info"
      gapText?: string
      deepLink: string
    }

    const attentionStudents: AttentionStudent[] = []

    if (isGVCN && homeroomClassIds.length > 0) {
      // Find students with support targets or low scores in homeroom classes
      const supportStudents = await prisma.learningSupportTarget.findMany({
        where: {
          student: { classId: { in: homeroomClassIds } },
          status: "ACTIVE"
        },
        include: {
          student: {
            include: { class: true }
          }
        },
        take: 3
      }).catch(() => [])

      supportStudents.forEach(item => {
        if (item.student && !attentionStudents.some(s => s.id === item.student.id)) {
          attentionStudents.push({
            id: item.student.id,
            studentCode: item.student.studentCode,
            fullName: item.student.fullName,
            className: item.student.class?.name || homeroomClassNames[0] || "Lớp",
            reason: item.targetOutcome || "Đang trong diện hỗ trợ học tập",
            severity: "attention",
            gapText: "Hỗ trợ học tập",
            deepLink: `/teacher/ho-so-hoc-sinh?studentId=${item.student.id}`
          })
        }
      })
    }

    // If still less than 3, check recent open help requests
    if (attentionStudents.length < 3 && homeroomClassIds.length > 0) {
      const helpList = await prisma.studentHelpRequest.findMany({
        where: {
          student: { classId: { in: homeroomClassIds } },
          status: "OPEN"
        },
        include: {
          student: { include: { class: true } }
        },
        take: 3 - attentionStudents.length
      }).catch(() => [])

      helpList.forEach(item => {
        if (item.student && !attentionStudents.some(s => s.id === item.student.id)) {
          attentionStudents.push({
            id: item.student.id,
            studentCode: item.student.studentCode,
            fullName: item.student.fullName,
            className: item.student.class?.name || "Lớp",
            reason: item.content ? (item.content.length > 35 ? item.content.slice(0, 35) + "..." : item.content) : "Yêu cầu hỗ trợ học tập",
            severity: "urgent",
            gapText: "Cần trợ giúp",
            deepLink: `/teacher/co-van-hoc-tap?studentId=${item.student.id}`
          })
        }
      })
    }

    // E. Total Action Count Calculation
    const totalUrgent = pendingGoalUnlocks + overdueWorkTasks + pendingObservationEvals
    const totalAttention = upcomingObservations + pendingHelpRequests + pendingWorkTasks

    // F. Construct Pulse Data
    let pulseTitle = "MY PULSE"
    let pulseType: "GV" | "GVCN" | "TTCM" | "QLCM" | "GDCS" = "GV"
    let pulseHighlights: string[] = []

    if (isGDCS) {
      pulseTitle = "CAMPUS PULSE"
      pulseType = "GDCS"
      pulseHighlights = [
        `${dbUser?.teacher?.campus?.campusName || "Cơ sở"} ổn định`,
        `${upcomingObservations} lịch dự giờ tuần này`,
        `${totalUrgent} việc cần xử lý ngay`
      ]
    } else if (isTTCM || isTBP) {
      pulseTitle = "TCM PULSE"
      pulseType = "TTCM"
      pulseHighlights = [
        `Tiến độ dự giờ tổ: ${myObservationProgress} lượt`,
        `${upcomingObservations} tiết dự giờ sắp tới`,
        totalUrgent > 0 ? `${totalUrgent} việc cần duyệt/xử lý` : "Tất cả công việc đúng hạn"
      ]
    } else if (isGVCN) {
      pulseTitle = "GVCN PULSE"
      pulseType = "GVCN"
      pulseHighlights = [
        `Lớp ${homeroomClassNames.join(", ") || "Chủ nhiệm"}`,
        `${attentionStudents.length} học sinh cần chú ý`,
        totalUrgent > 0 ? `${totalUrgent} việc cần xử lý hôm nay` : "Tiến độ công việc ổn định"
      ]
    } else {
      pulseTitle = "MY PULSE"
      pulseType = "GV"
      pulseHighlights = [
        `Tiến độ dự giờ: ${myObservationProgress} lượt`,
        upcomingObservations > 0 ? `${upcomingObservations} lịch dự giờ tuần này` : "Không có lịch dự giờ hôm nay",
        totalUrgent > 0 ? `${totalUrgent} việc cần xử lý` : "Hoàn thành tốt công việc"
      ]
    }

    // G. Structured Action Items (Today Tasks)
    const actionItems = [
      {
        id: "task-observation",
        title: "Dự giờ & Thao giảng",
        count: upcomingObservations,
        badgeText: myObservationProgress,
        color: upcomingObservations > 0 ? "orange" : "blue",
        deepLink: "/teacher/du-gio?tab=overview_slots",
        urgent: pendingObservationEvals > 0,
        subtext: pendingObservationEvals > 0 ? `${pendingObservationEvals} phiếu chờ đánh giá` : `${upcomingObservations} tiết sắp tới`
      },
      {
        id: "task-advisory",
        title: "Cố vấn & Hỗ trợ HS",
        count: pendingGoalUnlocks + pendingHelpRequests,
        badgeText: `${pendingGoalUnlocks + pendingHelpRequests} việc`,
        color: (pendingGoalUnlocks + pendingHelpRequests) > 0 ? "red" : "blue",
        deepLink: "/teacher/co-van-hoc-tap",
        urgent: pendingGoalUnlocks > 0,
        subtext: pendingGoalUnlocks > 0 ? `${pendingGoalUnlocks} yêu cầu duyệt mở khóa` : "Theo dõi mục tiêu học sinh"
      },
      {
        id: "task-work",
        title: "Nhiệm vụ & Điều hành",
        count: pendingWorkTasks,
        badgeText: `${pendingWorkTasks} việc`,
        color: overdueWorkTasks > 0 ? "red" : "green",
        deepLink: "/teacher?tab=tasks",
        urgent: overdueWorkTasks > 0,
        subtext: overdueWorkTasks > 0 ? `${overdueWorkTasks} việc quá hạn!` : "Tiến độ đạt yêu cầu"
      }
    ]

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      user: {
        id: userId,
        fullName: dbUser?.fullName || "Thầy/Cô",
        role: userRole,
        isGVCN,
        isTTCM,
        isGDCS,
        isTBP,
        homeroomClassNames,
        campusName: teacher?.campus?.campusName || "Sky-Line Education",
        departmentName: teacher?.departmentRel?.name || ""
      },
      pulse: {
        title: pulseTitle,
        type: pulseType,
        completionRate: Math.max(70, Math.min(100, 100 - totalUrgent * 10)),
        urgentCount: totalUrgent,
        attentionCount: totalAttention,
        highlights: pulseHighlights
      },
      actionItems,
      attentionStudents,
      aiPromptSuggestion: isGVCN
        ? `Lớp ${homeroomClassNames[0] || ""} hôm nay có học sinh nào cần chú ý không?`
        : "Hôm nay tôi cần ưu tiên làm gì trước?"
    }, {
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate"
      }
    })
  } catch (error) {
    console.error("[API /api/pwa/today Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
