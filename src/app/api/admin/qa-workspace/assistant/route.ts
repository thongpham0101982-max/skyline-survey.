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
      const periodType = body.periodType === "MONTHLY" ? "MONTHLY" : "WEEKLY"
      const groupFilter = body.taskGroupId || "ALL"

      const rawTasks = await prisma.workTask.findMany({
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
        take: 100,
      })

      const metaMap = await getQaMetadataMapForTasks(rawTasks)
      const now = new Date()
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

      const titleLabel = periodType === "MONTHLY" ? "BÁO CÁO THÁNG" : "BÁO CÁO TUẦN"
      let md = `### 📊 DỰ THẢO ${titleLabel} — BAN KHẢO THÍ & ĐẢM BẢO CHẤT LƯỢNG\n`
      md += `*Thời điểm tổng hợp: ${vnDateStr} (Múi giờ Asia/Ho_Chi_Minh)*\n\n`
      md += `#### 1. Tóm tắt số liệu điều hành\n`
      md += `- **Tổng số nhiệm vụ trong phạm vi**: **${rawTasks.length}** việc\n`
      md += `- **Đã duyệt hoàn thành**: **${completed.length}** việc\n`
      md += `- **Đang chờ duyệt nghiệm thu**: **${pendingReview.length}** việc *(chưa tính là hoàn thành)*\n`
      md += `- **Đang thực hiện / Cần bổ sung**: **${inProgress.length}** việc\n`
      md += `- **Cảnh báo trễ hạn**: Chậm thực hiện **${overdueExec.length}** việc | Chậm duyệt **${overdueRev.length}** việc\n\n`

      md += `#### 2. Kết quả hoàn thành & Minh chứng tiêu biểu (${completed.length})\n`
      if (completed.length === 0) {
        md += `- Chưa có nhiệm vụ hoàn thành nghiệm thu trong kỳ.\n`
      } else {
        completed.slice(0, 10).forEach((t, idx) => {
          const evCount = (t.attachments?.length || 0) + (t.qaMeta?.evidenceLinks?.length || 0)
          md += `${idx + 1}. **[${t.taskGroup?.name || t.category}]** ${sanitizeUntrustedReferenceData(t.title, 140)} — *Phụ trách: ${t.assignedToUser?.fullName || t.assignedToRole}* • Minh chứng: **${evCount} tệp/liên kết** ➔ [Mở nhiệm vụ](/admin/tasks?taskId=${t.id})\n`
        })
      }

      md += `\n#### 3. Nhiệm vụ đang chờ duyệt nghiệm thu (${pendingReview.length})\n`
      if (pendingReview.length === 0) {
        md += `- Không có nhiệm vụ tồn đọng chờ duyệt.\n`
      } else {
        pendingReview.slice(0, 8).forEach((t, idx) => {
          md += `${idx + 1}. **${sanitizeUntrustedReferenceData(t.title, 140)}** (${t.assignedToUser?.fullName || t.assignedToRole}) — Trạng thái: *${WORKFLOW_STATUS_CONFIG[t.qaMeta.workflowStatus]?.label}* ➔ [Duyệt kết quả](/admin/tasks?taskId=${t.id})\n`
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

    return NextResponse.json({ success: false, error: "Hành động không hợp lệ" }, { status: 400 })
  } catch (err: any) {
    console.error("[QA Assistant API Error]:", err)
    return NextResponse.json(
      { success: false, error: err?.message || "Lỗi máy chủ khi xử lý QA Assistant" },
      { status: 500 }
    )
  }
}
