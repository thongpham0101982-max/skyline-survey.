import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/mail"
import { renderSkylineEmail } from "@/lib/email-templates"
import type {
  QaAssignmentMode,
  QaChecklistStep,
  QaPriority,
  QaReviewRating,
  QaWorkflowStatus,
} from "./types"

export interface ResolvedQaRecipient {
  id: string
  fullName: string
  email: string | null
  role: string
  departmentName?: string | null
}

function escapeHtml(raw?: string | null): string {
  if (!raw) return ""
  return String(raw)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

export function resolveQaAppBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://ssm.skylineschool.edu.vn"
  return raw.replace(/\/+$/, "")
}

export function normalizeRecipientEmail(user: any): string | null {
  let email = user?.teacher?.email || user?.email || ""
  if (!email || typeof email !== "string") return null
  email = email.trim()
  if (!email) return null
  if (!email.includes("@")) {
    email = `${email}@skylineschool.edu.vn`
  }
  return email.includes("@") && email.length > 5 ? email : null
}

export async function resolveQaUsersByIds(
  userIds: Array<string | null | undefined>
): Promise<Map<string, ResolvedQaRecipient>> {
  const uniqueIds = Array.from(
    new Set(userIds.map((id) => (id ? String(id).trim() : "")).filter(Boolean))
  )
  const map = new Map<string, ResolvedQaRecipient>()
  if (uniqueIds.length === 0) return map

  try {
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        teacher: {
          select: {
            email: true,
            departmentRel: { select: { name: true, code: true } },
          },
        },
      },
    })

    for (const u of users) {
      map.set(u.id, {
        id: u.id,
        fullName: u.fullName || u.email || "Thầy/Cô",
        email: normalizeRecipientEmail(u),
        role: u.role || "STAFF",
        departmentName: u.teacher?.departmentRel?.name || null,
      })
    }
  } catch (err) {
    console.warn("[qa-workspace/emailService] resolveQaUsersByIds warning:", err)
  }

  return map
}

function formatPriorityLabel(priority?: QaPriority | string | null): {
  label: string
  color: string
  isHigh: boolean
} {
  const p = String(priority || "MEDIUM").toUpperCase()
  if (p === "URGENT") {
    return { label: "Khẩn cấp / Quan trọng", color: "#E11D48", isHigh: true }
  }
  if (p === "HIGH") {
    return { label: "Ưu tiên cao", color: "#D97706", isHigh: true }
  }
  if (p === "LOW") {
    return { label: "Thấp", color: "#64748B", isHigh: false }
  }
  return { label: "Bình thường", color: "#00736E", isHigh: false }
}

function formatAssignmentModeLabel(mode?: QaAssignmentMode | string | null): string {
  switch (mode) {
    case "GROUP":
      return "Giao cho Nhóm chuyên môn"
    case "MULTI_INDIVIDUAL":
      return "Giao độc lập theo đợt"
    case "RECURRING":
      return "Nhiệm vụ định kỳ"
    default:
      return "Giao cá nhân phụ trách"
  }
}

function formatReviewRatingLabel(rating?: QaReviewRating | string | null): string {
  switch (rating) {
    case "XUAT_SAC":
      return "Xuất sắc — Vượt tiêu chí nghiệm thu"
    case "DAT_CHUAN":
      return "Đạt chuẩn — Đáp ứng đầy đủ tiêu chí"
    case "DAT_YEU_CAU":
      return "Đạt yêu cầu"
    case "CAN_BO_SUNG":
      return "Cần bổ sung / hoàn thiện thêm"
    default:
      return "Đã nghiệm thu hoàn thành"
  }
}

function formatDateVi(dateInput?: string | Date | null): string {
  if (!dateInput) return "—"
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return String(dateInput)
  return d.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
}

function renderChecklistHtml(checklist?: QaChecklistStep[]): string {
  if (!Array.isArray(checklist) || checklist.length === 0) return ""
  const itemsHtml = checklist
    .map(
      (step, idx) => `
      <li style="margin-bottom: 6px; color: #334155; font-size: 13px; line-height: 1.5;">
        <strong style="color: #003B3A;">Bước ${idx + 1}:</strong> ${escapeHtml(step.title)}
        ${step.completed ? '<span style="color: #059669; font-weight: 700;"> (Đã hoàn thành)</span>' : ""}
      </li>`
    )
    .join("")

  return `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 14px 18px; margin: 14px 0;">
      <div style="font-size: 12px; font-weight: 800; color: #003B3A; margin-bottom: 8px;">
        📋 Lộ trình thực hiện (${checklist.length} bước công việc con):
      </div>
      <ol style="margin: 0; padding-left: 18px;">
        ${itemsHtml}
      </ol>
    </div>
  `
}

function renderDeliverablesAndCriteriaHtml(params: {
  description?: string | null
  deliverables?: string | null
  completionCriteria?: string | null
  requiredEvidences?: string | null
}): string {
  const blocks: string[] = []
  if (params.description?.trim()) {
    blocks.push(`
      <div style="margin-bottom: 10px;">
        <div style="font-size: 12px; font-weight: 700; color: #00736E; margin-bottom: 3px;">Hướng dẫn & bối cảnh thực hiện:</div>
        <div style="font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-line;">${escapeHtml(params.description)}</div>
      </div>
    `)
  }
  if (params.deliverables?.trim()) {
    blocks.push(`
      <div style="margin-bottom: 8px;">
        <strong style="font-size: 12px; color: #003B3A;">• Sản phẩm đầu ra yêu cầu:</strong>
        <span style="font-size: 13px; color: #334155;"> ${escapeHtml(params.deliverables)}</span>
      </div>
    `)
  }
  if (params.completionCriteria?.trim()) {
    blocks.push(`
      <div style="margin-bottom: 8px;">
        <strong style="font-size: 12px; color: #003B3A;">• Tiêu chí nghiệm thu hoàn thành:</strong>
        <span style="font-size: 13px; color: #334155;"> ${escapeHtml(params.completionCriteria)}</span>
      </div>
    `)
  }
  if (params.requiredEvidences?.trim()) {
    blocks.push(`
      <div>
        <strong style="font-size: 12px; color: #003B3A;">• Minh chứng cần nộp:</strong>
        <span style="font-size: 13px; color: #334155;"> ${escapeHtml(params.requiredEvidences)}</span>
      </div>
    `)
  }

  if (blocks.length === 0) return ""
  return `
    <div style="background-color: #F0FDFA; border: 1px solid #CCFBF1; border-radius: 10px; padding: 14px 18px; margin: 14px 0;">
      ${blocks.join("")}
    </div>
  `
}

/**
 * 1. Gửi Email khi phát hành giao việc mới (hoặc chuyển từ Nháp -> Đã giao / đổi Người phụ trách)
 * Gửi đến tất cả thành viên liên quan:
 * - Người chịu trách nhiệm chính / Người điều phối nhóm (Yêu cầu xác nhận nhận việc & thực hiện)
 * - Người phối hợp & Thành viên trong Nhóm chuyên môn (Thông báo phối hợp thực hiện)
 * - Người duyệt kết quả nghiệm thu (Thông báo lịch nghiệm thu nếu khác người giao)
 */
export async function sendQaTaskAssignmentEmails(params: {
  taskId: string
  title: string
  description?: string | null
  category: string
  taskGroupName?: string | null
  assignmentMode?: QaAssignmentMode | string
  priority?: QaPriority | string
  startDate: string | Date
  endDate: string | Date
  reviewDueDate?: string | Date | null
  requiresApproval?: boolean
  deliverables?: string | null
  completionCriteria?: string | null
  requiredEvidences?: string | null
  checklist?: QaChecklistStep[]
  assignerUserId: string
  assignerName: string
  primaryAssigneeId: string
  collaboratorUserIds?: string[]
  groupMemberUserIds?: string[]
  reviewerUserId?: string | null
  isReassignment?: boolean
}): Promise<{ sentCount: number; failedCount: number; recipients: string[] }> {
  const baseUrl = resolveQaAppBaseUrl()
  const allIds = [
    params.primaryAssigneeId,
    ...(params.collaboratorUserIds || []),
    ...(params.groupMemberUserIds || []),
    params.reviewerUserId || null,
  ]
  const userMap = await resolveQaUsersByIds(allIds)
  const primaryUser = userMap.get(params.primaryAssigneeId)
  const reviewerUser = params.reviewerUserId ? userMap.get(params.reviewerUserId) : null

  const prioInfo = formatPriorityLabel(params.priority)
  const startStr = formatDateVi(params.startDate)
  const endStr = formatDateVi(params.endDate)
  const reviewDueStr = params.reviewDueDate ? formatDateVi(params.reviewDueDate) : null

  const sentEmails = new Set<string>()
  let sentCount = 0
  let failedCount = 0

  const extraContentHtml =
    renderDeliverablesAndCriteriaHtml({
      description: params.description,
      deliverables: params.deliverables,
      completionCriteria: params.completionCriteria,
      requiredEvidences: params.requiredEvidences,
    }) + renderChecklistHtml(params.checklist)

  // A. Gửi đến Người chịu trách nhiệm chính (Yêu cầu xác nhận nhận việc & thực hiện)
  if (primaryUser?.email) {
    const emailLower = primaryUser.email.toLowerCase()
    sentEmails.add(emailLower)
    const confirmUrl = `${baseUrl}/admin/tasks?taskId=${encodeURIComponent(params.taskId)}&action=confirm`

    const html = renderSkylineEmail({
      headerBadge: prioInfo.isHigh ? "⚠️ NHIỆM VỤ ƯU TIÊN • QA WORKSPACE" : "📋 PHIẾU GIAO VIỆC • KT&ĐBCL",
      headerTitle: params.isReassignment
        ? "ĐIỀU PHỐI PHỤ TRÁCH & YÊU CẦU XÁC NHẬN NHẬN VIỆC"
        : "THÔNG BÁO GIAO VIỆC & YÊU CẦU XÁC NHẬN TIẾP NHẬN",
      headerSubtitle: "QA Workspace | Ban Khảo thí & Đảm bảo Chất lượng Giáo dục Sky-Line",
      headerTheme: prioInfo.isHigh ? "rose" : "teal",
      recipientName: primaryUser.fullName,
      introMessage: `Thầy/Cô được phân công là <strong>Người chịu trách nhiệm chính</strong> cho nhiệm vụ dưới đây từ <strong>${escapeHtml(params.assignerName)}</strong>. Kính đề nghị Thầy/Cô kiểm tra nội dung yêu cầu, bấm <strong>Xác nhận nhận việc</strong>, triển khai thực hiện và cập nhật xác nhận hoàn thành đúng tiến độ:`,
      detailsTitle: "THÔNG TIN PHIẾU GIAO VIỆC",
      details: [
        { icon: "📌", label: "Tên nhiệm vụ", value: escapeHtml(params.title), highlight: true },
        { icon: "🗂️", label: "Nhóm / Danh mục", value: escapeHtml([params.taskGroupName, params.category].filter(Boolean).join(" • ") || "KT&ĐBCL") },
        { icon: "👤", label: "Người giao việc", value: escapeHtml(params.assignerName) },
        { icon: "🎯", label: "Phương thức & Ưu tiên", value: `${formatAssignmentModeLabel(params.assignmentMode)} • ${prioInfo.label}`, color: prioInfo.color, highlight: prioInfo.isHigh },
        { icon: "📅", label: "Thời hạn thực hiện", value: `${startStr} đến hết ngày ${endStr}`, color: "#E11D48", highlight: true },
        ...(reviewDueStr
          ? [{ icon: "🛡️", label: "Hạn duyệt nghiệm thu", value: reviewDueStr }]
          : []),
        ...(reviewerUser
          ? [{ icon: "✅", label: "Người duyệt kết quả", value: escapeHtml(reviewerUser.fullName) }]
          : []),
      ],
      extraHtml: extraContentHtml,
      noticeBox: {
        type: "info",
        title: "Quy trình xác nhận & báo cáo hoàn thành trên QA Workspace",
        content: params.requiresApproval !== false
          ? "Bước 1: Bấm nút bên dưới để <strong>Xác nhận nhận việc</strong> (hoặc gửi ý kiến phản hồi nếu cần điều chỉnh).<br/>Bước 2: Thực hiện các bước công việc và đính kèm sản phẩm/minh chứng.<br/>Bước 3: Bấm <strong>Gửi duyệt kết quả</strong> để Người duyệt xác nhận hoàn thành tiến độ."
          : "Bước 1: Bấm nút bên dưới để <strong>Xác nhận nhận việc</strong>.<br/>Bước 2: Triển khai công việc và bấm <strong>Xác nhận hoàn thành tiến độ</strong> ngay khi hoàn tất.",
      },
      button: {
        text: "✅ Xác nhận nhận việc & Thực hiện ngay",
        url: confirmUrl,
        color: prioInfo.isHigh ? "#E11D48" : "#00A19A",
      },
      secondaryNote:
        "Thầy/Cô cũng có thể truy cập trực tiếp tại mục QA Workspace | KT&ĐBCL hoặc Không gian Giáo viên → Nhiệm vụ của tôi trên hệ thống SSM.",
    })

    const res = await sendEmail({
      to: primaryUser.email,
      subject: `${prioInfo.isHigh ? "[ƯU TIÊN] " : ""}[Giao việc & Yêu cầu xác nhận] ${params.title}`,
      html,
    })
    if (res.success) sentCount++
    else failedCount++
  }

  // B. Gửi đến Người phối hợp & Thành viên thuộc Nhóm chuyên môn (khi giao việc nhóm)
  const collaboratorSet = new Set<string>([
    ...(params.collaboratorUserIds || []),
    ...(params.assignmentMode === "GROUP" ? params.groupMemberUserIds || [] : []),
  ])
  collaboratorSet.delete(params.primaryAssigneeId)

  for (const colId of collaboratorSet) {
    const colUser = userMap.get(colId)
    if (!colUser?.email) continue
    const emailLower = colUser.email.toLowerCase()
    if (sentEmails.has(emailLower)) continue
    sentEmails.add(emailLower)

    const isDirectCollab = (params.collaboratorUserIds || []).includes(colId)
    const roleDesc = isDirectCollab ? "Người phối hợp thực hiện" : `Thành viên nhóm ${params.taskGroupName || "chuyên môn"}`
    const detailUrl = `${baseUrl}/admin/tasks?taskId=${encodeURIComponent(params.taskId)}`

    const html = renderSkylineEmail({
      headerBadge: "🤝 PHỐI HỢP THỰC HIỆN • KT&ĐBCL",
      headerTitle: "THÔNG BÁO PHỐI HỢP THỰC HIỆN CÔNG VIỆC",
      headerSubtitle: "QA Workspace | Ban Khảo thí & Đảm bảo Chất lượng Giáo dục Sky-Line",
      headerTheme: "teal",
      recipientName: colUser.fullName,
      introMessage: `<strong>${escapeHtml(params.assignerName)}</strong> vừa phát hành phiếu giao việc mới trong đó Thầy/Cô tham gia với vai trò <strong>${escapeHtml(roleDesc)}</strong> (Người chủ trì chính: <strong>${escapeHtml(primaryUser?.fullName || "Điều phối viên")}</strong>). Kính mời Thầy/Cô nắm thông tin để phối hợp triển khai đúng tiến độ:`,
      detailsTitle: "THÔNG TIN CÔNG VIỆC PHỐI HỢP",
      details: [
        { icon: "📌", label: "Tên nhiệm vụ", value: escapeHtml(params.title), highlight: true },
        { icon: "👤", label: "Chịu trách nhiệm chính", value: escapeHtml(primaryUser?.fullName || "Điều phối viên"), highlight: true },
        { icon: "🤝", label: "Vai trò của Thầy/Cô", value: escapeHtml(roleDesc) },
        { icon: "📅", label: "Thời hạn bàn giao", value: `${startStr} đến hết ngày ${endStr}`, color: "#E11D48", highlight: true },
      ],
      extraHtml: extraContentHtml,
      button: {
        text: "📋 Xem chi tiết & Phối hợp thực hiện",
        url: detailUrl,
        color: "#003B3A",
      },
      secondaryNote:
        "Mọi trao đổi tiến độ, tệp đính kèm minh chứng hoặc báo cáo vướng mắc đều được đồng bộ trực tiếp trên phiếu công việc này.",
    })

    const res = await sendEmail({
      to: colUser.email,
      subject: `[Phối hợp công việc KT&ĐBCL] ${params.title}`,
      html,
    })
    if (res.success) sentCount++
    else failedCount++
  }

  // C. Gửi đến Người duyệt kết quả nghiệm thu (nếu khác Người giao việc và chưa nhận mail ở trên)
  if (
    reviewerUser?.email &&
    params.requiresApproval !== false &&
    reviewerUser.id !== params.assignerUserId
  ) {
    const emailLower = reviewerUser.email.toLowerCase()
    if (!sentEmails.has(emailLower)) {
      sentEmails.add(emailLower)
      const reviewUrl = `${baseUrl}/admin/tasks?taskId=${encodeURIComponent(params.taskId)}&tab=review`

      const html = renderSkylineEmail({
        headerBadge: "🛡️ PHÂN CÔNG NGHIỆM THU • KT&ĐBCL",
        headerTitle: "THÔNG BÁO PHÂN CÔNG DUYỆT NGHIỆM THU NHIỆM VỤ",
        headerSubtitle: "QA Workspace | Ban Khảo thí & Đảm bảo Chất lượng Giáo dục Sky-Line",
        headerTheme: "teal",
        recipientName: reviewerUser.fullName,
        introMessage: `<strong>${escapeHtml(params.assignerName)}</strong> đã chỉ định Thầy/Cô là <strong>Người duyệt nghiệm thu kết quả</strong> cho nhiệm vụ dưới đây. Hệ thống sẽ tự động thông báo lại ngay khi người thực hiện nộp báo cáo hoàn thành và minh chứng:`,
        detailsTitle: "THÔNG TIN NHIỆM VỤ CẦN NGHIỆM THU",
        details: [
          { icon: "📌", label: "Tên nhiệm vụ", value: escapeHtml(params.title), highlight: true },
          { icon: "👤", label: "Người thực hiện chính", value: escapeHtml(primaryUser?.fullName || "Nhân sự") },
          { icon: "📅", label: "Hạn bàn giao thực hiện", value: endStr, highlight: true },
          ...(reviewDueStr
            ? [{ icon: "⏰", label: "Hạn duyệt nghiệm thu", value: reviewDueStr, color: "#00A19A", highlight: true }]
            : []),
        ],
        extraHtml: extraContentHtml,
        button: {
          text: "🔎 Xem phiếu giao việc trên QA Workspace",
          url: reviewUrl,
          color: "#00A19A",
        },
      })

      const res = await sendEmail({
        to: reviewerUser.email,
        subject: `[Phân công duyệt nghiệm thu] ${params.title}`,
        html,
      })
      if (res.success) sentCount++
      else failedCount++
    }
  }

  return {
    sentCount,
    failedCount,
    recipients: Array.from(sentEmails),
  }
}

/**
 * 2. Gửi Email khi thành viên Xác nhận nhận việc (ACCEPTED) hoặc Phản hồi / Từ chối (REJECTED)
 */
export async function sendQaTaskConfirmationFeedbackEmail(params: {
  taskId: string
  taskTitle: string
  category?: string | null
  endDate?: string | Date | null
  actorUserId: string
  actorName: string
  accepted: boolean
  reason?: string | null
  assignerUserId?: string | null
  coordinatorUserId?: string | null
  reviewerUserId?: string | null
}): Promise<{ sentCount: number }> {
  const baseUrl = resolveQaAppBaseUrl()
  const targetIds = [
    params.assignerUserId,
    params.coordinatorUserId,
    params.reviewerUserId,
  ].filter((id) => id && id !== params.actorUserId)

  const userMap = await resolveQaUsersByIds(targetIds)
  const sentEmails = new Set<string>()
  let sentCount = 0
  const taskUrl = `${baseUrl}/admin/tasks?taskId=${encodeURIComponent(params.taskId)}`
  const nowVi = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })

  for (const [, recipient] of userMap.entries()) {
    if (!recipient.email) continue
    const emailLower = recipient.email.toLowerCase()
    if (sentEmails.has(emailLower)) continue
    sentEmails.add(emailLower)

    const html = params.accepted
      ? renderSkylineEmail({
          headerBadge: "✅ ĐÃ XÁC NHẬN NHẬN VIỆC",
          headerTitle: "THÀNH VIÊN ĐÃ TIẾP NHẬN & BẮT ĐẦU THỰC HIỆN CÔNG VIỆC",
          headerSubtitle: "QA Workspace | Hệ thống Quản lý Công việc KT&ĐBCL",
          headerTheme: "emerald",
          recipientName: recipient.fullName,
          introMessage: `Thành viên <strong>${escapeHtml(params.actorName)}</strong> đã chính thức <strong>xác nhận tiếp nhận công việc</strong> và chuyển trạng thái sang <strong>Đang thực hiện</strong>:`,
          details: [
            { icon: "📌", label: "Tên nhiệm vụ", value: escapeHtml(params.taskTitle), highlight: true },
            { icon: "👤", label: "Người xác nhận thực hiện", value: escapeHtml(params.actorName), highlight: true },
            { icon: "⏰", label: "Thời điểm xác nhận", value: nowVi },
            ...(params.endDate
              ? [{ icon: "📅", label: "Hạn bàn giao kết quả", value: formatDateVi(params.endDate) }]
              : []),
          ],
          button: {
            text: "👉 Theo dõi tiến độ nhiệm vụ",
            url: taskUrl,
            color: "#059669",
          },
        })
      : renderSkylineEmail({
          headerBadge: "⚠️ PHẢN HỒI NHẬN VIỆC",
          headerTitle: "Ý KIẾN PHẢN HỒI / ĐỀ XUẤT ĐIỀU CHỈNH CÔNG VIỆC ĐƯỢC GIAO",
          headerSubtitle: "QA Workspace | Hệ thống Quản lý Công việc KT&ĐBCL",
          headerTheme: "rose",
          recipientName: recipient.fullName,
          introMessage: `Thành viên <strong>${escapeHtml(params.actorName)}</strong> vừa gửi phản hồi / đề xuất trao đổi lại đối với nhiệm vụ được giao:`,
          details: [
            { icon: "📌", label: "Tên nhiệm vụ", value: escapeHtml(params.taskTitle), highlight: true },
            { icon: "👤", label: "Người gửi phản hồi", value: escapeHtml(params.actorName) },
            { icon: "⏰", label: "Thời gian phản hồi", value: nowVi },
          ],
          noticeBox: {
            type: "warning",
            title: "Nội dung phản hồi / Lý do đề xuất điều chỉnh",
            content: escapeHtml(params.reason || "Cần trao đổi lại về phạm vi hoặc thời hạn thực hiện."),
          },
          button: {
            text: "👉 Xem & Điều phối lại nhiệm vụ",
            url: taskUrl,
            color: "#E11D48",
          },
        })

    const res = await sendEmail({
      to: recipient.email,
      subject: params.accepted
        ? `[Đã xác nhận nhận việc] ${params.actorName}: ${params.taskTitle}`
        : `[Phản hồi nhận việc] ${params.actorName}: ${params.taskTitle}`,
      html,
    })
    if (res.success) sentCount++
  }

  return { sentCount }
}

/**
 * 3. Gửi Email khi chuyển trạng thái tiến độ quan trọng:
 * - PENDING_REVIEW: Thành viên báo cáo hoàn thành tiến độ & nộp minh chứng chờ nghiệm thu -> gửi Người duyệt / Người giao / Điều phối
 * - COMPLETED: Đã xác nhận hoàn thành nghiệm thu (hoặc hoàn thành trực tiếp không qua duyệt) -> gửi Người thực hiện / Người phối hợp / Người giao
 * - NEEDS_REVISION: Người duyệt yêu cầu bổ sung / chỉnh sửa kết quả -> gửi Người thực hiện & Người phối hợp
 * - PAUSED / CANCELLED / REOPEN: Thông báo thay đổi trạng thái điều hành kèm lý do
 */
export async function sendQaWorkflowTransitionEmails(params: {
  taskId: string
  taskTitle: string
  category?: string | null
  endDate?: string | Date | null
  reviewDueDate?: string | Date | null
  fromStatus: QaWorkflowStatus
  toStatus: QaWorkflowStatus
  actorUserId: string
  actorName: string
  assignerUserId?: string | null
  primaryAssigneeId?: string | null
  coordinatorUserId?: string | null
  reviewerUserId?: string | null
  collaboratorUserIds?: string[]
  resultSummary?: string | null
  evidenceLinks?: Array<{ url?: string; title?: string; label?: string } | string>
  reviewComment?: string | null
  reviewRating?: QaReviewRating | string | null
  reason?: string | null
  checklistCompleted?: number
  checklistTotal?: number
}): Promise<{ sentCount: number }> {
  const baseUrl = resolveQaAppBaseUrl()
  const nowVi = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })
  let sentCount = 0
  const sentEmails = new Set<string>()

  const evidenceList = (params.evidenceLinks || [])
    .map((item: any) => (typeof item === "string" ? item : item?.url || item?.title || item?.label || ""))
    .filter(Boolean)

  const evidenceHtml =
    evidenceList.length > 0
      ? `
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 12px 16px; margin: 14px 0;">
      <div style="font-size: 12px; font-weight: 800; color: #003B3A; margin-bottom: 6px;">
        📎 Minh chứng / Sản phẩm đính kèm (${evidenceList.length}):
      </div>
      <ul style="margin: 0; padding-left: 18px; font-size: 12.5px; color: #00736E;">
        ${evidenceList
          .map(
            (lnk) =>
              `<li style="margin-bottom: 4px; word-break: break-all;"><a href="${escapeHtml(lnk)}" target="_blank" style="color: #008B85; text-decoration: underline;">${escapeHtml(lnk)}</a></li>`
          )
          .join("")}
      </ul>
    </div>
  `
      : ""

  // TRƯỜNG HỢP A: Thành viên báo cáo hoàn thành tiến độ & gửi duyệt nghiệm thu (PENDING_REVIEW)
  if (params.toStatus === "PENDING_REVIEW") {
    const managerIds = [
      params.reviewerUserId,
      params.assignerUserId,
      params.coordinatorUserId,
    ].filter((id) => id && id !== params.actorUserId)

    const userMap = await resolveQaUsersByIds([
      ...managerIds,
      params.primaryAssigneeId,
    ])
    const reviewUrl = `${baseUrl}/admin/tasks?taskId=${encodeURIComponent(params.taskId)}&tab=review`

    for (const uid of managerIds) {
      if (!uid) continue
      const recipient = userMap.get(uid)
      if (!recipient?.email) continue
      const emailLower = recipient.email.toLowerCase()
      if (sentEmails.has(emailLower)) continue
      sentEmails.add(emailLower)

      const checklistText =
        params.checklistTotal && params.checklistTotal > 0
          ? `${params.checklistCompleted || 0}/${params.checklistTotal} bước (${Math.round(((params.checklistCompleted || 0) / params.checklistTotal) * 100)}%)`
          : "Hoàn tất nội dung thực hiện"

      const html = renderSkylineEmail({
        headerBadge: "📤 CHỜ DUYỆT NGHIỆM THU • KT&ĐBCL",
        headerTitle: "BÁO CÁO HOÀN THÀNH TIẾN ĐỘ & ĐỀ NGHỊ NGHIỆM THU",
        headerSubtitle: "QA Workspace | Ban Khảo thí & Đảm bảo Chất lượng Giáo dục Sky-Line",
        headerTheme: "teal",
        recipientName: recipient.fullName,
        introMessage: `Thành viên <strong>${escapeHtml(params.actorName)}</strong> đã hoàn thành thực hiện công việc, cập nhật kết quả/minh chứng và gửi yêu cầu <strong>xác nhận nghiệm thu hoàn thành</strong>:`,
        detailsTitle: "THÔNG TIN BÁO CÁO HOÀN THÀNH",
        details: [
          { icon: "📌", label: "Tên nhiệm vụ", value: escapeHtml(params.taskTitle), highlight: true },
          { icon: "👤", label: "Người báo cáo hoàn thành", value: escapeHtml(params.actorName), highlight: true },
          { icon: "📊", label: "Tiến độ thực hiện", value: checklistText, color: "#00A19A", highlight: true },
          { icon: "⏰", label: "Thời điểm gửi duyệt", value: nowVi },
          ...(params.reviewDueDate
            ? [{ icon: "🛡️", label: "Hạn duyệt nghiệm thu", value: formatDateVi(params.reviewDueDate), color: "#D97706", highlight: true }]
            : []),
        ],
        extraHtml: evidenceHtml,
        noticeBox: params.resultSummary?.trim()
          ? {
              type: "info",
              title: "Tóm tắt kết quả thực hiện của thành viên",
              content: escapeHtml(params.resultSummary),
            }
          : undefined,
        button: {
          text: "✅ Kiểm tra minh chứng & Xác nhận hoàn thành",
          url: reviewUrl,
          color: "#00A19A",
        },
      })

      const res = await sendEmail({
        to: recipient.email,
        subject: `[Chờ duyệt hoàn thành] ${params.actorName} đã nộp kết quả: ${params.taskTitle}`,
        html,
      })
      if (res.success) sentCount++
    }
    return { sentCount }
  }

  // TRƯỜNG HỢP B: Xác nhận hoàn thành nghiệm thu (COMPLETED)
  if (params.toStatus === "COMPLETED") {
    const isSelfCompletedNoApproval =
      params.actorUserId === params.primaryAssigneeId &&
      params.fromStatus !== "PENDING_REVIEW"

    const targetIds = isSelfCompletedNoApproval
      ? [
          params.assignerUserId,
          params.coordinatorUserId,
          ...(params.collaboratorUserIds || []),
        ].filter((id) => id && id !== params.actorUserId)
      : [
          params.primaryAssigneeId,
          ...(params.collaboratorUserIds || []),
          params.assignerUserId,
        ].filter((id) => id && id !== params.actorUserId)

    const userMap = await resolveQaUsersByIds(targetIds)
    const detailUrl = `${baseUrl}/admin/tasks?taskId=${encodeURIComponent(params.taskId)}&tab=review`

    for (const uid of targetIds) {
      if (!uid) continue
      const recipient = userMap.get(uid)
      if (!recipient?.email) continue
      const emailLower = recipient.email.toLowerCase()
      if (sentEmails.has(emailLower)) continue
      sentEmails.add(emailLower)

      const html = renderSkylineEmail({
        headerBadge: "🏆 ĐÃ XÁC NHẬN HOÀN THÀNH",
        headerTitle: isSelfCompletedNoApproval
          ? "XÁC NHẬN HOÀN THÀNH TIẾN ĐỘ CÔNG VIỆC"
          : "NHIỆM VỤ ĐÃ ĐƯỢC NGHIỆM THU HOÀN THÀNH",
        headerSubtitle: "QA Workspace | Ban Khảo thí & Đảm bảo Chất lượng Giáo dục Sky-Line",
        headerTheme: "emerald",
        recipientName: recipient.fullName,
        introMessage: isSelfCompletedNoApproval
          ? `Thành viên <strong>${escapeHtml(params.actorName)}</strong> đã xác nhận <strong>hoàn thành tiến độ</strong> cho nhiệm vụ dưới đây:`
          : `Người duyệt <strong>${escapeHtml(params.actorName)}</strong> đã kiểm tra minh chứng và <strong>phê duyệt hoàn thành nghiệm thu</strong> nhiệm vụ:`,
        detailsTitle: "KẾT QUẢ XÁC NHẬN HOÀN THÀNH",
        details: [
          { icon: "📌", label: "Tên nhiệm vụ", value: escapeHtml(params.taskTitle), highlight: true },
          {
            icon: "✅",
            label: isSelfCompletedNoApproval ? "Người xác nhận hoàn thành" : "Người phê duyệt nghiệm thu",
            value: escapeHtml(params.actorName),
            highlight: true,
          },
          ...(!isSelfCompletedNoApproval && params.reviewRating
            ? [{ icon: "🌟", label: "Đánh giá chất lượng", value: formatReviewRatingLabel(params.reviewRating), color: "#059669", highlight: true }]
            : []),
          { icon: "⏰", label: "Thời điểm hoàn thành", value: nowVi },
        ],
        extraHtml: evidenceHtml,
        noticeBox:
          params.reviewComment?.trim() || params.resultSummary?.trim()
            ? {
                type: "success",
                title: isSelfCompletedNoApproval ? "Báo cáo kết quả hoàn thành" : "Nhận xét nghiệm thu",
                content: escapeHtml(params.reviewComment || params.resultSummary || ""),
              }
            : undefined,
        button: {
          text: "👉 Xem hồ sơ nhiệm vụ đã hoàn thành",
          url: detailUrl,
          color: "#059669",
        },
      })

      const res = await sendEmail({
        to: recipient.email,
        subject: `[Đã hoàn thành công việc] ${params.taskTitle}`,
        html,
      })
      if (res.success) sentCount++
    }
    return { sentCount }
  }

  // TRƯỜNG HỢP C: Yêu cầu bổ sung / chỉnh sửa (NEEDS_REVISION)
  if (params.toStatus === "NEEDS_REVISION") {
    const targetIds = [
      params.primaryAssigneeId,
      ...(params.collaboratorUserIds || []),
    ].filter((id) => id && id !== params.actorUserId)

    const userMap = await resolveQaUsersByIds(targetIds)
    const detailUrl = `${baseUrl}/admin/tasks?taskId=${encodeURIComponent(params.taskId)}&tab=review`

    for (const uid of targetIds) {
      if (!uid) continue
      const recipient = userMap.get(uid)
      if (!recipient?.email) continue
      const emailLower = recipient.email.toLowerCase()
      if (sentEmails.has(emailLower)) continue
      sentEmails.add(emailLower)

      const html = renderSkylineEmail({
        headerBadge: "📝 YÊU CẦU BỔ SUNG KẾT QUẢ",
        headerTitle: "ĐỀ NGHỊ BỔ SUNG / HOÀN THIỆN SẢN PHẨM & MINH CHỨNG",
        headerSubtitle: "QA Workspace | Ban Khảo thí & Đảm bảo Chất lượng Giáo dục Sky-Line",
        headerTheme: "amber",
        recipientName: recipient.fullName,
        introMessage: `Người duyệt <strong>${escapeHtml(params.actorName)}</strong> đã xem xét kết quả nhiệm vụ và đề nghị bổ sung/hoàn thiện thêm một số nội dung trước khi nghiệm thu hoàn thành:`,
        details: [
          { icon: "📌", label: "Tên nhiệm vụ", value: escapeHtml(params.taskTitle), highlight: true },
          { icon: "👤", label: "Người yêu cầu bổ sung", value: escapeHtml(params.actorName) },
          ...(params.endDate
            ? [{ icon: "📅", label: "Hạn thực hiện", value: formatDateVi(params.endDate), highlight: true }]
            : []),
        ],
        noticeBox: {
          type: "warning",
          title: "Nội dung yêu cầu bổ sung / chỉnh sửa",
          content: escapeHtml(params.reviewComment || params.reason || "Vui lòng kiểm tra chi tiết trên hệ thống và gửi duyệt lại."),
        },
        button: {
          text: "👉 Cập nhật kết quả & Gửi duyệt lại",
          url: detailUrl,
          color: "#D97706",
        },
      })

      const res = await sendEmail({
        to: recipient.email,
        subject: `[Cần bổ sung kết quả] ${params.taskTitle}`,
        html,
      })
      if (res.success) sentCount++
    }
    return { sentCount }
  }

  // TRƯỜNG HỢP D: Tạm dừng / Hủy / Mở lại nhiệm vụ
  if (
    params.toStatus === "PAUSED" ||
    params.toStatus === "CANCELLED" ||
    (params.toStatus === "IN_PROGRESS" &&
      (params.fromStatus === "COMPLETED" ||
        params.fromStatus === "PAUSED" ||
        params.fromStatus === "CANCELLED"))
  ) {
    const targetIds = [
      params.primaryAssigneeId,
      params.assignerUserId,
      ...(params.collaboratorUserIds || []),
    ].filter((id) => id && id !== params.actorUserId)

    const userMap = await resolveQaUsersByIds(targetIds)
    const detailUrl = `${baseUrl}/admin/tasks?taskId=${encodeURIComponent(params.taskId)}`

    const statusLabel =
      params.toStatus === "PAUSED"
        ? "Tạm dừng thực hiện"
        : params.toStatus === "CANCELLED"
        ? "Đã hủy nhiệm vụ"
        : "Mở lại để tiếp tục thực hiện"

    for (const uid of targetIds) {
      if (!uid) continue
      const recipient = userMap.get(uid)
      if (!recipient?.email) continue
      const emailLower = recipient.email.toLowerCase()
      if (sentEmails.has(emailLower)) continue
      sentEmails.add(emailLower)

      const html = renderSkylineEmail({
        headerBadge: "🔄 CẬP NHẬT TRẠNG THÁI NHIỆM VỤ",
        headerTitle: `THÔNG BÁO: ${statusLabel.toUpperCase()}`,
        headerSubtitle: "QA Workspace | Ban Khảo thí & Đảm bảo Chất lượng Giáo dục Sky-Line",
        headerTheme: params.toStatus === "CANCELLED" ? "rose" : "amber",
        recipientName: recipient.fullName,
        introMessage: `<strong>${escapeHtml(params.actorName)}</strong> vừa cập nhật trạng thái nhiệm vụ sang <strong>${statusLabel}</strong>:`,
        details: [
          { icon: "📌", label: "Tên nhiệm vụ", value: escapeHtml(params.taskTitle), highlight: true },
          { icon: "🔄", label: "Trạng thái mới", value: statusLabel, highlight: true },
          { icon: "⏰", label: "Thời gian cập nhật", value: nowVi },
        ],
        noticeBox: params.reason
          ? {
              type: "note",
              title: "Lý do cập nhật",
              content: escapeHtml(params.reason),
            }
          : undefined,
        button: {
          text: "👉 Xem chi tiết trên QA Workspace",
          url: detailUrl,
        },
      })

      const res = await sendEmail({
        to: recipient.email,
        subject: `[${statusLabel}] ${params.taskTitle}`,
        html,
      })
      if (res.success) sentCount++
    }
  }

  return { sentCount }
}

/**
 * 4. Gửi Email gộp (Digest) khi kích hoạt Nhắc việc Thông minh 6 kịch bản (chống spam trong ngày)
 */
export async function sendQaSmartReminderDigestEmail(params: {
  recipientUserId: string
  items: Array<{
    taskId: string
    taskTitle: string
    reminderType: string
    roleType: "ASSIGNEE" | "COORDINATOR" | "REVIEWER"
    detail: string
  }>
}): Promise<boolean> {
  if (!params.items || params.items.length === 0) return false
  const userMap = await resolveQaUsersByIds([params.recipientUserId])
  const recipient = userMap.get(params.recipientUserId)
  if (!recipient?.email) return false

  const baseUrl = resolveQaAppBaseUrl()
  const primaryLink = `${baseUrl}/admin/tasks?taskId=${encodeURIComponent(params.items[0].taskId)}`

  const rowsHtml = params.items
    .map((item, idx) => {
      const taskLink = `${baseUrl}/admin/tasks?taskId=${encodeURIComponent(item.taskId)}`
      const roleLabel =
        item.roleType === "REVIEWER"
          ? "Người duyệt nghiệm thu"
          : item.roleType === "COORDINATOR"
          ? "Điều phối tháo gỡ"
          : "Người thực hiện"
      return `
        <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #00A19A; border-radius: 8px; padding: 12px 14px; margin-bottom: 10px;">
          <div style="font-size: 13px; font-weight: 800; color: #003B3A;">
            ${idx + 1}. ${escapeHtml(item.taskTitle)}
          </div>
          <div style="font-size: 12px; color: #475569; margin-top: 4px;">
            <strong>Vai trò:</strong> ${roleLabel} • <strong>Tình trạng:</strong> <span style="color: #D97706; font-weight: 700;">${escapeHtml(item.detail)}</span>
          </div>
          <div style="margin-top: 6px;">
            <a href="${taskLink}" target="_blank" style="font-size: 12px; font-weight: 700; color: #008B85; text-decoration: underline;">
              Mở nhiệm vụ & xử lý ngay &rarr;
            </a>
          </div>
        </div>
      `
    })
    .join("")

  const html = renderSkylineEmail({
    headerBadge: "⏰ NHẮC VIỆC ĐIỀU HÀNH • KT&ĐBCL",
    headerTitle:
      params.items.length === 1
        ? "NHẮC NHỞ XÁC NHẬN & CẬP NHẬT TIẾN ĐỘ NHIỆM VỤ"
        : `TỔNG HỢP ${params.items.length} NHIỆM VỤ CẦN XÁC NHẬN & XỬ LÝ`,
    headerSubtitle: "QA Workspace | Hệ thống Nhắc việc Thông minh Ban KT&ĐBCL",
    headerTheme: "amber",
    recipientName: recipient.fullName,
    introMessage: `Hệ thống điều hành <strong>QA Workspace | KT&ĐBCL</strong> gửi đến Thầy/Cô danh sách công việc cần xác nhận nhận việc, cập nhật tiến độ hoặc phê duyệt nghiệm thu trong ngày:`,
    extraHtml: rowsHtml,
    button: {
      text: "👉 Truy cập QA Workspace để xử lý",
      url: primaryLink,
      color: "#003B3A",
    },
  })

  const res = await sendEmail({
    to: recipient.email,
    subject:
      params.items.length === 1
        ? `[Nhắc việc KT&ĐBCL] ${params.items[0].taskTitle}`
        : `[Nhắc việc KT&ĐBCL] Bạn có ${params.items.length} nhiệm vụ cần xác nhận / xử lý`,
    html,
  })
  return Boolean(res.success)
}

/**
 * 5. Gửi Email cảnh báo nhanh khi có Vướng mắc (BLOCKER) hoặc Yêu cầu phối hợp (COOPERATION)
 */
export async function sendQaTaskCommentAlertEmail(params: {
  taskId: string
  taskTitle: string
  actorUserId: string
  actorName: string
  commentType: string
  content: string
  recipientUserIds: string[]
}): Promise<{ sentCount: number }> {
  if (params.commentType !== "BLOCKER" && params.commentType !== "COOPERATION" && params.commentType !== "CONCLUSION") {
    return { sentCount: 0 }
  }

  const targetIds = params.recipientUserIds.filter((id) => id && id !== params.actorUserId)
  if (targetIds.length === 0) return { sentCount: 0 }

  const userMap = await resolveQaUsersByIds(targetIds)
  const baseUrl = resolveQaAppBaseUrl()
  const detailUrl = `${baseUrl}/admin/tasks?taskId=${encodeURIComponent(params.taskId)}`
  const sentEmails = new Set<string>()
  let sentCount = 0

  const isBlocker = params.commentType === "BLOCKER"
  const isConclusion = params.commentType === "CONCLUSION"

  for (const [, recipient] of userMap.entries()) {
    if (!recipient.email) continue
    const emailLower = recipient.email.toLowerCase()
    if (sentEmails.has(emailLower)) continue
    sentEmails.add(emailLower)

    const html = renderSkylineEmail({
      headerBadge: isBlocker
        ? "⚠️ BÁO CÁO VƯỚNG MẮC CẦN THÁO GỠ"
        : isConclusion
        ? "📌 KẾT LUẬN CHỈ ĐẠO MỚI"
        : "🤝 YÊU CẦU PHỐI HỢP CÔNG VIỆC",
      headerTitle: isBlocker
        ? "CẢNH BÁO VƯỚNG MẮC TRONG QUÁ TRÌNH THỰC HIỆN"
        : isConclusion
        ? "THÔNG BÁO KẾT LUẬN CHỈ ĐẠO NHIỆM VỤ"
        : "ĐỀ NGHỊ PHỐI HỢP TRÊN NHIỆM VỤ KT&ĐBCL",
      headerSubtitle: "QA Workspace | Ban Khảo thí & Đảm bảo Chất lượng Giáo dục Sky-Line",
      headerTheme: isBlocker ? "rose" : "teal",
      recipientName: recipient.fullName,
      introMessage: `<strong>${escapeHtml(params.actorName)}</strong> vừa gửi ${
        isBlocker ? "báo cáo vướng mắc cần tháo gỡ" : isConclusion ? "kết luận chỉ đạo" : "yêu cầu phối hợp"
      } trên nhiệm vụ <strong>"${escapeHtml(params.taskTitle)}"</strong>:`,
      noticeBox: {
        type: isBlocker ? "warning" : "info",
        title: "Nội dung chi tiết",
        content: escapeHtml(params.content),
      },
      button: {
        text: "👉 Mở nhiệm vụ để phản hồi & xử lý",
        url: detailUrl,
        color: isBlocker ? "#E11D48" : "#00A19A",
      },
    })

    const res = await sendEmail({
      to: recipient.email,
      subject: `${isBlocker ? "[Vướng mắc cần tháo gỡ]" : isConclusion ? "[Kết luận chỉ đạo]" : "[Yêu cầu phối hợp]"} ${params.taskTitle}`,
      html,
    })
    if (res.success) sentCount++
  }

  return { sentCount }
}
