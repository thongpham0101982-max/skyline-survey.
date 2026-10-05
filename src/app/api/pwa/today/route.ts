import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { aggregateUserTasks } from "@/services/taskEngine"

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

    // 2. Fetch Aggregated Tasks from Task Engine
    const { tasks, counts } = await aggregateUserTasks(userId, userRole)

    // 3. Học sinh cần chú ý (Attention Students)
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
            fullName: item.student.studentName,
            className: item.student.class?.className || homeroomClassNames[0] || "Lớp",
            reason: item.targetOutcome || "Đang trong diện hỗ trợ học tập",
            severity: "attention",
            gapText: "Hỗ trợ học tập",
            deepLink: `/teacher/ho-so-hoc-sinh?studentId=${item.student.id}`
          })
        }
      })
    }

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
            fullName: item.student.studentName,
            className: item.student.class?.className || "Lớp",
            reason: item.content ? (item.content.length > 35 ? item.content.slice(0, 35) + "..." : item.content) : "Yêu cầu hỗ trợ học tập",
            severity: "urgent",
            gapText: "Cần trợ giúp",
            deepLink: `/teacher/co-van-hoc-tap?studentId=${item.student.id}`
          })
        }
      })
    }

    // 4. Construct Pulse Data
    let pulseTitle = "MY PULSE"
    let pulseType: "GV" | "GVCN" | "TTCM" | "QLCM" | "GDCS" = "GV"
    let pulseHighlights: string[] = []

    const duGioCount = counts.byModule.DU_GIO || 0
    const coVanCount = counts.byModule.CO_VAN || 0
    const hoTroCount = counts.byModule.HO_TRO || 0
    const congTacCount = counts.byModule.CONG_TAC || 0

    if (isGDCS) {
      pulseTitle = "CAMPUS PULSE"
      pulseType = "GDCS"
      pulseHighlights = [
        `${dbUser?.teacher?.campus?.campusName || "Cơ sở"} hoạt động ổn định`,
        `${duGioCount} lịch dự giờ & thao giảng`,
        counts.overdue > 0 ? `${counts.overdue} việc quá hạn cần đôn đốc` : "Các bộ phận đúng tiến độ"
      ]
    } else if (isTTCM || isTBP) {
      pulseTitle = "TCM PULSE"
      pulseType = "TTCM"
      pulseHighlights = [
        `Tổ chuyên môn: ${duGioCount} lượt dự giờ`,
        counts.overdue > 0 ? `${counts.overdue} việc cần duyệt/xử lý gấp` : "Tiến độ chuyên môn đạt chuẩn",
        `${attentionStudents.length} học sinh cần lưu ý`
      ]
    } else if (isGVCN) {
      pulseTitle = "GVCN PULSE"
      pulseType = "GVCN"
      pulseHighlights = [
        `Lớp ${homeroomClassNames.join(", ") || "Chủ nhiệm"}`,
        `${attentionStudents.length} học sinh cần chú ý`,
        counts.today > 0 ? `${counts.today} việc cần xử lý hôm nay` : "Tiến độ công việc ổn định"
      ]
    } else {
      pulseTitle = "MY PULSE"
      pulseType = "GV"
      pulseHighlights = [
        duGioCount > 0 ? `${duGioCount} lịch dự giờ & chuyên môn` : "Tiến độ chuyên môn đạt chuẩn",
        counts.overdue > 0 ? `${counts.overdue} việc quá hạn` : "Hoàn thành tốt nhiệm vụ",
        `${counts.thisWeek} nhiệm vụ trong tuần`
      ]
    }

    // 5. Structured Action Items (Top Actions from Tasks)
    const actionItems = [
      {
        id: "task-observation",
        title: "Dự giờ & Thao giảng",
        count: duGioCount,
        badgeText: `${duGioCount} lượt`,
        color: duGioCount > 0 ? "orange" : "blue",
        deepLink: "/teacher/du-gio?tab=overview_slots",
        urgent: tasks.some(t => t.sourceModule === "DU_GIO" && (t.priority === "URGENT" || t.status === "OVERDUE")),
        subtext: tasks.find(t => t.sourceModule === "DU_GIO")?.title || `${duGioCount} lịch sắp tới`
      },
      {
        id: "task-advisory",
        title: "Cố vấn & Hỗ trợ HS",
        count: coVanCount + hoTroCount,
        badgeText: `${coVanCount + hoTroCount} việc`,
        color: (coVanCount + hoTroCount) > 0 ? "red" : "blue",
        deepLink: "/teacher/co-van-hoc-tap",
        urgent: tasks.some(t => (t.sourceModule === "CO_VAN" || t.sourceModule === "HO_TRO") && t.priority === "URGENT"),
        subtext: tasks.find(t => t.sourceModule === "CO_VAN" || t.sourceModule === "HO_TRO")?.title || "Theo dõi mục tiêu học sinh"
      },
      {
        id: "task-work",
        title: "Nhiệm vụ & Điều hành",
        count: congTacCount,
        badgeText: `${congTacCount} việc`,
        color: counts.overdue > 0 ? "red" : "green",
        deepLink: "/teacher/tasks",
        urgent: counts.overdue > 0,
        subtext: counts.overdue > 0 ? `${counts.overdue} việc quá hạn!` : "Tiến độ đạt yêu cầu"
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
        completionRate: Math.max(65, Math.min(100, 100 - counts.overdue * 15)),
        urgentCount: counts.overdue,
        attentionCount: counts.today,
        highlights: pulseHighlights
      },
      actionItems,
      attentionStudents,
      taskCounts: counts,
      aiPromptSuggestion: isGVCN
        ? `Lớp ${homeroomClassNames[0] || ""} hôm nay có học sinh nào cần chú ý không?`
        : counts.overdue > 0
        ? "Tôi có những việc nào quá hạn cần xử lý gấp?"
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
