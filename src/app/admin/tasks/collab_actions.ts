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
    return { success: true, comments: JSON.parse(JSON.stringify(comments)), attachments: JSON.parse(JSON.stringify(attachments)) }
  } catch (e: any) {
    return { success: false, comments: [], attachments: [], error: e.message }
  }
}

export async function addTaskComment(taskId: string, content: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    
    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        userId: session.user.id,
        content
      },
      include: { user: { select: { id: true, fullName: true, role: true } } }
    })

    // Notify other participants
    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      select: { title: true, assignedToUserId: true, assignedById: true, assignedToRole: true }
    })
    if (task) {
      const userName = (session.user as any).name || "Nhân viên"
      const notifyIds = new Set<string>()
      if (task.assignedById && task.assignedById !== session.user.id) notifyIds.add(task.assignedById)
      if (task.assignedToUserId && task.assignedToUserId !== session.user.id) notifyIds.add(task.assignedToUserId)
      for (const uid of notifyIds) {
        await prisma.notification.create({
          data: {
            userId: uid,
            title: "[Bình luận] " + task.title,
            message: userName + ": " + content.substring(0, 100),
            isRead: false
          }
        })
      }
    }

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
