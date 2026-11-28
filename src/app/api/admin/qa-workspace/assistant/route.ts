import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getOperationalScope } from "@/lib/session"
import {
  parseNaturalLanguageToTaskDraft,
  sanitizeUntrustedReferenceData,
} from "@/lib/qa-workspace/nlpDraftParser"
import { getQaMetadataMapForTasks } from "@/lib/qa-workspace/schemaInit"
import { computeTaskDeadlineStatus, WORKFLOW_STATUS_CONFIG } from "@/lib/qa-workspace/workflowEngine"
import {
  computeWeeksOfMonthSync,
  getKtdbclAutomationConfig,
  resolveCurrentWeekInMonth,
} from "@/lib/qa-workspace/weeklyReportSchema"
import { sendEmail } from "@/lib/mail"
import { renderSkylineEmail } from "@/lib/email-templates"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Chưa đăng nhập" }, { status: 401 })
    }

    const userId = String(session.user.id)
    const opScope = await getOperationalScope()
    const body = await req.json().catch(() => ({}))
    const action = String(body.action || "PARSE_DRAFT").toUpperCase()

    // Chỉ lấy dữ liệu nằm trong phạm vi quyền của người dùng
    let taskWhere: any = {}
    if (!opScope.isSuperAdmin && !opScope.isHeadOfAcademic) {
      if (opScope.scopedUserIds && opScope.scopedUserIds.length > 0) {
        taskWhere = {
          OR: [
            { assignedToUserId: { in: opScope.scopedUserIds } },
            { assignedById: userId },
            { collaborators: { contains: userId } },
          ],
        }
      } else {
        taskWhere = {
          OR: [
            { assignedToUserId: userId },
            { assignedById: userId },
            { collaborators: { contains: userId } },
          ],
        }
      }
    }

    if (action === "PERSONAL_SSM_BRIEFING") {
      const requestedUserId = body.targetUserId ? String(body.targetUserId).trim() : userId
      const canInspectOther =
        opScope.isSuperAdmin ||
        opScope.isHeadOfAcademic ||
        (Array.isArray(opScope.scopedUserIds) && opScope.scopedUserIds.includes(requestedUserId))
      const targetUserId = canInspectOther ? requestedUserId : userId

      const now = new Date()
      const currentPeriod = resolveCurrentWeekInMonth(now)
      const in72Hours = new Date(now.getTime() + 72 * 60 * 60 * 1000)

      const [
        targetUser,
        assignedTasks,
        reviewerTasks,
        weeklyReport,
        pendingKsdvCount,
        openSurveysCount,
        draftPvdhCount,
        recentObsCount,
      ] = await Promise.all([
        prisma.user
          .findUnique({
            where: { id: targetUserId },
            select: { id: true, fullName: true, email: true, role: true },
          })
          .catch(() => null),
        prisma.workTask
          .findMany({
            where: {
              OR: [
                { assignedToUserId: targetUserId },
                { collaborators: { contains: targetUserId } },
              ],
            },
            include: {
              taskGroup: { select: { id: true, name: true } },
            },
            orderBy: { endDate: "asc" },
            take: 80,
          })
          .catch(() => []),
        prisma.workTask
          .findMany({
            where: { assignedById: targetUserId },
            select: { id: true, title: true, progress: true, endDate: true },
            take: 50,
          })
          .catch(() => []),
        prisma.weeklyReport
          .findFirst({
            where: {
              userId: targetUserId,
              month: currentPeriod.month,
              year: currentPeriod.year,
              weekNumber: currentPeriod.weekNumber,
            },
            include: { items: { select: { id: true, progress: true } } },
          })
          .catch(() => null),
        (prisma as any).inputAssessmentStudent
          ?.count({
            where: {
              admissionResult: { in: ["PENDING", "WAITING", ""] },
            },
          })
          .catch(() => 0) ?? Promise.resolve(0),
        (prisma as any).survey
          ?.count({
            where: { status: { in: ["PUBLISHED", "ACTIVE", "OPEN"] } },
          })
          .catch(() => 0) ?? Promise.resolve(0),
        (prisma as any).$queryRawUnsafe
          ? (prisma as any)
              .$queryRawUnsafe(
                `SELECT COUNT(*) AS cnt FROM "pvdh_assessment_records" WHERE "isLocked" = 0`
              )
              .then((rows: any[]) => Number(rows?.[0]?.cnt || 0))
              .catch(() => 0)
          : Promise.resolve(0),
        (prisma as any).classroomObservation
          ?.count({
            where: {
              status: { in: ["DRAFT", "SUBMITTED", "PENDING"] },
            },
          })
          .catch(() => 0) ?? Promise.resolve(0),
      ])

      const metaMap = await getQaMetadataMapForTasks(assignedTasks as any)
      let overdueCount = 0
      let dueSoonCount = 0
      let unconfirmedCount = 0
      let inProgressCount = 0
      const urgentTaskTitles: string[] = []

      for (const t of assignedTasks as any[]) {
        const meta = metaMap.get(t.id)
        const wf = String(meta?.workflowStatus || t.progress || "PENDING").toUpperCase()
        if (wf === "COMPLETED" || wf === "CANCELLED") continue
        inProgressCount++
        if (!t.isConfirmed && wf === "ASSIGNED") unconfirmedCount++
        const dl = computeTaskDeadlineStatus(
          {
            endDate: t.endDate,
            completedAt: t.completedAt,
            workflowStatus: meta?.workflowStatus || ("IN_PROGRESS" as any),
            reviewDueDate: meta?.reviewDueDate || null,
            submittedForReviewAt: meta?.submittedForReviewAt || null,
            checklist: meta?.checklist || [],
          },
          now
        )
        if (dl.isOverdueExecution) {
          overdueCount++
          if (urgentTaskTitles.length < 3) urgentTaskTitles.push(t.title)
        } else if (t.endDate && new Date(t.endDate) <= in72Hours) {
          dueSoonCount++
          if (urgentTaskTitles.length < 3) urgentTaskTitles.push(t.title)
        }
      }

      const reviewerMetaMap = await getQaMetadataMapForTasks(reviewerTasks as any)
      const pendingMyApprovalCount = (reviewerTasks as any[]).filter(
        (t) => reviewerMetaMap.get(t.id)?.workflowStatus === "PENDING_REVIEW"
      ).length

      const hasWeeklyReport = Boolean(weeklyReport && (weeklyReport.items?.length || 0) > 0)
      const weeklyReportStatus = weeklyReport?.status || "NOT_STARTED"
      const periodLabel = `Tuần ${currentPeriod.weekNumber} • Tháng ${currentPeriod.month}/${currentPeriod.year}`

      const suggestions: Array<{
        id: string
        priority: "HIGH" | "MEDIUM" | "INFO"
        category: string
        title: string
        detail: string
        actionLabel: string
        actionHref?: string
        suggestedTaskPrompt?: string
      }> = []

      if (overdueCount > 0) {
        suggestions.push({
          id: "sug-overdue",
          priority: "HIGH",
          category: "Công việc cá nhân",
          title: `Ưu tiên xử lý ${overdueCount} đầu việc đã quá hạn`,
          detail:
            urgentTaskTitles.length > 0
              ? `Cần cập nhật ngay: ${urgentTaskTitles.join("; ")}.`
              : "Cập nhật tiến độ, đính kèm minh chứng hoặc báo vướng mắc để Trưởng nhóm hỗ trợ.",
          actionLabel: "Lọc việc quá hạn",
          actionHref: "/admin/tasks",
        })
      }

      if (!hasWeeklyReport) {
        suggestions.push({
          id: "sug-weekly-report",
          priority: "HIGH",
          category: "Báo cáo tuần",
          title: `Chưa lập Báo cáo ${periodLabel}`,
          detail:
            "Có thể đồng bộ nhanh các đầu việc đang phụ trách từ QA Workspace sang Báo cáo Tuần để gửi trước hạn Thứ Tư 14:00.",
          actionLabel: "Lập báo cáo tuần ngay",
          actionHref: "/admin/weekly-reports",
        })
      }

      if (pendingMyApprovalCount > 0) {
        suggestions.push({
          id: "sug-pending-review",
          priority: "MEDIUM",
          category: "Nghiệm thu",
          title: `${pendingMyApprovalCount} đầu việc đang chờ bạn duyệt nghiệm thu`,
          detail: "Kiểm tra sản phẩm/minh chứng và xác nhận hoàn thành để cập nhật chính xác KPI nhóm.",
          actionLabel: "Mở danh sách chờ duyệt",
          actionHref: "/admin/tasks",
        })
      }

      if (dueSoonCount > 0) {
        suggestions.push({
          id: "sug-due-soon",
          priority: "MEDIUM",
          category: "Công việc cá nhân",
          title: `${dueSoonCount} đầu việc sắp đến hạn trong 72 giờ tới`,
          detail: "Rà soát checklist và chuẩn bị minh chứng sớm để tránh trễ hạn cuối tuần.",
          actionLabel: "Xem lịch công việc",
          actionHref: "/admin/tasks",
        })
      }

      if (Number(draftPvdhCount) > 0 || Number(pendingKsdvCount) > 0) {
        suggestions.push({
          id: "sug-ssm-ksdv",
          priority: "MEDIUM",
          category: "Dữ liệu SSM • KSDV",
          title: `SSM đang có ${draftPvdhCount} phiếu PVDH chưa khóa & ${pendingKsdvCount} hồ sơ KSDV chờ chốt`,
          detail:
            "Gợi ý rà soát tiến độ chấm điểm, khóa phiếu phỏng vấn định hướng và xét duyệt kết quả đầu vào trên SSM.",
          actionLabel: "Tạo việc rà soát KSDV",
          actionHref: "/admin/xet-duyet-ket-qua",
          suggestedTaskPrompt: `Rà soát ${draftPvdhCount} phiếu PVDH chưa khóa và ${pendingKsdvCount} hồ sơ KSDV chờ chốt trước 16:00 thứ Sáu tuần này; nộp bảng tổng hợp tình trạng từng cơ sở.`,
        })
      }

      if (Number(recentObsCount) > 0) {
        suggestions.push({
          id: "sug-ssm-dugio",
          priority: "INFO",
          category: "Dữ liệu SSM • Dự giờ",
          title: `Có ${recentObsCount} phiếu dự giờ đang ở trạng thái nháp/chờ duyệt trên SSM`,
          detail: "Nhóm ĐBCL nên kiểm tra tổng hợp tiến độ dự giờ chuyên môn trước kỳ báo cáo tuần.",
          actionLabel: "Mở tổng hợp dự giờ",
          actionHref: "/admin/tong-hop-du-gio",
          suggestedTaskPrompt: `Tổng hợp và đôn đốc hoàn thiện ${recentObsCount} phiếu dự giờ đang chờ xử lý trên SSM trước thứ Sáu tuần này.`,
        })
      }

      if (Number(openSurveysCount) > 0) {
        suggestions.push({
          id: "sug-ssm-survey",
          priority: "INFO",
          category: "Dữ liệu SSM • Khảo sát",
          title: `${openSurveysCount} đợt khảo sát chất lượng (NPS/Hài lòng) đang mở`,
          detail: "Theo dõi tỷ lệ phản hồi theo cơ sở và chuẩn bị phân tích số liệu cho báo cáo tháng.",
          actionLabel: "Xem khảo sát",
          actionHref: "/admin/surveys",
        })
      }

      if (suggestions.length === 0) {
        suggestions.push({
          id: "sug-all-clear",
          priority: "INFO",
          category: "Trạng thái tốt",
          title: "Tiến độ công việc và báo cáo tuần hiện tại đều ổn định",
          detail: "Bạn có thể dùng tab 'Soạn Phiếu Giao việc AI' hoặc 'Dự thảo Báo cáo Tuần/Tháng' để chuẩn bị kế hoạch kỳ tới.",
          actionLabel: "Xem tổng quan KPI",
          actionHref: "/admin/workhub",
        })
      }

      return NextResponse.json({
        success: true,
        briefing: {
          targetUser: targetUser || { id: targetUserId, fullName: "Cán bộ KT&ĐBCL", email: "" },
          periodLabel,
          personalCounts: {
            inProgress: inProgressCount,
            overdue: overdueCount,
            dueSoon: dueSoonCount,
            unconfirmed: unconfirmedCount,
            pendingApproval: pendingMyApprovalCount,
            hasWeeklyReport,
            weeklyReportStatus,
            weeklyReportItemsCount: weeklyReport?.items?.length || 0,
          },
          ssmSignals: {
            pendingKsdvCount: Number(pendingKsdvCount || 0),
            draftPvdhCount: Number(draftPvdhCount || 0),
            recentObsCount: Number(recentObsCount || 0),
            openSurveysCount: Number(openSurveysCount || 0),
          },
          suggestions,
        },
      })
    }

    if (action === "PARSE_DRAFT") {
      const prompt = String(body.prompt || "").trim()
      if (!prompt) {
        return NextResponse.json(
          { success: false, error: "Vui lòng nhập yêu cầu giao việc bằng ngôn ngữ tự nhiên." },
          { status: 400 }
        )
      }

      const [taskGroups, staffUsers, categories] = await Promise.all([
        prisma.taskGroup.findMany({ orderBy: { name: "asc" } }),
        prisma.user.findMany({
          where: {
            role: { not: "PARENT" },
            status: "ACTIVE",
            ...(opScope.scopedUserIds !== null ? { id: { in: opScope.scopedUserIds } } : {}),
          },
          select: { id: true, fullName: true, email: true, role: true },
          orderBy: { fullName: "asc" },
        }),
        prisma.taskCategory.findMany({ orderBy: { name: "asc" } }),
      ])

      const draft = await parseNaturalLanguageToTaskDraft({
        prompt,
        taskGroups,
        staffUsers,
        categories,
        currentUserId: userId,
        referenceNow: new Date(),
      })

      return NextResponse.json({
        success: true,
        draft,
        aiCapabilityNote:
          draft.aiEngineUsed === "GEMINI_SERVER"
            ? "Đang sử dụng dịch vụ AI Gemini Server-side kết hợp bộ quy tắc thời gian Asia/Ho_Chi_Minh."
            : "Đang sử dụng bộ phân tích ngôn ngữ tự nhiên theo mẫu quy tắc chuẩn (Rule Engine) do máy chủ chưa cấu hình khóa GEMINI_API_KEY.",
      })
    }

    if (action === "GENERATE_REPORT_DRAFT") {
      const now = new Date()
      const currentPeriod = resolveCurrentWeekInMonth(now)
      const periodType = body.periodType === "MONTHLY" ? "MONTHLY" : "WEEKLY"
      const selectedYear = Number(body.year) || currentPeriod.year
      const selectedMonth = Number(body.month) || currentPeriod.month
      const allWeeks = computeWeeksOfMonthSync(selectedMonth, selectedYear)
      const selectedWeekNum =
        Number(body.weekNumber) && allWeeks.some((w) => w.weekNum === Number(body.weekNumber))
          ? Number(body.weekNumber)
          : currentPeriod.year === selectedYear && currentPeriod.month === selectedMonth
          ? currentPeriod.weekNumber
          : allWeeks[0]?.weekNum || 1
      const weekDef = allWeeks.find((w) => w.weekNum === selectedWeekNum) || allWeeks[0]

      const groupFilter = body.taskGroupId || body.groupId || "ALL"

      // Compute exact date range of selected week or month
      let rangeStart: Date
      let rangeEnd: Date
      if (periodType === "WEEKLY" && weekDef) {
        rangeStart = new Date(`${weekDef.startYmd}T00:00:00.000+07:00`)
        rangeEnd = new Date(`${weekDef.endYmd}T23:59:59.999+07:00`)
      } else {
        rangeStart = new Date(selectedYear, selectedMonth - 1, 1, 0, 0, 0, 0)
        rangeEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999)
      }

      const rawTasksAll = await prisma.workTask.findMany({
        where: {
          ...taskWhere,
          ...(groupFilter !== "ALL" ? { taskGroupId: groupFilter } : {}),
        },
        include: {
          assignedToUser: { select: { id: true, fullName: true } },
          taskGroup: { select: { id: true, name: true } },
          attachments: { select: { id: true, fileName: true } },
          comments: { select: { id: true, commentType: true, content: true, actionStatus: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 150,
      })

      // Filter tasks overlapping the selected week/month period
      const rawTasks = rawTasksAll.filter((t) => {
        const s = t.startDate ? new Date(t.startDate) : null
        const e = t.endDate ? new Date(t.endDate) : null
        const u = t.updatedAt ? new Date(t.updatedAt) : null
        if (s && e) {
          return s <= rangeEnd && e >= rangeStart
        }
        if (e) return e >= rangeStart && e <= rangeEnd
        if (u) return u >= rangeStart && u <= rangeEnd
        return true
      })

      const metaMap = await getQaMetadataMapForTasks(rawTasks)
      const vnDateStr = now.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })

      const completed: any[] = []
      const pendingReview: any[] = []
      const inProgress: any[] = []
      const overdueExec: any[] = []
      const overdueRev: any[] = []
      const blockers: any[] = []

      for (const t of rawTasks) {
        const meta = metaMap.get(t.id)!
        const dl = computeTaskDeadlineStatus(
          {
            endDate: t.endDate,
            completedAt: t.completedAt,
            workflowStatus: meta.workflowStatus,
            reviewDueDate: meta.reviewDueDate,
            submittedForReviewAt: meta.submittedForReviewAt,
            checklist: meta.checklist,
          },
          now
        )

        const item = { ...t, qaMeta: meta, dl }
        if (meta.workflowStatus === "COMPLETED") completed.push(item)
        else if (meta.workflowStatus === "PENDING_REVIEW") pendingReview.push(item)
        else if (meta.workflowStatus === "IN_PROGRESS" || meta.workflowStatus === "NEEDS_REVISION")
          inProgress.push(item)

        if (dl.isOverdueExecution) overdueExec.push(item)
        if (dl.isOverdueReview) overdueRev.push(item)

        const taskBlockers = (t.comments || []).filter(
          (c: any) => c.commentType === "BLOCKER" && c.actionStatus !== "RESOLVED"
        )
        if (taskBlockers.length > 0) {
          blockers.push({ task: item, items: taskBlockers })
        }
      }

      const periodHeading =
        periodType === "MONTHLY"
          ? `BÁO CÁO THÁNG ${selectedMonth}/${selectedYear}`
          : `BÁO CÁO TUẦN ${selectedWeekNum} • THÁNG ${selectedMonth}/${selectedYear}${
              weekDef ? ` (${weekDef.startDisplay} – ${weekDef.endDisplay})` : ""
            }`

      let md = `### DỰ THẢO ${periodHeading} — BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG\n`
      md += `*Thời điểm tổng hợp: ${vnDateStr} (Múi giờ Asia/Ho_Chi_Minh)*\n\n`
      md += `#### 1. Tóm tắt số liệu điều hành\n`
      md += `- **Tổng số nhiệm vụ trong kỳ**: **${rawTasks.length}** việc\n`
      md += `- **Đã duyệt hoàn thành**: **${completed.length}** việc\n`
      md += `- **Đang chờ duyệt nghiệm thu**: **${pendingReview.length}** việc *(chưa tính là hoàn thành)*\n`
      md += `- **Đang thực hiện / Cần bổ sung**: **${inProgress.length}** việc\n`
      md += `- **Cảnh báo trễ hạn**: Chậm thực hiện **${overdueExec.length}** việc | Chậm duyệt **${overdueRev.length}** việc\n\n`

      md += `#### 2. Kết quả hoàn thành & Minh chứng tiêu biểu (${completed.length})\n`
      if (completed.length === 0) {
        md += `- Chưa có nhiệm vụ hoàn thành nghiệm thu trong kỳ.\n`
      } else {
        completed.slice(0, 12).forEach((t, idx) => {
          const evCount = (t.attachments?.length || 0) + (t.qaMeta?.evidenceLinks?.length || 0)
          md += `${idx + 1}. **[${t.taskGroup?.name || t.category}]** ${sanitizeUntrustedReferenceData(t.title, 140)} — *Phụ trách: ${t.assignedToUser?.fullName || t.assignedToRole}* • Minh chứng: **${evCount} tệp/liên kết** ➔ [Mở nhiệm vụ](/admin/tasks?taskId=${t.id})\n`
        })
      }

      md += `\n#### 3. Nhiệm vụ đang chờ duyệt nghiệm thu (${pendingReview.length})\n`
      if (pendingReview.length === 0) {
        md += `- Không có nhiệm vụ tồn đọng chờ duyệt.\n`
      } else {
        pendingReview.slice(0, 10).forEach((t, idx) => {
          const wfKey = t.qaMeta.workflowStatus as keyof typeof WORKFLOW_STATUS_CONFIG
          md += `${idx + 1}. **${sanitizeUntrustedReferenceData(t.title, 140)}** (${t.assignedToUser?.fullName || t.assignedToRole}) — Trạng thái: *${WORKFLOW_STATUS_CONFIG[wfKey]?.label}* ➔ [Duyệt kết quả](/admin/tasks?taskId=${t.id})\n`
        })
      }

      md += `\n#### 4. Vướng mắc & Nội dung cần Lãnh đạo Ban quyết định (${blockers.length})\n`
      if (blockers.length === 0) {
        md += `- Hiện không có vướng mắc tồn đọng chưa phản hồi.\n`
      } else {
        blockers.forEach((b, idx) => {
          const firstBlocker = sanitizeUntrustedReferenceData(b.items[0]?.content || "", 160)
          md += `${idx + 1}. **[${b.task.title}]** — Vướng mắc: *"${firstBlocker}"* ➔ [Xử lý vướng mắc](/admin/tasks?taskId=${b.task.id})\n`
        })
      }

      return NextResponse.json({
        success: true,
        reportMarkdown: md,
        periodLabel: periodHeading,
        periodMeta: {
          periodType,
          weekNumber: selectedWeekNum,
          month: selectedMonth,
          year: selectedYear,
        },
        summaryCounts: {
          total: rawTasks.length,
          completed: completed.length,
          pendingReview: pendingReview.length,
          inProgress: inProgress.length,
          overdueExecution: overdueExec.length,
          overdueReview: overdueRev.length,
          blockers: blockers.length,
        },
      })
    }

    if (action === "SEND_REPORT_DRAFT_EMAIL") {
      const markdown = String(body.reportMarkdown || "").trim()
      const periodLabel = String(body.periodLabel || "BÁO CÁO CÔNG VIỆC BAN KT&ĐBCL").trim()
      if (!markdown) {
        return NextResponse.json(
          { success: false, error: "Chưa có nội dung dự thảo báo cáo để gửi email." },
          { status: 400 }
        )
      }

      const rawRecipients = String(body.recipientEmails || "")
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.includes("@"))

      const recipients = new Set<string>(rawRecipients)
      if (recipients.size === 0) {
        const cfg = await getKtdbclAutomationConfig().catch(() => null)
        cfg?.directorEmails?.forEach((e) => {
          if (e && e.includes("@")) recipients.add(e.trim())
        })
      }

      if (recipients.size === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Vui lòng nhập ít nhất 1 địa chỉ email người nhận hoặc cấu hình Email Giám đốc Ban.",
          },
          { status: 400 }
        )
      }

      const escapedLines = markdown
        .split("\n")
        .map((line) =>
          line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
        )
        .map((line) => {
          if (line.startsWith("### ")) {
            return `<h3 style="margin:12px 0 6px;color:#003B3A;font-size:15px;">${line.slice(4)}</h3>`
          }
          if (line.startsWith("#### ")) {
            return `<h4 style="margin:12px 0 4px;color:#00736E;font-size:13px;">${line.slice(5)}</h4>`
          }
          if (!line.trim()) return `<div style="height:6px;"></div>`
          return `<div style="font-size:12.5px;color:#334155;line-height:1.6;">${line}</div>`
        })
        .join("")

      const senderName = String((session.user as any)?.name || session.user.email || "Ban KT&ĐBCL")
      const html = renderSkylineEmail({
        headerBadge: "BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG",
        headerTitle: periodLabel,
        headerSubtitle: `Tổng hợp & gửi trực tiếp từ QA Assistant bởi ${senderName}`,
        headerTheme: "teal",
        recipientName: "Ban Lãnh đạo & Giám đốc Ban KT&ĐBCL",
        introMessage: `Kính gửi **${periodLabel}** được tổng hợp tự động từ dữ liệu nhiệm vụ thực tế trên hệ thống SSM Sky-Line.`,
        extraHtml: `<div style="margin-top:12px;padding:14px;border:1px solid #E2E8F0;border-radius:10px;background:#F8FAFC;">${escapedLines}</div>`,
      })

      let sentCount = 0
      for (const email of recipients) {
        const r = await sendEmail({
          to: email,
          subject: `[Ban KT&ĐBCL] ${periodLabel}`,
          html,
        })
        if (r.success) sentCount++
      }

      return NextResponse.json({
        success: true,
        sentCount,
        recipients: Array.from(recipients),
      })
    }

    return NextResponse.json({ success: false, error: "Hành động không hợp lệ" }, { status: 400 })
  } catch (err: any) {
    console.error("[QA Assistant API Error]:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi máy chủ khi xử lý QA Assistant" },
      { status: 500 }
    )
  }
}
