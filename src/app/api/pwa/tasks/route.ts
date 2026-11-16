import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { aggregateTeacherTasks, resolveTeacherAssignmentProfile } from "@/services/taskEngine"
import { SourceModule, TaskStatus } from "@/services/taskEngine/types"
import { prisma } from "@/lib/db"
import {
  appendQaTaskAuditLog,
  getQaMetadataMapForTasks,
  upsertQaTaskMetadata,
} from "@/lib/qa-workspace/schemaInit"
import {
  sendQaTaskConfirmationFeedbackEmail,
  sendQaWorkflowTransitionEmails,
} from "@/lib/qa-workspace/emailService"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const url = new URL(req.url)

    const filter = (url.searchParams.get("filter") || url.searchParams.get("status") || "ALL").toUpperCase()
    const moduleFilter = (url.searchParams.get("module") || "ALL") as SourceModule | "ALL"
    const campusId = url.searchParams.get("campusId") || "ALL"
    const classId = url.searchParams.get("classId") || "ALL"
    const subjectId = url.searchParams.get("subjectId") || "ALL"
    const timeRange = (url.searchParams.get("timeRange") || "ALL") as "TODAY" | "THIS_WEEK" | "THIS_MONTH" | "ALL"
    const search = (url.searchParams.get("search") || "").trim()

    const [profile, { tasks, counts }] = await Promise.all([
      resolveTeacherAssignmentProfile(userId),
      aggregateTeacherTasks(userId, {
        campusId,
        classId,
        subjectId,
        module: moduleFilter,
        status: filter as TaskStatus | "ALL" | "TODAY" | "OVERDUE" | "WAITING" | "COMPLETED",
        timeRange,
        search,
        includeCompleted: filter === "COMPLETED",
      }),
    ])

    return NextResponse.json(
      {
        success: true,
        updatedAt: new Date().toISOString(),
        tasks,
        counts,
        filterOptions: profile
          ? {
              campuses: profile.campuses,
              classes: [
                ...profile.homeroomClasses.map((c) => ({ id: c.id, name: `${c.className} (Chủ nhiệm)` })),
                ...profile.teachingAssignments.map((a) => ({ id: a.classId, name: `${a.className} (${a.subjectName})` })),
              ].filter((v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx),
              subjects: [
                ...profile.teachingAssignments.map((a) => ({ id: a.subjectId, name: a.subjectName })),
                ...profile.ctqtAssignments.map((c) => ({ id: c.subjectId, name: `${c.subjectName} (CTQT)` })),
                ...profile.specialAssignments.map((s) => ({ id: s.subjectCode, name: s.subjectName })),
              ].filter((v, idx, arr) => arr.findIndex((x) => x.id === v.id) === idx),
            }
          : { campuses: [], classes: [], subjects: [] },
      },
      {
        headers: {
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      }
    )
  } catch (error) {
    console.error("[API /api/pwa/tasks GET Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { taskId, action } = body

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId" }, { status: 400 })
    }

    if (taskId.startsWith("work-")) {
      const realId = taskId.replace(/^work-(task-)?/, "")
      const actorId = String(session.user.id)
      const actorName = String(
        (session.user as any).fullName ||
          (session.user as any).name ||
          session.user.email ||
          "Giáo viên"
      )

      const existing = await prisma.workTask.findUnique({
        where: { id: realId },
      })
      if (!existing) {
        return NextResponse.json({ error: "Không tìm thấy công việc" }, { status: 404 })
      }

      const metaMap = await getQaMetadataMapForTasks([existing])
      const currentMeta = metaMap.get(realId)!
      const isParticipant =
        existing.assignedToUserId === actorId ||
        (currentMeta.collaboratorUserIds || []).includes(actorId) ||
        (existing.collaborators || "").includes(actorId)

      if (!isParticipant && (session.user as any).role !== "ADMIN") {
        return NextResponse.json({ error: "Không có quyền cập nhật nhiệm vụ này" }, { status: 403 })
      }

      if (action === "CONFIRM_ACCEPTANCE") {
        await prisma.workTask.update({
          where: { id: realId },
          data: {
            acceptanceStatus: "ACCEPTED",
            acceptedAt: new Date(),
            progress: existing.progress === "PENDING" ? "IN_PROGRESS" : existing.progress,
          },
        })
        await upsertQaTaskMetadata({
          taskId: realId,
          workflowStatus:
            currentMeta.workflowStatus === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
          currentStepLabel: "Đã xác nhận nhận việc — Đang triển khai",
        })
        await appendQaTaskAuditLog({
          taskId: realId,
          actorUserId: actorId,
          actorName,
          action: "CONFIRM_ACCEPTANCE",
          fromStatus: currentMeta.workflowStatus,
          toStatus: "IN_PROGRESS",
          reason: "Xác nhận tiếp nhận nhiệm vụ từ Không gian Giáo viên",
        })
        await sendQaTaskConfirmationFeedbackEmail({
          taskId: realId,
          taskTitle: existing.title,
          category: existing.category,
          endDate: existing.endDate,
          actorUserId: actorId,
          actorName,
          accepted: true,
          assignerUserId: existing.assignedById,
          coordinatorUserId: currentMeta.coordinatorUserId,
          reviewerUserId: currentMeta.reviewerUserId,
        }).catch(() => {})

        return NextResponse.json({
          success: true,
          workflowStatus: "IN_PROGRESS",
          message: "Đã xác nhận tiếp nhận nhiệm vụ và thông báo đến người giao việc.",
        })
      }

      // Mặc định: Báo cáo hoàn thành tiến độ (nếu requiresApproval -> PENDING_REVIEW, ngược lại -> COMPLETED)
      const nextWf =
        action === "COMPLETE"
          ? currentMeta.requiresApproval
            ? "PENDING_REVIEW"
            : "COMPLETED"
          : "IN_PROGRESS"

      const nowIso = new Date().toISOString()
      await prisma.workTask.update({
        where: { id: realId },
        data: {
          acceptanceStatus: "ACCEPTED",
          acceptedAt: existing.acceptedAt || new Date(),
          progress: nextWf === "COMPLETED" ? "COMPLETED" : "IN_PROGRESS",
          completedAt: nextWf === "COMPLETED" ? new Date() : existing.completedAt,
          staffNote: body.resultSummary || existing.staffNote,
          staffUpdatedAt: new Date(),
        },
      })

      await upsertQaTaskMetadata({
        taskId: realId,
        workflowStatus: nextWf,
        submittedForReviewAt:
          nextWf === "PENDING_REVIEW" ? nowIso : currentMeta.submittedForReviewAt,
        reviewedAt: nextWf === "COMPLETED" ? nowIso : currentMeta.reviewedAt,
        resultSummary: body.resultSummary ?? currentMeta.resultSummary,
        currentStepLabel:
          nextWf === "PENDING_REVIEW"
            ? "Đang chờ người duyệt nghiệm thu"
            : nextWf === "COMPLETED"
            ? "Đã hoàn thành tiến độ"
            : "Đang thực hiện",
      })

      await appendQaTaskAuditLog({
        taskId: realId,
        actorUserId: actorId,
        actorName,
        action: nextWf === "PENDING_REVIEW" ? "SUBMIT_REVIEW" : "COMPLETE",
        fromStatus: currentMeta.workflowStatus,
        toStatus: nextWf,
        reason:
          body.resultSummary ||
          (nextWf === "PENDING_REVIEW"
            ? "Báo cáo hoàn thành tiến độ và gửi chờ nghiệm thu"
            : "Xác nhận hoàn thành tiến độ"),
      })

      const notifyTarget = currentMeta.reviewerUserId || existing.assignedById
      if (notifyTarget && notifyTarget !== actorId) {
        await prisma.notification
          .create({
            data: {
              userId: notifyTarget,
              title:
                nextWf === "PENDING_REVIEW"
                  ? `[Chờ duyệt hoàn thành] ${existing.title}`
                  : `[Đã hoàn thành công việc] ${existing.title}`,
              message: `${actorName} đã xác nhận hoàn thành tiến độ nhiệm vụ "${existing.title}".`,
              isRead: false,
              link: `/admin/tasks?taskId=${realId}&tab=review`,
            },
          })
          .catch(() => {})
      }

      await sendQaWorkflowTransitionEmails({
        taskId: realId,
        taskTitle: existing.title,
        category: existing.category,
        endDate: existing.endDate,
        reviewDueDate: currentMeta.reviewDueDate,
        fromStatus: currentMeta.workflowStatus,
        toStatus: nextWf,
        actorUserId: actorId,
        actorName,
        assignerUserId: existing.assignedById,
        primaryAssigneeId: existing.assignedToUserId,
        coordinatorUserId: currentMeta.coordinatorUserId,
        reviewerUserId: currentMeta.reviewerUserId,
        collaboratorUserIds: currentMeta.collaboratorUserIds || [],
        resultSummary: body.resultSummary ?? currentMeta.resultSummary,
      }).catch(() => {})

      return NextResponse.json({
        success: true,
        workflowStatus: nextWf,
        message:
          nextWf === "PENDING_REVIEW"
            ? "Đã gửi báo cáo hoàn thành tiến độ chờ nghiệm thu và báo email cho người duyệt."
            : "Đã xác nhận hoàn thành tiến độ công việc.",
      })
    }

    return NextResponse.json({ success: true, message: "Yêu cầu đã được ghi nhận" })
  } catch (error) {
    console.error("[API /api/pwa/tasks PATCH Error]:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
