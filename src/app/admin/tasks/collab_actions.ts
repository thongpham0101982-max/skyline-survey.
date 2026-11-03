"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function getTaskDetails(taskId: string) {
  try {
    const [comments, attachments] = await Promise.all([
      prisma.taskComment.findMany({
        where: { taskId },
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, fullName: true, role: true } } }
      }),
      prisma.taskAttachment.findMany({
        where: { taskId },
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, fullName: true } } }
      })
    ])

    // Fetch action assignees info if any
    const assigneeIds = comments.map(c => c.actionAssigneeId).filter(Boolean) as string[]
    let assigneesMap: Record<string, string> = {}
    if (assigneeIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, fullName: true }
      })
      users.forEach(u => { assigneesMap[u.id] = u.fullName })
    }

    const resolvedComments = comments.map(c => ({
      ...c,
      actionAssigneeName: c.actionAssigneeId ? assigneesMap[c.actionAssigneeId] || "Chuyên viên" : null
    }))

    return { success: true, comments: JSON.parse(JSON.stringify(resolvedComments)), attachments: JSON.parse(JSON.stringify(attachments)) }
  } catch (e: any) {
    return { success: false, comments: [], attachments: [], error: e.message }
  }
}

export async function addTaskComment(
  taskId: string, 
  content: string,
  meta?: {
    commentType?: string;
    actionAssigneeId?: string | null;
    actionDueDate?: string | null;
    mentionedUserIds?: string[];
  }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    
    const commentType = meta?.commentType || "GENERAL"
    const hasAction = (commentType === "BLOCKER" || commentType === "COOPERATION")
    const actionStatus = hasAction ? "PENDING" : "NONE"

    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        userId: session.user.id,
        content,
        commentType,
        actionAssigneeId: meta?.actionAssigneeId || null,
        actionDueDate: meta?.actionDueDate ? new Date(meta.actionDueDate) : null,
        actionStatus,
        mentionedUserIds: meta?.mentionedUserIds && meta.mentionedUserIds.length > 0 ? JSON.stringify(meta.mentionedUserIds) : null
      },
      include: { user: { select: { id: true, fullName: true, role: true } } }
    })

    // Notify other participants & mentioned users
    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      select: { title: true, assignedToUserId: true, assignedById: true, assignedToRole: true, collaborators: true }
    })

    if (task) {
      const userName = (session.user as any).name || (session.user as any).fullName || "Nhân viên"
      const notifyIds = new Set<string>()

      if (task.assignedById && task.assignedById !== session.user.id) notifyIds.add(task.assignedById)
      if (task.assignedToUserId && task.assignedToUserId !== session.user.id) notifyIds.add(task.assignedToUserId)
      
      // Notify action assignee
      if (meta?.actionAssigneeId && meta.actionAssigneeId !== session.user.id) {
        notifyIds.add(meta.actionAssigneeId)
      }

      // Notify mentioned users
      if (meta?.mentionedUserIds && Array.isArray(meta.mentionedUserIds)) {
        meta.mentionedUserIds.forEach(uid => {
          if (uid !== session.user.id) notifyIds.add(uid)
        })
      }

      let typeLabel = "[Trao đổi]"
      if (commentType === "BLOCKER") typeLabel = "[⚠️ Vướng mắc/Cần tháo gỡ]"
      else if (commentType === "COOPERATION") typeLabel = "[🤝 Yêu cầu phối hợp]"
      else if (commentType === "PROGRESS") typeLabel = "[📈 Cập nhật tiến độ]"
      else if (commentType === "CONCLUSION") typeLabel = "[📌 Kết luận chỉ đạo]"

      for (const uid of notifyIds) {
        await prisma.notification.create({
          data: {
            userId: uid,
            title: `${typeLabel} ${task.title}`,
            message: `${userName}: ${content.substring(0, 120)}`,
            isRead: false
          }
        }).catch(() => {})
      }
    }

    revalidatePath("/admin/tasks")
    return { success: true, comment: JSON.parse(JSON.stringify(comment)) }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateCommentActionStatus(commentId: string, status: "PENDING" | "RESOLVED") {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    
    const comment = await prisma.taskComment.update({
      where: { id: commentId },
      data: { actionStatus: status }
    })

    revalidatePath("/admin/tasks")
    return { success: true, comment: JSON.parse(JSON.stringify(comment)) }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteTaskComment(commentId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    const comment = await prisma.taskComment.findUnique({ where: { id: commentId } })
    if (!comment) return { success: false, error: "Không tìm thấy" }
    const userRole = (session.user as any).role
    if (comment.userId !== session.user.id && userRole !== "ADMIN") return { success: false, error: "Không có quyền" }
    await prisma.taskComment.delete({ where: { id: commentId } })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function addTaskAttachment(taskId: string, fileName: string, fileData: string, fileSize: number, contentType: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        userId: session.user.id,
        fileName,
        fileData,
        fileSize,
        contentType
      },
      include: { user: { select: { id: true, fullName: true } } }
    })
    revalidatePath("/admin/tasks")
    return { success: true, attachment: JSON.parse(JSON.stringify(attachment)) }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteTaskAttachment(attachmentId: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    const att = await prisma.taskAttachment.findUnique({ where: { id: attachmentId } })
    if (!att) return { success: false, error: "Không tìm thấy" }
    const userRole = (session.user as any).role
    if (att.userId !== session.user.id && userRole !== "ADMIN") return { success: false, error: "Không có quyền" }
    await prisma.taskAttachment.delete({ where: { id: attachmentId } })
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
