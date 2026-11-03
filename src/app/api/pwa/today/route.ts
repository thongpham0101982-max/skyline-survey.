import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  aggregateTeacherTasks,
  resolveTeacherAssignmentProfile,
  calculateTeacherProgressAndKPI,
} from "@/services/taskEngine"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const userRole = ((session.user as any)?.role || "TEACHER").toUpperCase().trim()

    const profile = await resolveTeacherAssignmentProfile(userId)
    const { tasks, counts } = await aggregateTeacherTasks(userId)
    const progressAndKPI = profile ? await calculateTeacherProgressAndKPI(profile, tasks) : null

    const isGVCN = Boolean(profile?.rolesDetected.isGVCN)
    const isTTCM = Boolean(profile?.rolesDetected.isTTCM)
    const isTBP = Boolean(profile?.rolesDetected.isTBP)
    const isGDCS = Boolean(profile?.rolesDetected.isGDCS)

    const homeroomClassNames = profile?.homeroomClasses.map((c) => c.className) || []
    const homeroomClassIds = profile?.homeroomClasses.map((c) => c.id) || []

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

    if (homeroomClassIds.length > 0) {
      const [advisoryList, helpList, supportStudents] = await Promise.all([
        prisma.studentAdvisoryStatus.findMany({
          where: {
            student: { classId: { in: homeroomClassIds }, status: "ACTIVE" },
            statusColor: { in: ["RED", "YELLOW"] },
          },
          include: {
            student: { include: { class: true } },
          },
          take: 3,
        }).catch(() => []),

        prisma.studentHelpRequest.findMany({
          where: {
            student: { classId: { in: homeroomClassIds } },
            status: { in: ["PENDING", "PROCESSING"] },
          },
          include: {
            student: { include: { class: true } },
          },
          take: 3,
        }).catch(() => []),

        prisma.learningSupportTarget.findMany({
          where: {
            student: { classId: { in: homeroomClassIds } },
            status: "ACTIVE",
          },
          include: {
            student: { include: { class: true } },
          },
          take: 3,
        }).catch(() => []),
      ])

      for (const adv of advisoryList) {
        if (adv.student && !attentionStudents.some((s) => s.id === adv.student.id)) {
          attentionStudents.push({
            id: adv.student.id,
            studentCode: adv.student.studentCode,
            fullName: adv.student.studentName,
            className: adv.student.class?.className || homeroomClassNames[0] || "Lớp",
            reason: adv.reasonDetail || adv.reasonCategory || "Cảnh báo học tập / cố vấn",
            severity: adv.statusColor === "RED" ? "urgent" : "attention",
            gapText: adv.statusColor === "RED" ? "Cảnh báo Đỏ" : "Cảnh báo Vàng",
            deepLink: `/teacher/co-van-hoc-tap/${adv.student.id}`,
          })
        }
      }

      for (const item of helpList) {
        if (attentionStudents.length >= 4) break
        if (item.student && !attentionStudents.some((s) => s.id === item.student.id)) {
          attentionStudents.push({
            id: item.student.id,
            studentCode: item.student.studentCode,
            fullName: item.student.studentName,
            className: item.student.class?.className || "Lớp",
            reason: item.content
              ? item.content.length > 45
                ? item.content.slice(0, 45) + "..."
                : item.content
              : "Yêu cầu trợ giúp học tập",
            severity: "urgent",
            gapText: "Cần trợ giúp",
            deepLink: `/teacher/co-van-hoc-tap/${item.student.id}`,
          })
        }
      }

      for (const item of supportStudents) {
        if (attentionStudents.length >= 4) break
        if (item.student && !attentionStudents.some((s) => s.id === item.student.id)) {
          attentionStudents.push({
            id: item.student.id,
            studentCode: item.student.studentCode,
            fullName: item.student.studentName,
            className: item.student.class?.className || homeroomClassNames[0] || "Lớp",
            reason: item.outcome || item.reason || "Đang trong diện bồi dưỡng & hỗ trợ học tập",
            severity: "attention",
            gapText: "Bồi dưỡng HS",
            deepLink: `/teacher/ho-so-hoc-sinh?studentId=${item.student.id}`,
          })
        }
      }
    }

    const duGioCount = counts.byModule.DU_GIO || 0
    const coVanCount = (counts.byModule.CO_VAN || 0) + (counts.byModule.Y_KIEN_PHHS || 0)
    const clgdCount =
      (counts.byModule.CHAT_LUONG_GIANG_DAY || 0) +
      (counts.byModule.LOP_CHU_NHIEM || 0) +
      (counts.byModule.MON_DAC_THU || 0)

    let pulseTitle = "MY PULSE"
    let pulseType: "GV" | "GVCN" | "TTCM" | "QLCM" | "GDCS" = "GV"
    let pulseHighlights: string[] = []

    if (isGDCS) {
      pulseTitle = "CAMPUS PULSE"
      pulseType = "GDCS"
      pulseHighlights = [
        `${profile?.campuses[0]?.campusName || "Cơ sở"} hoạt động ổn định`,
        `${duGioCount} lịch dự giờ & thao giảng`,
        counts.overdue > 0 ? `${counts.overdue} việc quá hạn cần đôn đốc` : "Các bộ phận đúng tiến độ",
      ]
    } else if (isTTCM || isTBP) {
      pulseTitle = "TCM PULSE"
      pulseType = "TTCM"
      pulseHighlights = [
        `Tổ chuyên môn: ${duGioCount} nhiệm vụ dự giờ & KPI`,
        counts.overdue > 0 ? `${counts.overdue} việc cần duyệt/xử lý gấp` : "Tiến độ chuyên môn đạt chuẩn",
        `${attentionStudents.length} học sinh cần lưu ý`,
      ]
    } else if (isGVCN) {
      pulseTitle = "GVCN PULSE"
      pulseType = "GVCN"
      pulseHighlights = [
        `Chủ nhiệm: ${homeroomClassNames.join(", ") || "Lớp phụ trách"}`,
        `${attentionStudents.length} học sinh cần chú ý`,
        counts.today > 0 ? `${counts.today} việc cần xử lý hôm nay` : "Tiến độ công việc ổn định",
      ]
    } else {
      pulseTitle = "MY PULSE"
      pulseType = "GV"
      pulseHighlights = [
        duGioCount > 0 ? `${duGioCount} nhiệm vụ dự giờ & KPI` : "Định mức dự giờ đạt chuẩn",
        counts.overdue > 0 ? `${counts.overdue} việc quá hạn` : "Hoàn thành tốt nhiệm vụ",
        `${counts.thisWeek} nhiệm vụ trong tuần`,
      ]
    }

    const actionItems = [
      {
        id: "task-quality-gradebook",
        title: "Sổ điểm & Chất lượng môn",
        count: clgdCount,
        badgeText: `${clgdCount} việc`,
        color: clgdCount > 0 ? "orange" : "green",
        deepLink: "/teacher/so-diem-nhan-xet",
        urgent: tasks.some(
          (t) =>
            (t.sourceModule === "CHAT_LUONG_GIANG_DAY" || t.sourceModule === "LOP_CHU_NHIEM") &&
            (t.priority === "URGENT" || t.status === "OVERDUE")
        ),
        subtext:
          tasks.find((t) => t.sourceModule === "CHAT_LUONG_GIANG_DAY" || t.sourceModule === "LOP_CHU_NHIEM")
            ?.title || "Tiến độ sổ điểm & ĐGNL đạt chuẩn",
      },
      {
        id: "task-observation",
        title: "Dự giờ & Chỉ tiêu KPI",
        count: duGioCount,
        badgeText: `${duGioCount} mục`,
        color: duGioCount > 0 ? "orange" : "blue",
        deepLink: "/teacher/du-gio",
        urgent: tasks.some(
          (t) => t.sourceModule === "DU_GIO" && (t.priority === "URGENT" || t.status === "OVERDUE")
        ),
        subtext: tasks.find((t) => t.sourceModule === "DU_GIO")?.title || "Theo dõi định mức dự giờ tháng",
      },
      {
        id: "task-advisory",
        title: "Cố vấn & Ý kiến PHHS",
        count: coVanCount,
        badgeText: `${coVanCount} việc`,
        color: coVanCount > 0 ? "red" : "blue",
        deepLink: "/teacher/co-van-hoc-tap",
        urgent: tasks.some(
          (t) =>
            (t.sourceModule === "CO_VAN" || t.sourceModule === "Y_KIEN_PHHS") && t.priority === "URGENT"
        ),
        subtext:
          tasks.find((t) => t.sourceModule === "CO_VAN" || t.sourceModule === "Y_KIEN_PHHS")?.title ||
          "Theo dõi mục tiêu SMART & phản hồi PHHS",
      },
    ]

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        user: {
          id: userId,
          fullName: profile?.teacherName || "Thầy/Cô",
          role: userRole,
          isGVCN,
          isTTCM,
          isGDCS,
          isTBP,
          homeroomClassNames,
          campusName: profile?.campuses[0]?.campusName || "Sky-Line Education",
          departmentName: profile?.managedDepartmentNames[0] || "",
        },
        pulse: {
          title: pulseTitle,
          type: pulseType,
          completionRate:
            progressAndKPI?.volumeProgress.completionRate ??
            Math.max(65, Math.min(100, 100 - counts.overdue * 15)),
          urgentCount: counts.overdue,
          attentionCount: counts.today,
          highlights: pulseHighlights,
        },
        actionItems,
        attentionStudents,
        taskCounts: counts,
        progressAndKPI,
        aiPromptSuggestion: "Hôm nay tôi cần làm gì?",
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    )
  } catch (error) {
    console.error("[API /api/pwa/today Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
