import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/mail"
import { renderSkylineEmail } from "@/lib/email-templates"
import { resolveQaAppBaseUrl } from "./emailService"
import {
  computeWeeksOfMonthSync,
  ensureKtdbclWeeklySchema,
  getKtdbclAutomationConfig,
  getWeeklyItemMetaMap,
  hasAutomationDedupKey,
  KtdbclMemberProfile,
  normalizeStaffEmail,
  recordWeeklyAutomationLog,
  resolveCurrentWeekInMonth,
  resolveKtdbclRoster,
} from "./weeklyReportSchema"
import {
  generateKtdbclAiQualityReport,
  KtdbclAiQualityReport,
} from "./weeklyAiQualityAgent"

function escapeHtml(raw?: string | null): string {
  if (!raw) return ""
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function formatRatingVi(rating?: string | null): string {
  switch (rating) {
    case "EXCELLENT":
      return "Xuất sắc"
    case "GOOD":
      return "Hoàn thành tốt"
    case "SATISFACTORY":
      return "Đạt yêu cầu"
    case "NEEDS_IMPROVEMENT":
      return "Cần cải thiện"
    default:
      return "Đã xác nhận hoàn thành"
  }
}

/**
 * 1. Tự động nhắc nhở thành viên Ban KT&ĐBCL nộp báo cáo tuần vào Thứ 4, 14:00 hằng tuần trong tháng
 */
export async function dispatchKtdbclWednesdayReminders(options?: {
  weekNumber?: number
  month?: number
  year?: number
  targetUserId?: string
  force?: boolean
  triggeredBy?: string
}): Promise<{
  success: boolean
  skipped?: boolean
  skipReason?: string
  weekNumber: number
  month: number
  year: number
  totalStaff: number
  submittedCount: number
  pendingCount: number
  remindedCount: number
  emailSentCount: number
}> {
  await ensureKtdbclWeeklySchema()
  const config = await getKtdbclAutomationConfig()
  const currentPeriod = resolveCurrentWeekInMonth(new Date())

  const year = options?.year || currentPeriod.year
  const month = options?.month || currentPeriod.month
  const weekNumber = options?.weekNumber || currentPeriod.weekNumber
  const allWeeks = computeWeeksOfMonthSync(month, year)
  const weekDef =
    allWeeks.find((w) => w.weekNum === weekNumber) ||
    allWeeks[0] || {
      weekNum: weekNumber,
      startDisplay: `Tuần ${weekNumber}`,
      endDisplay: `Tháng ${month}/${year}`,
      label: `Tuần ${weekNumber} (Tháng ${month}/${year})`,
    }

  const triggeredBy = options?.triggeredBy || "SYSTEM_CRON"
  const isManual = Boolean(options?.force || options?.targetUserId)

  if (!isManual && !config.wednesdayReminderEnabled) {
    return {
      success: true,
      skipped: true,
      skipReason: "Cấu hình tự động nhắc Thứ 4 (14:00) đang tạm tắt.",
      weekNumber,
      month,
      year,
      totalStaff: 0,
      submittedCount: 0,
      pendingCount: 0,
      remindedCount: 0,
      emailSentCount: 0,
    }
  }

  const dedupKey = `WED_REMIND_${year}_M${month}_W${weekNumber}`
  if (!isManual) {
    const alreadyRun = await hasAutomationDedupKey(dedupKey)
    if (alreadyRun) {
      return {
        success: true,
        skipped: true,
        skipReason: `Đã thực hiện nhắc tự động cho ${weekDef.label}.`,
        weekNumber,
        month,
        year,
        totalStaff: 0,
        submittedCount: 0,
        pendingCount: 0,
        remindedCount: 0,
        emailSentCount: 0,
      }
    }
  }

  const roster = await resolveKtdbclRoster()
  const targetMembers = options?.targetUserId
    ? roster.members.filter((m) => m.id === options.targetUserId)
    : roster.members

  if (targetMembers.length === 0) {
    return {
      success: true,
      weekNumber,
      month,
      year,
      totalStaff: 0,
      submittedCount: 0,
      pendingCount: 0,
      remindedCount: 0,
      emailSentCount: 0,
    }
  }

  const memberIds = targetMembers.map((m) => m.id)
  const [submittedReports, openWorkTasks] = await Promise.all([
    prisma.weeklyReport.findMany({
      where: {
        weekNumber,
        month,
        year,
        status: { in: ["SUBMITTED", "REVIEWED"] },
        userId: { in: memberIds },
      },
      select: { userId: true },
    }),
    prisma.workTask.findMany({
      where: {
        assignedToUserId: { in: memberIds },
        progress: { not: "CANCELLED" },
      },
      select: {
        id: true,
        title: true,
        progress: true,
        endDate: true,
        assignedToUserId: true,
        taskGroup: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 150,
    }),
  ])

  const submittedSet = new Set(submittedReports.map((r) => r.userId))
  const pendingMembers = targetMembers.filter((m) => !submittedSet.has(m.id))
  const appBaseUrl = resolveQaAppBaseUrl()
  const composeUrl = `${appBaseUrl}/admin/weekly-reports?tab=compose&week=${weekNumber}&month=${month}&year=${year}`

  let notificationCount = 0
  let emailSentCount = 0

  for (const member of pendingMembers) {
    const myTasks = openWorkTasks
      .filter((t) => t.assignedToUserId === member.id)
      .slice(0, 5)

    // 1. In-app Notification
    await prisma.notification
      .create({
        data: {
          userId: member.id,
          title: `[Ban KT&ĐBCL] Nhắc nộp Báo cáo Tuần ${weekNumber} • Tháng ${month}/${year}`,
          message: `Hệ thống nhắc định kỳ Thứ Tư (14:00): Vui lòng hoàn thành và gửi Báo cáo công việc ${weekDef.label} của Ban KT&ĐBCL.`,
          isRead: false,
          link: `/admin/weekly-reports?tab=compose&week=${weekNumber}&month=${month}&year=${year}`,
        },
      })
      .then(() => {
        notificationCount++
      })
      .catch(() => {})

    // 2. Email Reminder
    if (member.email) {
      let taskPreviewHtml = ""
      if (myTasks.length > 0) {
        const rows = myTasks
          .map(
            (t, idx) => `
            <tr>
              <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #334155;">${idx + 1}. <strong>${escapeHtml(
                t.title
              )}</strong></td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #00736E;">${escapeHtml(
                t.taskGroup?.name || "KT&ĐBCL"
              )}</td>
              <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #475569;">${
                t.progress === "COMPLETED" ? "Hoàn thành" : "Đang thực hiện"
              }</td>
            </tr>`
          )
          .join("")

        taskPreviewHtml = `
          <div style="margin-top: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #003B3A;">
              Đầu việc của Thầy/Cô trên QA Workspace (có thể đồng bộ 1 chạm vào báo cáo tuần):
            </p>
            <table style="width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background-color: #003B3A; color: #FFFFFF; text-align: left; font-size: 11px;">
                  <th style="padding: 8px 10px;">Nội dung nhiệm vụ</th>
                  <th style="padding: 8px 10px;">Nhóm chuyên môn</th>
                  <th style="padding: 8px 10px;">Trạng thái</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`
      }

      const html = renderSkylineEmail({
        headerBadge: "BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG",
        headerTitle: `Nhắc nộp Báo cáo Tuần ${weekNumber} • Tháng ${month}/${year}`,
        headerSubtitle: "Lịch nhắc định kỳ Thứ Tư lúc 14:00 hằng tuần trong tháng",
        headerTheme: "teal",
        recipientName: member.fullName,
        introMessage: `Hệ thống Quản trị Chất lượng Công việc **Ban KT&ĐBCL** trân trọng nhắc Thầy/Cô hoàn thành và gửi **Báo cáo công việc ${weekDef.label}** để kịp thời tổng hợp trình Giám đốc Ban.`,
        detailsTitle: "Thông tin kỳ báo cáo",
        details: [
          { label: "Bộ phận chuyên môn", value: "Ban Khảo thí & Đảm bảo Chất lượng (KT&ĐBCL)", highlight: true },
          {
            label: "Nhóm phụ trách",
            value: member.specialistGroups.length > 0 ? member.specialistGroups.join(", ") : "Chuyên viên Ban KT&ĐBCL",
          },
          { label: "Kỳ báo cáo", value: `${weekDef.label} — Năm ${year}` },
          { label: "Khung giờ nhắc định kỳ", value: "14:00 Thứ Tư hằng tuần", color: "#D97706" },
        ],
        noticeBox: {
          type: "info",
          title: "Mẹo lập báo cáo nhanh",
          content:
            "Thầy/Cô có thể nhấn nút \"Đồng bộ đầu việc từ QA Workspace\" ngay trong màn hình Lập báo cáo để tự động điền các nhiệm vụ được giao mà không cần nhập lại thủ công.",
        },
        extraHtml: taskPreviewHtml,
        button: {
          text: "Mở trang Lập báo cáo Tuần ngay",
          url: composeUrl,
          color: "#003B3A",
        },
      })

      const mailRes = await sendEmail({
        to: member.email,
        subject: `[Ban KT&ĐBCL] Nhắc nộp Báo cáo công việc Tuần ${weekNumber}/Tháng ${month} (Thứ Tư 14:00)`,
        html,
      })
      if (mailRes.success) emailSentCount++
    }
  }

  await recordWeeklyAutomationLog({
    jobType: "WEDNESDAY_REMINDER",
    dedupKey: isManual ? `${dedupKey}_MANUAL_${Date.now()}` : dedupKey,
    periodLabel: `Tuần ${weekNumber} • Tháng ${month}/${year}`,
    recipientSummary: `${pendingMembers.length} thành viên chưa nộp (${emailSentCount} email)`,
    emailSentCount,
    notificationCount,
    triggeredBy,
    status: pendingMembers.length === 0 || emailSentCount > 0 || notificationCount > 0 ? "SUCCESS" : "PARTIAL",
    details: {
      totalStaff: roster.members.length,
      submittedCount: submittedSet.size,
      pendingNames: pendingMembers.map((m) => m.fullName),
    },
  })

  return {
    success: true,
    weekNumber,
    month,
    year,
    totalStaff: targetMembers.length,
    submittedCount: submittedSet.size,
    pendingCount: pendingMembers.length,
    remindedCount: notificationCount,
    emailSentCount,
  }
}

/**
 * 2. Tự động tổng hợp và gửi Báo cáo công việc Tuần / Tháng kèm Phân tích AI Agent cho Giám đốc Ban KT&ĐBCL
 */
export async function dispatchDirectorSummaryReport(options: {
  scopeType: "WEEKLY" | "MONTHLY"
  weekNumber?: number
  month?: number
  year?: number
  force?: boolean
  triggeredBy?: string
  overrideEmails?: string[]
}): Promise<{
  success: boolean
  skipped?: boolean
  skipReason?: string
  recipientEmails: string[]
  emailSentCount: number
  aiReport: KtdbclAiQualityReport | null
  error?: string
}> {
  await ensureKtdbclWeeklySchema()
  const config = await getKtdbclAutomationConfig()
  const currentPeriod = resolveCurrentWeekInMonth(new Date())

  const scopeType = options.scopeType
  const year = options.year || currentPeriod.year
  const month = options.month || currentPeriod.month
  const weekNumber = scopeType === "WEEKLY" ? options.weekNumber || currentPeriod.weekNumber : null
  const isManual = Boolean(options.force)
  const triggeredBy = options.triggeredBy || "SYSTEM_CRON"

  if (!isManual) {
    if (scopeType === "WEEKLY" && !config.weeklyDirectorReportEnabled) {
      return {
        success: true,
        skipped: true,
        skipReason: "Cấu hình tự động gửi Báo cáo Tuần cho Giám đốc Ban đang tạm tắt.",
        recipientEmails: [],
        emailSentCount: 0,
        aiReport: null,
      }
    }
    if (scopeType === "MONTHLY" && !config.monthlyDirectorReportEnabled) {
      return {
        success: true,
        skipped: true,
        skipReason: "Cấu hình tự động gửi Báo cáo Tháng cho Giám đốc Ban đang tạm tắt.",
        recipientEmails: [],
        emailSentCount: 0,
        aiReport: null,
      }
    }
  }

  const dedupKey =
    scopeType === "WEEKLY"
      ? `DIR_WEEKLY_${year}_M${month}_W${weekNumber}`
      : `DIR_MONTHLY_${year}_M${month}`

  if (!isManual && (await hasAutomationDedupKey(dedupKey))) {
    return {
      success: true,
      skipped: true,
      skipReason: "Báo cáo định kỳ này đã được gửi tự động cho Giám đốc Ban trước đó.",
      recipientEmails: [],
      emailSentCount: 0,
      aiReport: null,
    }
  }

  const roster = await resolveKtdbclRoster()
  const memberIds = roster.members.map((m) => m.id)
  const allWeeks = computeWeeksOfMonthSync(month, year)
  const expectedWeeksCount =
    scopeType === "WEEKLY" ? 1 : Math.max(1, Math.min(allWeeks.length, currentPeriod.month === month ? currentPeriod.weekNumber : allWeeks.length))

  const [reports, taskCategories, workTasks] = await Promise.all([
    prisma.weeklyReport.findMany({
      where: {
        month,
        year,
        ...(scopeType === "WEEKLY" && weekNumber ? { weekNumber } : {}),
        ...(memberIds.length > 0 ? { userId: { in: memberIds } } : {}),
      },
      include: { items: { orderBy: { createdAt: "asc" } } },
      orderBy: [{ weekNumber: "asc" }, { createdAt: "asc" }],
    }),
    prisma.taskCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.workTask.findMany({
      where: memberIds.length > 0 ? { assignedToUserId: { in: memberIds } } : {},
      select: {
        id: true,
        assignedToUserId: true,
        progress: true,
        endDate: true,
        taskGroup: { select: { name: true } },
      },
    }),
  ])

  const allItemIds = reports.flatMap((r) => r.items.map((i) => i.id))
  const itemMetaMap = await getWeeklyItemMetaMap(allItemIds)
  const categoryWeights = new Map<string, number>()
  taskCategories.forEach((c) => categoryWeights.set(c.name.trim().toLowerCase(), c.weight || 1.0))

  const aiReport = await generateKtdbclAiQualityReport({
    scopeType,
    weekNumber,
    month,
    year,
    expectedWeeksCount,
    members: roster.members,
    taskGroupNames: roster.taskGroups.map((g) => g.name),
    reports: reports as any,
    itemMetaMap,
    workTasks: workTasks.map((w) => ({
      id: w.id,
      assignedToUserId: w.assignedToUserId,
      taskGroupName: w.taskGroup?.name || null,
      progress: w.progress,
      endDate: w.endDate,
    })),
    categoryWeights,
    useCache: false,
    actorName: triggeredBy,
  })

  // Resolve Giám đốc Ban recipient emails
  const recipientEmailSet = new Set<string>()
  if (options.overrideEmails && options.overrideEmails.length > 0) {
    options.overrideEmails.forEach((e) => {
      if (e && e.includes("@")) recipientEmailSet.add(e.trim())
    })
  } else {
    config.directorEmails.forEach((e) => {
      if (e && e.includes("@")) recipientEmailSet.add(e.trim())
    })
    if (config.directorUserIds.length > 0) {
      for (const uid of config.directorUserIds) {
        const found =
          roster.directorCandidates.find((c) => c.id === uid) ||
          roster.members.find((m) => m.id === uid)
        if (found?.email) {
          recipientEmailSet.add(found.email)
        } else {
          const directUser = await prisma.user
            .findUnique({ where: { id: uid }, select: { email: true } })
            .catch(() => null)
          if (directUser?.email && directUser.email.includes("@")) {
            recipientEmailSet.add(directUser.email.trim())
          }
        }
      }
    }
    // Ưu tiên tài khoản Giám đốc Ban Phạm Nguyên Thông nếu chưa cấu hình email nhận thủ công
    if (recipientEmailSet.size === 0) {
      const allCandidates = [...roster.directorCandidates, ...roster.members]
      const thongAccount = allCandidates.find((c) => {
        const norm = String(c.fullName || "")
          .toLowerCase()
          .replace(/đ/g, "d")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
        return norm.includes("pham nguyen thong") && Boolean(c.email)
      })
      if (thongAccount?.email) {
        recipientEmailSet.add(thongAccount.email)
      }
    }
    // Fallback to KT&ĐBCL Directors in roster if no explicit email configured yet
    if (recipientEmailSet.size === 0) {
      const ktDirectors = roster.members.filter((m) => m.isDirector && m.email)
      ktDirectors.forEach((d) => {
        if (d.email) recipientEmailSet.add(d.email)
      })
    }
    if (recipientEmailSet.size === 0) {
      roster.directorCandidates
        .filter((d) => d.isDirector && d.email)
        .slice(0, 2)
        .forEach((d) => {
          if (d.email) recipientEmailSet.add(d.email)
        })
    }
  }

  const recipientEmails = Array.from(recipientEmailSet)
  if (recipientEmails.length === 0) {
    return {
      success: false,
      recipientEmails: [],
      emailSentCount: 0,
      aiReport,
      error: "Chưa tìm thấy địa chỉ email Giám đốc Ban. Vui lòng cấu hình trong tab Tự động hóa & Cấu hình Ban.",
    }
  }

  const ds = aiReport.departmentSummary
  const appBaseUrl = resolveQaAppBaseUrl()
  const dashboardUrl = `${appBaseUrl}/admin/weekly-reports?month=${month}&year=${year}${
    weekNumber ? `&week=${weekNumber}` : ""
  }`

  const groupRowsHtml = aiReport.groupAnalyses
    .map(
      (g) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 700; color: #0F172A;">${escapeHtml(
          g.groupName
        )}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center; color: #334155;">${
          g.completedItems
        }/${g.totalItems} (${g.completionRate}%)</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center; font-weight: 700; color: #00736E;">${
          g.efficiencyScore
        }%</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center; color: ${
          g.overdueItems > 0 ? "#E11D48" : "#059669"
        }; font-weight: 700;">${g.overdueItems}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #475569;">${escapeHtml(
          g.recommendedAction
        )}</td>
      </tr>`
    )
    .join("")

  const individualRowsHtml = aiReport.individualAnalyses
    .map(
      (ind) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 700; color: #0F172A;">${escapeHtml(
          ind.fullName
        )}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #475569;">${escapeHtml(
          ind.specialistGroups.join(", ") || ind.position
        )}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center; color: #334155;">${
          ind.completedItems
        }/${ind.totalItems}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center; font-weight: 700; color: #00736E;">${
          ind.efficiencyScore
        }%</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center; font-weight: 700; color: #0F172A;">${
          ind.avgQualityScore
        }/10 (${ind.kpiGrade})</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; text-align: center; color: ${
          ind.overdueCount > 0 ? "#E11D48" : "#059669"
        }; font-weight: 700;">${
          ind.overdueCount > 0 ? `${ind.overdueCount} trễ` : "Đúng hạn"
        }</td>
      </tr>`
    )
    .join("")

  const actionListHtml = ds.directorActionItems
    .map((act) => `<li style="margin-bottom: 6px; font-size: 13px; color: #1E293B;">${escapeHtml(act)}</li>`)
    .join("")

  const extraHtml = `
    <div style="margin-top: 18px;">
      <div style="padding: 14px 16px; background-color: #F0FDFA; border-left: 4px solid #003B3A; border-radius: 8px; margin-bottom: 18px;">
        <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 800; color: #003B3A;">
          AI Agent Phân tích Điều hành (${escapeHtml(ds.executiveHeadline)})
        </p>
        <p style="margin: 0 0 10px 0; font-size: 13px; color: #334155; line-height: 1.55;">
          ${escapeHtml(ds.executiveNarrative)}
        </p>
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #00736E;">Kiến nghị Giám đốc Ban chỉ đạo:</p>
        <ul style="margin: 0; padding-left: 18px;">${actionListHtml}</ul>
      </div>

      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: #003B3A;">
        1. Tiến độ & Hiệu suất theo Nhóm chuyên môn Ban KT&ĐBCL
      </p>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0; margin-bottom: 18px;">
        <thead>
          <tr style="background-color: #003B3A; color: #FFFFFF; font-size: 11px; text-align: left;">
            <th style="padding: 8px 10px;">Nhóm chuyên môn</th>
            <th style="padding: 8px 10px; text-align: center;">Hoàn thành</th>
            <th style="padding: 8px 10px; text-align: center;">Hiệu suất</th>
            <th style="padding: 8px 10px; text-align: center;">Trễ hạn</th>
            <th style="padding: 8px 10px;">Đề xuất điều phối (AI Agent)</th>
          </tr>
        </thead>
        <tbody>${groupRowsHtml}</tbody>
      </table>

      <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 800; color: #003B3A;">
        2. Bảng Hiệu suất & Chất lượng từng Nhân sự (${aiReport.individualAnalyses.length} thành viên)
      </p>
      <table style="width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0;">
        <thead>
          <tr style="background-color: #003B3A; color: #FFFFFF; font-size: 11px; text-align: left;">
            <th style="padding: 8px 10px;">Nhân sự</th>
            <th style="padding: 8px 10px;">Nhóm / Vị trí</th>
            <th style="padding: 8px 10px; text-align: center;">Đầu việc HT</th>
            <th style="padding: 8px 10px; text-align: center;">Hiệu suất</th>
            <th style="padding: 8px 10px; text-align: center;">Chất lượng / KPI</th>
            <th style="padding: 8px 10px; text-align: center;">Tiến độ</th>
          </tr>
        </thead>
        <tbody>${individualRowsHtml}</tbody>
      </table>
    </div>`

  const titlePrefix = scopeType === "WEEKLY" ? `Báo cáo Quản trị Tuần ${weekNumber}` : `Báo cáo Quản trị Tháng ${month}`
  const html = renderSkylineEmail({
    headerBadge: "BÁO CÁO ĐIỀU HÀNH GIÁM ĐỐC BAN KT&ĐBCL",
    headerTitle: `${titlePrefix} • Tháng ${month}/${year}`,
    headerSubtitle: "Tổng hợp tự động tiến độ, hiệu suất làm việc & phân tích chất lượng từ AI Agent",
    headerTheme: "teal",
    recipientName: "Giám đốc Ban Khảo thí & Đảm bảo Chất lượng",
    introMessage: `Hệ thống Quản trị Chất lượng Công việc kính trình Giám đốc Ban bản tổng hợp **${aiReport.periodLabel}** của **Ban KT&ĐBCL**, bao gồm kết quả thực thi theo từng Nhóm chuyên môn, từng cá nhân và nhận định từ AI Agent.`,
    detailsTitle: "Chỉ số điều hành cốt lõi",
    details: [
      {
        label: "Kỷ luật nộp báo cáo",
        value: `${ds.submittedMembers}/${ds.totalMembers} nhân sự (${ds.submissionRate}%)`,
        highlight: true,
      },
      {
        label: "Tiến độ hoàn thành đầu việc",
        value: `${ds.completedItems}/${ds.totalItems} đầu việc (${ds.completionRate}%)`,
      },
      {
        label: "Đã xác nhận nghiệm thu",
        value: `${ds.confirmedItems} đầu việc (${ds.confirmationRate}% số việc hoàn thành)`,
        color: "#059669",
      },
      {
        label: "Chỉ số hiệu suất & Điểm chất lượng",
        value: `Hiệu suất ${ds.efficiencyIndex}% • Điểm chất lượng TB ${ds.avgQualityScore}/10`,
      },
      {
        label: "Cảnh báo trễ tiến độ",
        value:
          ds.overdueItems > 0
            ? `${ds.overdueItems} việc trễ hạn (${ds.pendingExplanations} việc chờ giải trình)`
            : "0 việc trễ hạn",
        color: ds.overdueItems > 0 ? "#E11D48" : "#059669",
      },
    ],
    extraHtml,
    button: {
      text: "Mở Dashboard Quản trị Chất lượng & Xác nhận đầu việc",
      url: dashboardUrl,
      color: "#003B3A",
    },
  })

  const subject =
    scopeType === "WEEKLY"
      ? `[Báo cáo Giám đốc Ban KT&ĐBCL] Tổng hợp Công việc & Phân tích AI — Tuần ${weekNumber}/Tháng ${month}/${year}`
      : `[Báo cáo Tháng Giám đốc Ban KT&ĐBCL] Tổng hợp Hiệu suất & KPIs — Tháng ${month}/${year}`

  let emailSentCount = 0
  for (const email of recipientEmails) {
    const res = await sendEmail({
      to: email,
      cc: config.ccManagerEmails.length > 0 ? config.ccManagerEmails : undefined,
      subject,
      html,
    })
    if (res.success) emailSentCount++
  }

  await recordWeeklyAutomationLog({
    jobType: scopeType === "WEEKLY" ? "DIRECTOR_WEEKLY_REPORT" : "DIRECTOR_MONTHLY_REPORT",
    dedupKey: isManual ? `${dedupKey}_MANUAL_${Date.now()}` : dedupKey,
    periodLabel: aiReport.periodLabel,
    recipientSummary: recipientEmails.join(", "),
    emailSentCount,
    notificationCount: 0,
    triggeredBy,
    status: emailSentCount > 0 ? "SUCCESS" : "FAILED",
    details: {
      overallHealthScore: ds.overallHealthScore,
      submissionRate: ds.submissionRate,
      completionRate: ds.completionRate,
      overdueItems: ds.overdueItems,
    },
  })

  return {
    success: emailSentCount > 0,
    recipientEmails,
    emailSentCount,
    aiReport,
    ...(emailSentCount === 0 ? { error: "Không gửi được email qua máy chủ SMTP." } : {}),
  }
}

/**
 * 3. Gửi Email thông báo xác nhận hoàn thành đầu việc cho nhân viên (bởi Quản lý hoặc Giám đốc Ban)
 */
export async function sendReportItemsCompletedEmail(params: {
  staffUser: { id: string; fullName: string; email: string | null }
  reviewerName: string
  reviewerRoleLabel: "Quản lý chuyên môn" | "Giám đốc Ban KT&ĐBCL"
  weekNumber: number
  month: number
  year: number
  items: Array<{
    mainTask: string
    workContent: string
    taskGroup?: string | null
    qualityScore?: number | null
    directorRating?: string | null
    reviewNote?: string | null
  }>
}): Promise<{ emailSent: boolean }> {
  const appBaseUrl = resolveQaAppBaseUrl()
  const linkUrl = `${appBaseUrl}/admin/weekly-reports?week=${params.weekNumber}&month=${params.month}&year=${params.year}`

  await prisma.notification
    .create({
      data: {
        userId: params.staffUser.id,
        title: `[Đã xác nhận hoàn thành] ${params.items.length} đầu việc Tuần ${params.weekNumber}/Tháng ${params.month}`,
        message: `${params.reviewerRoleLabel} (${params.reviewerName}) đã xác nhận hoàn thành ${params.items.length} đầu việc báo cáo tuần của bạn.`,
        isRead: false,
        link: `/admin/weekly-reports?week=${params.weekNumber}&month=${params.month}&year=${params.year}`,
      },
    })
    .catch(() => {})

  if (!params.staffUser.email) return { emailSent: false }

  const rowsHtml = params.items
    .map(
      (it, idx) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 700; color: #0F172A;">
          ${idx + 1}. ${escapeHtml(it.mainTask)}
          <div style="font-weight: 400; color: #475569; margin-top: 3px;">${escapeHtml(
            it.workContent.slice(0, 180)
          )}</div>
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #00736E;">
          ${escapeHtml(it.taskGroup || "KT&ĐBCL")}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #059669; font-weight: 700;">
          ${formatRatingVi(it.directorRating)}${
            typeof it.qualityScore === "number" ? ` (${it.qualityScore}/10)` : ""
          }
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #334155;">
          ${escapeHtml(it.reviewNote || "Đạt yêu cầu nghiệm thu")}
        </td>
      </tr>`
    )
    .join("")

  const html = renderSkylineEmail({
    headerBadge: "XÁC NHẬN HOÀN THÀNH CÔNG VIỆC • BAN KT&ĐBCL",
    headerTitle: `Xác nhận hoàn thành ${params.items.length} đầu việc Tuần ${params.weekNumber}/Tháng ${params.month}`,
    headerSubtitle: `Nghiệm thu bởi ${params.reviewerRoleLabel}: ${params.reviewerName}`,
    headerTheme: "emerald",
    recipientName: params.staffUser.fullName,
    introMessage: `**${params.reviewerRoleLabel} (${params.reviewerName})** đã rà soát và **xác nhận hoàn thành** đối với **${params.items.length} đầu việc** trong Báo cáo Tuần ${params.weekNumber} • Tháng ${params.month}/${params.year} của Thầy/Cô.`,
    details: [
      { label: "Người xác nhận", value: `${params.reviewerName} (${params.reviewerRoleLabel})`, highlight: true },
      { label: "Kỳ báo cáo", value: `Tuần ${params.weekNumber} • Tháng ${params.month}/${params.year}` },
      { label: "Trạng thái nghiệm thu", value: "Đã xác nhận hoàn thành", color: "#059669" },
    ],
    extraHtml: `
      <div style="margin-top: 14px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0;">
          <thead>
            <tr style="background-color: #003B3A; color: #FFFFFF; font-size: 11px; text-align: left;">
              <th style="padding: 8px 10px;">Đầu việc được xác nhận</th>
              <th style="padding: 8px 10px;">Nhóm</th>
              <th style="padding: 8px 10px;">Đánh giá / Điểm</th>
              <th style="padding: 8px 10px;">Ý kiến nhận xét</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`,
    button: {
      text: "Xem chi tiết đánh giá trên Hệ thống",
      url: linkUrl,
      color: "#059669",
    },
  })

  const res = await sendEmail({
    to: params.staffUser.email,
    subject: `[Ban KT&ĐBCL] Xác nhận hoàn thành công việc — Tuần ${params.weekNumber}/Tháng ${params.month}/${params.year}`,
    html,
  })

  await recordWeeklyAutomationLog({
    jobType: "ITEM_CONFIRMED_EMAIL",
    dedupKey: `CONFIRM_${params.staffUser.id}_${Date.now()}`,
    periodLabel: `Tuần ${params.weekNumber} • Tháng ${params.month}/${params.year}`,
    recipientSummary: `${params.staffUser.fullName} (${params.staffUser.email})`,
    emailSentCount: res.success ? 1 : 0,
    notificationCount: 1,
    triggeredBy: params.reviewerName,
    status: res.success ? "SUCCESS" : "FAILED",
  })

  return { emailSent: Boolean(res.success) }
}

/**
 * 4. Gửi Email cảnh báo trễ tiến độ và Yêu cầu giải trình cho nhân viên
 */
export async function sendOverdueExplanationRequestEmail(params: {
  staffUser: { id: string; fullName: string; email: string | null }
  requestedByName: string
  requestedByRoleLabel: string
  weekNumber: number
  month: number
  year: number
  explanationRequestNote: string
  explanationDueDate?: string | null
  items: Array<{
    mainTask: string
    workContent: string
    taskGroup?: string | null
    expectedCompletion?: string | null
    progress: string
  }>
}): Promise<{ emailSent: boolean }> {
  const appBaseUrl = resolveQaAppBaseUrl()
  const explainUrl = `${appBaseUrl}/admin/weekly-reports?tab=compose&week=${params.weekNumber}&month=${params.month}&year=${params.year}`

  await prisma.notification
    .create({
      data: {
        userId: params.staffUser.id,
        title: `[YÊU CẦU GIẢI TRÌNH TRỄ TIẾN ĐỘ] Tuần ${params.weekNumber}/Tháng ${params.month}`,
        message: `${params.requestedByRoleLabel} (${params.requestedByName}) yêu cầu giải trình ${params.items.length} đầu việc chậm tiến độ: "${params.explanationRequestNote.slice(0, 90)}"`,
        isRead: false,
        link: `/admin/weekly-reports?tab=compose&week=${params.weekNumber}&month=${params.month}&year=${params.year}`,
      },
    })
    .catch(() => {})

  if (!params.staffUser.email) return { emailSent: false }

  const rowsHtml = params.items
    .map(
      (it, idx) => `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; font-weight: 700; color: #0F172A;">
          ${idx + 1}. ${escapeHtml(it.mainTask)}
          <div style="font-weight: 400; color: #475569; margin-top: 3px;">${escapeHtml(
            it.workContent.slice(0, 180)
          )}</div>
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #00736E;">
          ${escapeHtml(it.taskGroup || "KT&ĐBCL")}
        </td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #E2E8F0; font-size: 12px; color: #E11D48; font-weight: 700;">
          ${escapeHtml(it.expectedCompletion || "Đã quá hạn")}
        </td>
      </tr>`
    )
    .join("")

  const html = renderSkylineEmail({
    headerBadge: "CẢNH BÁO TIẾN ĐỘ & YÊU CẦU GIẢI TRÌNH • BAN KT&ĐBCL",
    headerTitle: `Yêu cầu giải trình ${params.items.length} đầu việc chậm tiến độ`,
    headerSubtitle: `Kỳ Báo cáo Tuần ${params.weekNumber} • Tháng ${params.month}/${params.year}`,
    headerTheme: "rose",
    recipientName: params.staffUser.fullName,
    introMessage: `Qua rà soát tiến độ công việc **Ban KT&ĐBCL**, **${params.requestedByRoleLabel} (${params.requestedByName})** ghi nhận **${params.items.length} đầu việc** dưới đây bị trễ tiến độ so với kế hoạch và yêu cầu Thầy/Cô gửi nội dung giải trình kèm mốc hoàn thành bù.`,
    details: [
      { label: "Người yêu cầu giải trình", value: `${params.requestedByName} (${params.requestedByRoleLabel})` },
      { label: "Kỳ báo cáo", value: `Tuần ${params.weekNumber} • Tháng ${params.month}/${params.year}` },
      {
        label: "Thời hạn gửi giải trình",
        value: params.explanationDueDate || "Trong vòng 24 giờ kể từ khi nhận thông báo",
        color: "#E11D48",
        highlight: true,
      },
    ],
    noticeBox: {
      type: "warning",
      title: "Nội dung yêu cầu từ Lãnh đạo Ban / Quản lý",
      content: params.explanationRequestNote || "Vui lòng nêu rõ nguyên nhân khách quan/chủ quan, giải pháp khắc phục và cam kết thời gian hoàn thành dứt điểm.",
    },
    extraHtml: `
      <div style="margin-top: 14px;">
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #E2E8F0;">
          <thead>
            <tr style="background-color: #003B3A; color: #FFFFFF; font-size: 11px; text-align: left;">
              <th style="padding: 8px 10px;">Đầu việc trễ tiến độ</th>
              <th style="padding: 8px 10px;">Nhóm chuyên môn</th>
              <th style="padding: 8px 10px;">Hạn dự kiến</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`,
    button: {
      text: "Gửi Giải trình & Cam kết tiến độ ngay",
      url: explainUrl,
      color: "#E11D48",
    },
  })

  const res = await sendEmail({
    to: params.staffUser.email,
    subject: `[Ban KT&ĐBCL • Khẩn] Cảnh báo trễ tiến độ & Yêu cầu giải trình — Tuần ${params.weekNumber}/Tháng ${params.month}`,
    html,
  })

  await recordWeeklyAutomationLog({
    jobType: "OVERDUE_EXPLANATION_EMAIL",
    dedupKey: `OVERDUE_REQ_${params.staffUser.id}_${Date.now()}`,
    periodLabel: `Tuần ${params.weekNumber} • Tháng ${params.month}/${params.year}`,
    recipientSummary: `${params.staffUser.fullName} (${params.staffUser.email})`,
    emailSentCount: res.success ? 1 : 0,
    notificationCount: 1,
    triggeredBy: params.requestedByName,
    status: res.success ? "SUCCESS" : "FAILED",
  })

  return { emailSent: Boolean(res.success) }
}

/**
 * 5. Gửi thông báo & Email đến Quản lý / Giám đốc Ban khi nhân viên đã nộp giải trình trễ tiến độ
 */
export async function sendExplanationSubmittedToLeadershipEmail(params: {
  staffName: string
  weekNumber: number
  month: number
  year: number
  mainTask: string
  workContent: string
  explanationText: string
  recoveryDate?: string | null
  recipientUserIds: string[]
}): Promise<{ emailSentCount: number }> {
  const uniqueIds = Array.from(new Set(params.recipientUserIds.filter(Boolean)))
  if (uniqueIds.length === 0) return { emailSentCount: 0 }

  const leaders = await prisma.user.findMany({
    where: { id: { in: uniqueIds }, status: "ACTIVE" },
    select: {
      id: true,
      fullName: true,
      email: true,
      teacher: { select: { email: true } },
    },
  })

  const appBaseUrl = resolveQaAppBaseUrl()
  const reviewUrl = `${appBaseUrl}/admin/weekly-reports?tab=review&week=${params.weekNumber}&month=${params.month}&year=${params.year}`
  let emailSentCount = 0

  for (const leader of leaders) {
    await prisma.notification
      .create({
        data: {
          userId: leader.id,
          title: `[Đã gửi giải trình] ${params.staffName} — Tuần ${params.weekNumber}/Tháng ${params.month}`,
          message: `${params.staffName} đã nộp giải trình cho công việc "${params.mainTask.slice(0, 45)}": ${params.explanationText.slice(0, 80)}`,
          isRead: false,
          link: `/admin/weekly-reports?tab=review&week=${params.weekNumber}&month=${params.month}&year=${params.year}`,
        },
      })
      .catch(() => {})

    const email = normalizeStaffEmail(leader)
    if (email) {
      const html = renderSkylineEmail({
        headerBadge: "BÁO CÁO GIẢI TRÌNH TIẾN ĐỘ • BAN KT&ĐBCL",
        headerTitle: `${params.staffName} đã gửi giải trình công việc chậm tiến độ`,
        headerSubtitle: `Tuần ${params.weekNumber} • Tháng ${params.month}/${params.year}`,
        headerTheme: "amber",
        recipientName: leader.fullName || "Quản lý Ban KT&ĐBCL",
        introMessage: `Nhân sự **${params.staffName}** vừa gửi nội dung giải trình và đề xuất mốc hoàn thành bù cho đầu việc trong Báo cáo Tuần ${params.weekNumber}/Tháng ${params.month}.`,
        details: [
          { label: "Nhân sự giải trình", value: params.staffName, highlight: true },
          { label: "Đầu việc", value: params.mainTask },
          { label: "Cam kết hoàn thành bù", value: params.recoveryDate || "Cập nhật trong giải pháp", color: "#00736E" },
        ],
        noticeBox: {
          type: "info",
          title: "Nội dung giải trình & Giải pháp khắc phục",
          content: params.explanationText,
        },
        button: {
          text: "Xem xét & Duyệt giải trình trên Hệ thống",
          url: reviewUrl,
          color: "#003B3A",
        },
      })

      const res = await sendEmail({
        to: email,
        subject: `[Ban KT&ĐBCL] Giải trình trễ tiến độ từ ${params.staffName} — Tuần ${params.weekNumber}/Tháng ${params.month}`,
        html,
      })
      if (res.success) emailSentCount++
    }
  }

  return { emailSentCount }
}
