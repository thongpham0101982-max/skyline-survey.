import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/mail"
import { aggregateTeacherTasks } from "./index"
import { resolveTeacherAssignmentProfile } from "./assignmentMapper"
import { calculateTeacherProgressAndKPI } from "./kpiRulesEngine"
import { SSMTask } from "./types"

export interface ReminderEvaluationResult {
  userId: string
  teacherName: string
  evaluatedAt: string
  totalAssigned: number
  actionableCount: number
  overdueTasks: SSMTask[]
  dueSoonTasks: SSMTask[]
  waitingApprovalSkippedCount: number
  completedStoppedCount: number
  kpiAlerts: string[]
  digestSent: boolean
  channelsDispatched: Array<"SSM" | "EMAIL" | "PWA_PUSH">
  digestTitle?: string
  digestMessage?: string
  skippedReason?: string
}

export interface RunReminderOptions {
  enableEmailChannel?: boolean
  enablePwaChannel?: boolean
  forceDispatch?: boolean
  cooldownHours?: number
}

/**
 * Xóa bỏ thông tin định danh học sinh/PHHS (Zero PII Egress) khi tạo nội dung gửi ra kênh ngoài (Email/Push)
 */
export function sanitizeMessageForExternalChannel(rawText: string): string {
  return rawText
    .replace(/em\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+)*/g, "học sinh")
    .replace(/HS\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][^\s,(]+(?:\s+[^\s,(]+)*/g, "học sinh")
}

/**
 * Task Monitoring & Reminder Engine
 * Thực hiện 10 chức năng cốt lõi (Mục V):
 * 1. Theo dõi nhiệm vụ được phân công
 * 2. Kiểm tra hạn hoàn thành
 * 3. Đối chiếu tiến độ thực tế với tiến độ kỳ vọng
 * 4. Đối chiếu kết quả với định mức KPI
 * 5. Phát hiện việc chưa thực hiện, chưa hoàn thành hoặc quá hạn
 * 6. Theo dõi trạng thái đang chờ duyệt (WAITING) để tránh nhắc sai trách nhiệm
 * 7. Tự động tạo thông báo phù hợp với mức độ ưu tiên
 * 8. Ngừng nhắc khi công việc đã hoàn thành hợp lệ
 * 9. Lưu lịch sử nhắc và phản hồi (Notification & AuditLog)
 * 10. Tổng hợp thông báo (Digest) nhằm tránh gây phiền nhiễu cho giáo viên
 */
export async function evaluateAndDispatchTeacherReminders(
  userId: string,
  options?: RunReminderOptions
): Promise<ReminderEvaluationResult> {
  const now = new Date()
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const cooldownHours = options?.cooldownHours ?? 12
  const cooldownSince = new Date(now.getTime() - cooldownHours * 60 * 60 * 1000)
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  const profile = await resolveTeacherAssignmentProfile(userId)
  if (!profile) {
    return {
      userId,
      teacherName: "Không xác định",
      evaluatedAt: now.toISOString(),
      totalAssigned: 0,
      actionableCount: 0,
      overdueTasks: [],
      dueSoonTasks: [],
      waitingApprovalSkippedCount: 0,
      completedStoppedCount: 0,
      kpiAlerts: [],
      digestSent: false,
      channelsDispatched: [],
      skippedReason: "USER_PROFILE_NOT_FOUND",
    }
  }

  const { tasks } = await aggregateTeacherTasks(profile.userId, { includeCompleted: true })
  const kpi = await calculateTeacherProgressAndKPI(profile, tasks)

  // Chức năng 6: Tách riêng các nhiệm vụ đang chờ duyệt (WAITING) để KHÔNG nhắc sai trách nhiệm
  const waitingApprovalTasks = tasks.filter((t) => t.status === "WAITING")
  const completedTasks = tasks.filter((t) => t.status === "COMPLETED")

  // Chức năng 8: Tự động đánh dấu đã đọc các thông báo nhắc việc cũ nếu giáo viên đã hoàn thành hết việc quá hạn
  const actionableTasks = tasks.filter(
    (t) => t.status !== "COMPLETED" && t.status !== "CANCELLED" && t.status !== "WAITING"
  )

  if (actionableTasks.length === 0) {
    await prisma.notification.updateMany({
      where: {
        userId: profile.userId,
        isRead: false,
        title: { contains: "[Sổ Giáo Viên]" },
      },
      data: { isRead: true },
    }).catch(() => null)

    return {
      userId: profile.userId,
      teacherName: profile.teacherName,
      evaluatedAt: now.toISOString(),
      totalAssigned: tasks.length,
      actionableCount: 0,
      overdueTasks: [],
      dueSoonTasks: [],
      waitingApprovalSkippedCount: waitingApprovalTasks.length,
      completedStoppedCount: completedTasks.length,
      kpiAlerts: [],
      digestSent: false,
      channelsDispatched: [],
      skippedReason: "ALL_TASKS_COMPLETED_OR_WAITING_APPROVAL",
    }
  }

  // Chức năng 2, 3, 5: Phân loại nhiệm vụ quá hạn và sắp đến hạn (48h)
  const overdueTasks = actionableTasks.filter((t) => t.status === "OVERDUE")
  const dueSoonTasks = actionableTasks.filter((t) => {
    if (t.status === "OVERDUE") return false
    if (t.priority === "URGENT" || t.deadline.includes("Hôm nay") || t.deadline.includes("24h")) {
      return true
    }
    if (t.deadlineDate) {
      const d = new Date(t.deadlineDate)
      return d >= now && d <= in48Hours
    }
    return false
  })

  // Chức năng 4: Đối chiếu định mức KPI
  const kpiAlerts: string[] = []
  if (!kpi.kpiAttainment.observationQuota.isObservationMet) {
    kpiAlerts.push(
      `Còn thiếu ${kpi.kpiAttainment.observationQuota.deficitPeriods}/${kpi.kpiAttainment.observationQuota.requiredObservedQuota} tiết dự giờ định mức tháng ${kpi.kpiAttainment.observationQuota.currentMonth}`
    )
  }
  if (!kpi.kpiAttainment.gradebookQuota.isMet) {
    const missingClasses =
      kpi.kpiAttainment.gradebookQuota.totalAssignedClassesCount -
      kpi.kpiAttainment.gradebookQuota.completedClassesCount
    kpiAlerts.push(`Còn ${missingClasses} lớp bộ môn chưa hoàn tất 100% sổ điểm & nhận xét`)
  }
  if (kpi.teachingQuality.underBenchmarkCount > 0) {
    kpiAlerts.push(
      `Có ${kpi.teachingQuality.underBenchmarkCount} học sinh dưới chuẩn Benchmark cần theo dõi hỗ trợ`
    )
  }

  // Chức năng 10: Chống gửi thông báo trùng lặp (Anti-duplicate cooldown check)
  if (!options?.forceDispatch) {
    const existingRecentDigest = await prisma.notification.findFirst({
      where: {
        userId: profile.userId,
        createdAt: { gte: cooldownSince },
        message: { contains: `[DIGEST:${dateKey}]` },
      },
    }).catch(() => null)

    if (existingRecentDigest) {
      return {
        userId: profile.userId,
        teacherName: profile.teacherName,
        evaluatedAt: now.toISOString(),
        totalAssigned: tasks.length,
        actionableCount: actionableTasks.length,
        overdueTasks,
        dueSoonTasks,
        waitingApprovalSkippedCount: waitingApprovalTasks.length,
        completedStoppedCount: completedTasks.length,
        kpiAlerts,
        digestSent: false,
        channelsDispatched: [],
        skippedReason: "DIGEST_ALREADY_SENT_IN_COOLDOWN_WINDOW",
      }
    }
  }

  // Chức năng 7 & 10: Tổng hợp thông báo theo mức độ ưu tiên
  const isUrgentAlert = overdueTasks.length > 0 || dueSoonTasks.some((t) => t.priority === "URGENT")
  const notifType = overdueTasks.length > 0 ? "WARNING" : isUrgentAlert ? "ACTION" : "INFO"

  const digestTitle =
    overdueTasks.length > 0
      ? `[Sổ Giáo Viên] ⚠️ ${overdueTasks.length} nhiệm vụ quá hạn & ${dueSoonTasks.length} việc cần xử lý hôm nay`
      : `[Sổ Giáo Viên] 📋 Tổng hợp nhiệm vụ ngày ${now.toLocaleDateString("vi-VN")} (${actionableTasks.length} việc)`

  const summaryParts: string[] = []
  if (overdueTasks.length > 0) {
    summaryParts.push(`• Quá hạn (${overdueTasks.length}): ${overdueTasks.slice(0, 2).map((t) => t.title).join("; ")}`)
  }
  if (dueSoonTasks.length > 0) {
    summaryParts.push(`• Cần làm ngay (${dueSoonTasks.length}): ${dueSoonTasks.slice(0, 2).map((t) => t.title).join("; ")}`)
  }
  if (kpiAlerts.length > 0) {
    summaryParts.push(`• Chỉ tiêu KPI: ${kpiAlerts.join("; ")}`)
  }
  if (waitingApprovalTasks.length > 0) {
    summaryParts.push(`• Đang chờ cấp trên phê duyệt: ${waitingApprovalTasks.length} mục (Hệ thống tạm ngừng nhắc)`)
  }
  summaryParts.push(`[DIGEST:${dateKey}]`)

  const digestMessage = summaryParts.join("\n")
  const channelsDispatched: Array<"SSM" | "EMAIL" | "PWA_PUSH"> = []

  // Kênh 1 (Ưu tiên số 1): SSM In-App Notification
  try {
    await prisma.notification.create({
      data: {
        userId: profile.userId,
        title: digestTitle,
        message: digestMessage,
        type: notifType,
        link: "/teacher/tasks",
        isRead: false,
      },
    })
    channelsDispatched.push("SSM")
  } catch (err) {
    console.warn("[ReminderEngine] Failed to create SSM notification:", err)
  }

  // Kênh 2 (Ưu tiên số 2): Email (Chỉ gửi khi có việc quá hạn/khẩn cấp và bật kênh Email, tuân thủ Zero PII Egress)
  if (options?.enableEmailChannel && profile.email && isUrgentAlert) {
    try {
      const safeExternalSummary = sanitizeMessageForExternalChannel(
        summaryParts.filter((p) => !p.startsWith("[DIGEST:")).join("<br/>")
      )
      const emailRes = await sendEmail({
        to: profile.email,
        subject: `[Sky-line SMS] Nhắc việc Sổ Giáo Viên ngày ${now.toLocaleDateString("vi-VN")}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.6;">
            <h3 style="color: #003B3A;">Kính gửi Thầy/Cô ${profile.teacherName},</h3>
            <p>Hệ thống Sổ Giáo Viên Sky-Line gửi bản tổng hợp tiến độ công việc cần ưu tiên xử lý:</p>
            <div style="background: #f8fafc; border-left: 4px solid #00A19A; padding: 12px 16px; margin: 16px 0;">
              ${safeExternalSummary}
            </div>
            <p style="font-size: 12px; color: #64748b;">
              * Lưu ý bảo mật: Email này không đính kèm thông tin định danh cá nhân của học sinh/PHHS. Vui lòng đăng nhập hệ thống SSM (Sổ Giáo Viên) để xử lý chi tiết.
            </p>
          </div>
        `,
        throwOnError: false,
      })
      if (emailRes.success) {
        channelsDispatched.push("EMAIL")
      }
    } catch (err) {
      console.warn("[ReminderEngine] Email channel skipped:", err)
    }
  }

  // Chức năng 9: Ghi nhận AuditLog để kiểm toán lịch sử nhắc việc
  try {
    await prisma.auditLog.create({
      data: {
        action: "TASK_REMINDER_DISPATCH",
        targetId: profile.userId,
        userId: profile.userId,
        details: JSON.stringify({
          dateKey,
          totalAssigned: tasks.length,
          actionableCount: actionableTasks.length,
          overdueCount: overdueTasks.length,
          dueSoonCount: dueSoonTasks.length,
          waitingSkippedCount: waitingApprovalTasks.length,
          channelsDispatched,
        }),
      },
    })
  } catch (err) {
    console.warn("[ReminderEngine] AuditLog write skipped:", err)
  }

  return {
    userId: profile.userId,
    teacherName: profile.teacherName,
    evaluatedAt: now.toISOString(),
    totalAssigned: tasks.length,
    actionableCount: actionableTasks.length,
    overdueTasks,
    dueSoonTasks,
    waitingApprovalSkippedCount: waitingApprovalTasks.length,
    completedStoppedCount: completedTasks.length,
    kpiAlerts,
    digestSent: channelsDispatched.length > 0,
    channelsDispatched,
    digestTitle,
    digestMessage,
  }
}

/**
 * Lấy lịch sử nhắc việc và phản hồi của giáo viên từ bảng Notification & AuditLog
 */
export async function getTeacherReminderHistory(userId: string, limit = 15) {
  const notifications = await prisma.notification.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: "[Sổ Giáo Viên]" } },
        { link: { contains: "/teacher/" } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  }).catch(() => [])

  return notifications.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message.replace(/\n?\[DIGEST:[^\]]+\]/g, ""),
    type: n.type,
    link: n.link || "/teacher/tasks",
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }))
}
