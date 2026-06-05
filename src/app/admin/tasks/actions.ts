"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"

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
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }
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

    const adminName = (session.user as any).fullName || (session.user as any).name || (session.user as any).email || "Admin"
    const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app"
    const formattedDate = new Date(task.endDate).toLocaleDateString("vi-VN")

    // Fetch targets with names and emails
    let targets: { id: string; fullName: string; email: string | null }[] = []
    if (data.assignedToUserId) {
      const u = await prisma.user.findUnique({
        where: { id: data.assignedToUserId },
        select: { id: true, fullName: true, email: true }
      })
      if (u) targets = [u]
    } else {
      targets = await prisma.user.findMany({
        where: { role: data.assignedToRole || "KT_DBCL", status: "ACTIVE" },
        select: { id: true, fullName: true, email: true }
      })
    }

    // Send notifications and emails
    for (const u of targets) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: "[Giao việc] " + data.title,
          message: adminName + " đã giao công việc cho bạn. Hạn chót: " + formattedDate,
          isRead: false,
          link: "/admin/tasks?taskId=" + task.id
        }
      })

      if (u.email) {
        try {
          const emailHtml = `
            <div style="font-family: 'Open Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155; line-height: 1.6;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
                <div style="background-color: #00A19A; padding: 32px 24px; text-align: center;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">CÔNG VIỆC MỚI ĐƯỢC GIAO</h2>
                  <p style="color: #e2f5f4; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Hệ thống Điều hành Công việc Skyline</p>
                </div>
                
                <div style="padding: 32px 24px;">
                  <p style="margin-top: 0; font-size: 16px;">Xin chào <strong>${u.fullName}</strong>,</p>
                  <p style="font-size: 15px; color: #475569;">Bạn nhận được một công việc mới được phân công từ quản trị viên:</p>
                  
                  <div style="background-color: #f1f5f9; border-left: 4px solid #00A19A; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; width: 120px; text-transform: uppercase;">Danh mục:</td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #00A19A;">${task.category || "Công việc"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; vertical-align: top;">Nội dung:</td>
                        <td style="padding: 4px 0; font-size: 15px; font-weight: 700; color: #1e293b;">${task.title}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Người giao:</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #334155;">${adminName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Hạn chót:</td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 700; color: #ef4444;">${formattedDate}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="font-size: 15px; color: #475569; margin-bottom: 24px;">Vui lòng truy cập hệ thống để xem chi tiết và thực hiện công việc.</p>
                  
                  <div style="text-align: center; margin: 32px 0 16px 0;">
                    <a href="${appUrl}/admin/tasks?taskId=${task.id}" style="background-color: #00A19A; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 700; display: inline-block;">Xem công việc</a>
                  </div>
                </div>
                
                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                  <p style="margin: 0;">Email này được gửi tự động từ Hệ thống Khảo sát & Điều hành Skyline.</p>
                  <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} Hệ thống Giáo dục Skyline. All rights reserved.</p>
                </div>
              </div>
            </div>
          `;
          await sendEmail({
            to: u.email,
            subject: `[Giao việc] ${task.title}`,
            html: emailHtml
          });
        } catch (emailErr) {
          console.error(`Failed to send email to ${u.email}:`, emailErr);
        }
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
          message: userName + " da cap nhat trang thai: " + data.progress + ". Nội dung: " + (data.staffNote || "(khong co ghi chu)"),
          isRead: false,
          link: "/admin/tasks?taskId=" + task.id}
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
        assignedToUser: { select: { id: true, fullName: true, email: true } }
      }
    })
    if (!task) return { success: false, error: "Không tìm thấy công việc" }

    let targets: { id: string; fullName: string; email: string | null }[] = []
    if (task.assignedToUserId && task.assignedToUser) {
      targets = [{
        id: task.assignedToUserId,
        fullName: task.assignedToUser.fullName,
        email: task.assignedToUser.email
      }]
    } else {
      targets = await prisma.user.findMany({
        where: { role: task.assignedToRole, status: "ACTIVE" },
        select: { id: true, fullName: true, email: true }
      })
    }

    const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app"
    const formattedDate = new Date(task.endDate).toLocaleDateString("vi-VN")
    let sent = 0

    for (const u of targets) {
      // 1. Create in-app notification
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: "[Nhắc việc] " + task.title,
          message: "Công việc được giao bởi " + task.assignedBy.fullName + ". Hạn chót: " + formattedDate,
          isRead: false,
          link: "/admin/tasks?taskId=" + task.id
        }
      })

      // 2. Send email reminder
      if (u.email) {
        try {
          const emailHtml = `
            <div style="font-family: 'Open Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155; line-height: 1.6;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
                <div style="background-color: #00A19A; padding: 32px 24px; text-align: center;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">NHẮC NHỞ CÔNG VIỆC</h2>
                  <p style="color: #e2f5f4; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Hệ thống Điều hành Công việc Skyline</p>
                </div>
                
                <div style="padding: 32px 24px;">
                  <p style="margin-top: 0; font-size: 16px;">Xin chào <strong>${u.fullName}</strong>,</p>
                  <p style="font-size: 15px; color: #475569;">Bạn có thông báo nhắc nhở thực hiện công việc từ người điều hành:</p>
                  
                  <div style="background-color: #f1f5f9; border-left: 4px solid #00A19A; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; width: 120px; text-transform: uppercase;">Danh mục:</td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: #00A19A;">${task.category || "Công việc"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; vertical-align: top;">Nội dung:</td>
                        <td style="padding: 4px 0; font-size: 15px; font-weight: 700; color: #1e293b;">${task.title}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Người giao:</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #334155;">${task.assignedBy.fullName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;">Hạn chót:</td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 700; color: #ef4444;">${formattedDate}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="font-size: 15px; color: #475569; margin-bottom: 24px;">Vui lòng truy cập hệ thống để cập nhật tiến độ công việc trước hạn chót.</p>
                  
                  <div style="text-align: center; margin: 32px 0 16px 0;">
                    <a href="${appUrl}/admin/tasks?taskId=${task.id}" style="background-color: #00A19A; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 700; display: inline-block;">Cập nhật tiến độ</a>
                  </div>
                </div>
                
                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px; text-align: center; font-size: 12px; color: #94a3b8;">
                  <p style="margin: 0;">Email này được gửi tự động từ Hệ thống Khảo sát & Điều hành Skyline.</p>
                  <p style="margin: 4px 0 0 0;">&copy; ${new Date().getFullYear()} Hệ thống Giáo dục Skyline. All rights reserved.</p>
                </div>
              </div>
            </div>
          `;
          await sendEmail({
            to: u.email,
            subject: `[Nhắc việc] ${task.title}`,
            html: emailHtml
          });
        } catch (emailErr) {
          console.error(`Failed to send email to ${u.email}:`, emailErr);
        }
      }
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
              isRead: false,
          link: "/admin/tasks?taskId=" + task.id}
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
              isRead: false,
          link: "/admin/tasks?taskId=" + task.id}
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

export async function deleteTasks(ids: string[]) {
  try {
    await prisma.workTask.deleteMany({
      where: {
        id: { in: ids }
      }
    })
    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getTaskCategories() {
  try {
    const categories = await prisma.taskCategory.findMany({
      orderBy: { name: "asc" }
    })
    return { success: true, categories }
  } catch (e: any) {
    return { success: false, categories: [], error: e.message }
  }
}

export async function createTaskCategory(data: { name: string; assignedToRole: string }) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return { success: false, error: "Quyền truy cập bị từ chối" }
    }
    await prisma.taskCategory.create({
      data: {
        name: data.name.trim(),
        assignedToRole: data.assignedToRole
      }
    })
    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateTaskCategory(id: string, data: { name: string; assignedToRole: string }) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return { success: false, error: "Quyền truy cập bị từ chối" }
    }
    await prisma.taskCategory.update({
      where: { id },
      data: {
        name: data.name.trim(),
        assignedToRole: data.assignedToRole
      }
    })
    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteTaskCategory(id: string) {
  try {
    const session = await auth()
    if (!session?.user || (session.user as any).role !== "ADMIN") {
      return { success: false, error: "Quyền truy cập bị từ chối" }
    }
    await prisma.taskCategory.delete({
      where: { id }
    })
    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
