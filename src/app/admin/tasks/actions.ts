"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"

export async function getUsersByRole(roleCode: string) {
  try {
    const users = await prisma.user.findMany({
      where: { role: roleCode, status: "ACTIVE" },
      select: { id: true, fullName: true, email: true },
      orderBy: { fullName: "asc" }
    })
    return { success: true, users }
  } catch (e: any) {
    return { success: false, users: [], error: e.message }
  }
}

export async function createTask(data: any) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chua dang nhap" }
    const task = await prisma.workTask.create({
      data: {
        category: data.category,
        title: data.title,
        description: data.description || "",
        assignedToRole: data.assignedToRole || "KT_DBCL",
        assignedToUserId: data.assignedToUserId || null,
        assignedById: (session.user as any).id,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        progress: "PENDING",
        month: data.month ? parseInt(data.month) : null,
        academicYearId: data.academicYearId || null
      }
    })
    // Send notification to the assigned user(s)
    const adminName = (session.user as any).name || (session.user as any).email || "Admin"
    if (data.assignedToUserId) {
      // Notify specific user
      await prisma.notification.create({
        data: {
          userId: data.assignedToUserId,
          title: "[Giao viec] " + data.title,
          message: adminName + " da giao cong viec cho ban. Han chot: " + new Date(data.endDate).toLocaleDateString("vi-VN"),
          isRead: false
        }
      })
    } else {
      // Notify all users in the role group
      const roleUsers = await prisma.user.findMany({
        where: { role: data.assignedToRole || "KT_DBCL", status: "ACTIVE" },
        select: { id: true }
      })
      for (const u of roleUsers) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            title: "[Giao viec] " + data.title,
            message: adminName + " da giao cong viec cho nhom ban. Han chot: " + new Date(data.endDate).toLocaleDateString("vi-VN"),
            isRead: false
          }
        })
      }
    }
    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateTask(id: string, data: any) {
  try {
    await prisma.workTask.update({
      where: { id },
      data: {
        category: data.category,
        title: data.title,
        description: data.description || "",
        assignedToRole: data.assignedToRole,
        assignedToUserId: data.assignedToUserId || null,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        month: data.month ? parseInt(data.month) : null,
        academicYearId: data.academicYearId || null
      }
    })
    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateTaskProgress(id: string, progress: string) {
  try {
    await prisma.workTask.update({ where: { id }, data: { progress } })
    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function respondToTask(id: string, data: { progress: string; staffNote: string }) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chua dang nhap" }

    const task = await prisma.workTask.findUnique({ where: { id } })
    if (!task) return { success: false, error: "Khong tim thay cong viec" }

    await prisma.workTask.update({
      where: { id },
      data: {
        progress: data.progress,
        staffNote: data.staffNote,
        staffUpdatedAt: new Date()
      }
    })

    // Notify admin about the update
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })
    const userName = (session.user as any).fullName || (session.user as any).email || "Nhan vien"
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "[Cap nhat CV] " + task.title,
          message: userName + " da cap nhat trang thai: " + data.progress + ". Noi dung: " + (data.staffNote || "(khong co ghi chu)"),
          isRead: false
        }
      })
    }

    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function remindTask(id: string) {
  try {
    const task = await prisma.workTask.findUnique({
      where: { id },
      include: {
        assignedBy: { select: { fullName: true } },
        assignedToUser: { select: { id: true, fullName: true } }
      }
    })
    if (!task) return { success: false, error: "Khong tim thay task" }

    let targets: { id: string }[] = []
    if (task.assignedToUserId && task.assignedToUser) {
      targets = [{ id: task.assignedToUserId }]
    } else {
      targets = await prisma.user.findMany({
        where: { role: task.assignedToRole },
        select: { id: true }
      })
    }

    let sent = 0
    for (const u of targets) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: "[Nhac viec] " + task.title,
          message: "Cong viec duoc giao boi " + task.assignedBy.fullName + ". Han chot: " + new Date(task.endDate).toLocaleDateString("vi-VN"),
          isRead: false
        }
      })
      sent++
    }
    return { success: true, sent }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function checkAndNotifyOverdueTasks() {
  try {
    const now = new Date()
    const overdueTasks = await prisma.workTask.findMany({
      where: {
        endDate: { lt: now },
        progress: { notIn: ["COMPLETED", "OVERDUE"] }
      }
    })

    for (const task of overdueTasks) {
      await prisma.workTask.update({
        where: { id: task.id },
        data: { progress: "OVERDUE" }
      })

      let targets: { id: string }[] = []
      if (task.assignedToUserId) {
        targets = [{ id: task.assignedToUserId }]
      } else {
        targets = await prisma.user.findMany({
          where: { role: task.assignedToRole },
          select: { id: true }
        })
      }

      for (const u of targets) {
        const exists = await prisma.notification.findFirst({
          where: { userId: u.id, title: "[TRE HAN] " + task.title }
        })
        if (!exists) {
          await prisma.notification.create({
            data: {
              userId: u.id,
              title: "[TRE HAN] " + task.title,
              message: "Cong viec da qua han chot " + new Date(task.endDate).toLocaleDateString("vi-VN") + ". Vui long cap nhat tien do!",
              isRead: false
            }
          })
        }
      }

      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })
      for (const admin of admins) {
        const exists = await prisma.notification.findFirst({
          where: { userId: admin.id, title: "[TRE HAN ADMIN] " + task.title }
        })
        if (!exists) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: "[TRE HAN ADMIN] " + task.title,
              message: "Cong viec giao cho " + task.assignedToRole + " da qua han " + new Date(task.endDate).toLocaleDateString("vi-VN"),
              isRead: false
            }
          })
        }
      }
    }
    return { success: true, overdue: overdueTasks.length }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteTask(id: string) {
  try {
    await prisma.workTask.delete({ where: { id } })
    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
