"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"

function resolveUserEmail(u: any) {
  let email = u.teacher?.email || u.email;
  if (email) {
    email = email.trim();
    if (!email.includes("@")) {
      email = `${email}@skylineschool.edu.vn`;
    }
  }
  return email;
}


export async function getUsersByRole(roleCode: string) {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { role: roleCode },
          {
            teacher: {
              OR: [
                { departmentRel: { name: roleCode } },
                { departmentRel: { code: roleCode } },
                { mainSubjectRel: { subjectName: roleCode } },
                { mainSubjectRel: { subjectCode: roleCode } }
              ]
            }
          }
        ]
      },
      select: { 
        id: true, 
        fullName: true, 
        email: true,
        teacher: { select: { email: true } }
      },
      orderBy: { fullName: "asc" }
    })
    const resolvedUsers = users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      email: resolveUserEmail(u)
    }))
    return { success: true, users: resolvedUsers }
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
        academicYearId: data.academicYearId || null,
        isImportant: data.isImportant || false
      }
    })

    const adminName = (session.user as any).fullName || (session.user as any).name || (session.user as any).email || "Admin"
    const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app"
    const formattedDate = new Date(task.endDate).toLocaleDateString("vi-VN")

    // Fetch targets with names and emails (including teacher relation)
    let targets: any[] = []
    if (data.assignedToUserId) {
      const u = await prisma.user.findUnique({
        where: { id: data.assignedToUserId },
        select: { 
          id: true, 
          fullName: true, 
          email: true,
          teacher: { select: { email: true } }
        }
      })
      if (u) targets = [u]
    } else {
      const groupName = data.assignedToRole || "KT_DBCL"
      targets = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { role: groupName },
            {
              teacher: {
                OR: [
                  { departmentRel: { name: groupName } },
                  { departmentRel: { code: groupName } },
                  { mainSubjectRel: { subjectName: groupName } },
                  { mainSubjectRel: { subjectCode: groupName } }
                ]
              }
            }
          ]
        },
        select: { 
          id: true, 
          fullName: true, 
          email: true,
          teacher: { select: { email: true } }
        }
      })
    }

    // Send notifications and emails
    let sentCount = 0
    let emailSentCount = 0
    for (const u of targets) {
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: (task.isImportant ? "[QUAN TRỌNG] " : "") + "[Giao việc] " + data.title,
          message: adminName + " đã giao công việc" + (task.isImportant ? " quan trọng" : "") + " cho bạn. Hạn chót: " + formattedDate,
          isRead: false,
          link: "/admin/tasks?taskId=" + task.id
        }
      })

      const resolvedEmail = resolveUserEmail(u);
      if (resolvedEmail) {
        try {
          const emailHtml = `
            <div style="font-family: 'Open Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155; line-height: 1.6;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
                <div style="background-color: ${task.isImportant ? '#ef4444' : '#00A19A'}; padding: 32px 24px; text-align: center;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">${task.isImportant ? 'CÔNG VIỆC QUAN TRỌNG MỚI' : 'CÔNG VIỆC MỚI ĐƯỢC GIAO'}</h2>
                  <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Hệ thống Điều hành Công việc Skyline</p>
                </div>
                
                <div style="padding: 32px 24px;">
                  ${task.isImportant ? `
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
                    <span style="color: #b91c1c; font-weight: 700; font-size: 14px; display: block; margin-bottom: 4px;">⚠️ CÔNG VIỆC QUAN TRỌNG / KHẨN CẤP</span>
                    <span style="color: #7f1d1d; font-size: 13px;">Vui lòng lưu ý thực hiện đúng hạn. Đây là công việc được đánh dấu quan trọng từ Ban điều hành.</span>
                  </div>
                  ` : ''}

                  <p style="margin-top: 0; font-size: 16px;">Xin chào <strong>${u.fullName}</strong>,</p>
                  <p style="font-size: 15px; color: #475569;">Bạn nhận được một công việc mới được phân công từ quản trị viên:</p>
                  
                  <div style="background-color: #f1f5f9; border-left: 4px solid ${task.isImportant ? '#ef4444' : '#00A19A'}; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <table style="width: 100%; border-collapse: collapse;" className="border border-slate-200 border-collapse">
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; width: 120px; text-transform: uppercase;" className="p-2 border border-slate-200">Danh mục:</td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: ${task.isImportant ? '#ef4444' : '#00A19A'};" className="p-2 border border-slate-200">${task.category || "Công việc"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; vertical-align: top;" className="p-2 border border-slate-200">Nội dung:</td>
                        <td style="padding: 4px 0; font-size: 15px; font-weight: 700; color: #1e293b;" className="p-2 border border-slate-200">${task.title}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;" className="p-2 border border-slate-200">Người giao:</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #334155;" className="p-2 border border-slate-200">${adminName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;" className="p-2 border border-slate-200">Hạn chót:</td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 700; color: #ef4444;" className="p-2 border border-slate-200">${formattedDate}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="font-size: 15px; color: #475569; margin-bottom: 24px;">Vui lòng truy cập hệ thống để xem chi tiết và thực hiện công việc.</p>
                  
                  <div style="text-align: center; margin: 32px 0 16px 0;">
                    <a href="${appUrl}/admin/tasks?taskId=${task.id}" style="background-color: ${task.isImportant ? '#ef4444' : '#00A19A'}; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 700; display: inline-block;">Xem công việc</a>
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
            to: resolvedEmail,
            subject: `${task.isImportant ? '[QUAN TRỌNG] ' : ''}[Giao việc] ${task.title}`,
            html: emailHtml
          });
        } catch (emailErr) {
          console.error(`Failed to send email to ${u.email}:`, emailErr);
        }
      }
    }

    revalidatePath("/admin/tasks")
    return { success: true, sent: sentCount, emailSent: emailSentCount }
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
        academicYearId: data.academicYearId || null,
        isImportant: data.isImportant || false
      }
    })
    revalidatePath("/admin/tasks")
    return { success: true, sent: sentCount, emailSent: emailSentCount }
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
        assignedToUser: { 
          select: { 
            id: true, 
            fullName: true, 
            email: true,
            teacher: { select: { email: true } }
          } 
        }
      }
    })
    if (!task) return { success: false, error: "Không tìm thấy công việc" }

    let targets: any[] = []
    if (task.assignedToUserId && task.assignedToUser) {
      targets = [task.assignedToUser]
    } else {
      const groupName = task.assignedToRole
      targets = await prisma.user.findMany({
        where: {
          status: "ACTIVE",
          OR: [
            { role: groupName },
            {
              teacher: {
                OR: [
                  { departmentRel: { name: groupName } },
                  { departmentRel: { code: groupName } },
                  { mainSubjectRel: { subjectName: groupName } },
                  { mainSubjectRel: { subjectCode: groupName } }
                ]
              }
            }
          ]
        },
        select: { 
          id: true, 
          fullName: true, 
          email: true,
          teacher: { select: { email: true } }
        }
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
          title: (task.isImportant ? "[QUAN TRỌNG] " : "") + "[Nhắc việc] " + task.title,
          message: "Công việc" + (task.isImportant ? " quan trọng" : "") + " được giao bởi " + task.assignedBy.fullName + ". Hạn chót: " + formattedDate,
          isRead: false,
          link: "/admin/tasks?taskId=" + task.id
        }
      })

      // 2. Send email reminder
      const resolvedEmail = resolveUserEmail(u);
      if (resolvedEmail) {
        try {
          const emailHtml = `
            <div style="font-family: 'Open Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155; line-height: 1.6;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
                <div style="background-color: ${task.isImportant ? '#ef4444' : '#00A19A'}; padding: 32px 24px; text-align: center;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">${task.isImportant ? 'CÔNG VIỆC QUAN TRỌNG / NHẮC VIỆC' : 'NHẮC NHỞ CÔNG VIỆC'}</h2>
                  <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Hệ thống Điều hành Công việc Skyline</p>
                </div>
                
                <div style="padding: 32px 24px;">
                  ${task.isImportant ? `
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
                    <span style="color: #b91c1c; font-weight: 700; font-size: 14px; display: block; margin-bottom: 4px;">⚠️ CÔNG VIỆC QUAN TRỌNG / KHẨN CẤP</span>
                    <span style="color: #7f1d1d; font-size: 13px;">Yêu cầu ưu tiên thực hiện trước hạn chót. Đây là công việc quan trọng cần hoàn thành sớm.</span>
                  </div>
                  ` : ''}

                  <p style="margin-top: 0; font-size: 16px;">Xin chào <strong>${u.fullName}</strong>,</p>
                  <p style="font-size: 15px; color: #475569;">Bạn có thông báo nhắc nhở thực hiện công việc từ người điều hành:</p>
                  
                  <div style="background-color: #f1f5f9; border-left: 4px solid ${task.isImportant ? '#ef4444' : '#00A19A'}; border-radius: 8px; padding: 20px; margin: 24px 0;">
                    <table style="width: 100%; border-collapse: collapse;" className="border border-slate-200 border-collapse">
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; width: 120px; text-transform: uppercase;" className="p-2 border border-slate-200">Danh mục:</td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: ${task.isImportant ? '#ef4444' : '#00A19A'};" className="p-2 border border-slate-200">${task.category || "Công việc"}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; vertical-align: top;" className="p-2 border border-slate-200">Nội dung:</td>
                        <td style="padding: 4px 0; font-size: 15px; font-weight: 700; color: #1e293b;" className="p-2 border border-slate-200">${task.title}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;" className="p-2 border border-slate-200">Người giao:</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #334155;" className="p-2 border border-slate-200">${task.assignedBy.fullName}</td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;" className="p-2 border border-slate-200">Hạn chót:</td>
                        <td style="padding: 4px 0; font-size: 14px; font-weight: 700; color: #ef4444;" className="p-2 border border-slate-200">${formattedDate}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="font-size: 15px; color: #475569; margin-bottom: 24px;">Vui lòng truy cập hệ thống để cập nhật tiến độ công việc trước hạn chót.</p>
                  
                  <div style="text-align: center; margin: 32px 0 16px 0;">
                    <a href="${appUrl}/admin/tasks?taskId=${task.id}" style="background-color: ${task.isImportant ? '#ef4444' : '#00A19A'}; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 700; display: inline-block;">Cập nhật tiến độ</a>
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
            to: resolvedEmail,
            subject: `${task.isImportant ? '[QUAN TRỌNG] ' : ''}[Nhắc việc] ${task.title}`,
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

export async function checkAndNotifyUpcomingTasks() {
  try {
    const now = new Date()
    
    // Find all tasks that are active (progress not COMPLETED, not OVERDUE)
    // and have a deadline in the future or today.
    const activeTasks = await prisma.workTask.findMany({
      where: {
        progress: { notIn: ["COMPLETED", "OVERDUE"] },
        endDate: { gte: now }
      },
      include: {
        assignedBy: { select: { fullName: true } },
        assignedToUser: { 
          select: { 
            id: true, 
            fullName: true, 
            email: true,
            teacher: { select: { email: true } }
          } 
        }
      }
    })

    let sentCount = 0

    for (const task of activeTasks) {
      const msDiff = task.endDate.getTime() - now.getTime()
      const daysDiff = msDiff / (1000 * 60 * 60 * 24)
      
      // If the task is due in less than 24 hours (or on the same calendar day)
      if (daysDiff >= 0 && daysDiff <= 1.5) { // Task is due today or tomorrow
        const reminderType = daysDiff <= 0.5 ? "HÔM NAY" : "NGÀY MAI"
        const reminderKey = `[Tự động nhắc việc - ${reminderType}] ${task.title}`
        
        let targets: any[] = []
        if (task.assignedToUserId && task.assignedToUser) {
          targets = [task.assignedToUser]
        } else {
          const groupName = task.assignedToRole
          targets = await prisma.user.findMany({
            where: {
              status: "ACTIVE",
              OR: [
                { role: groupName },
                {
                  teacher: {
                    OR: [
                      { departmentRel: { name: groupName } },
                      { departmentRel: { code: groupName } },
                      { mainSubjectRel: { subjectName: groupName } },
                      { mainSubjectRel: { subjectCode: groupName } }
                    ]
                  }
                }
              ]
            },
            select: { 
              id: true, 
              fullName: true, 
              email: true,
              teacher: { select: { email: true } }
            }
          })
        }
        
        for (const u of targets) {
          const exists = await prisma.notification.findFirst({
            where: {
              userId: u.id,
              title: reminderKey
            }
          })
          
          if (!exists) {
            const formattedDate = new Date(task.endDate).toLocaleDateString("vi-VN")
            
            // 1. Create in-app notification
            await prisma.notification.create({
              data: {
                userId: u.id,
                title: reminderKey,
                message: `Công việc sắp đến hạn chót vào ngày ${formattedDate}. Vui lòng cập nhật tiến độ!`,
                isRead: false,
                link: `/admin/tasks?taskId=${task.id}`
              }
            })
            
            // 2. Send email reminder
            const resolvedEmail = resolveUserEmail(u)
            if (resolvedEmail) {
              try {
                const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app"
                const emailHtml = `
                  <div style="font-family: 'Open Sans', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155; line-height: 1.6;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
                      <div style="background-color: ${task.isImportant ? '#ef4444' : '#00A19A'}; padding: 32px 24px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.025em;">TỰ ĐỘNG NHẮC HẠN CHÓT</h2>
                        <p style="color: #ffffff; margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">Hệ thống Điều hành Công việc Skyline</p>
                      </div>
                      
                      <div style="padding: 32px 24px;">
                        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; margin-bottom: 24px; border-radius: 8px;">
                          <span style="color: #b91c1c; font-weight: 700; font-size: 14px; display: block; margin-bottom: 4px;">⚠️ THÔNG BÁO HẠN CHÓT ${reminderType}</span>
                          <span style="color: #7f1d1d; font-size: 13px;">Công việc được giao cho bạn sắp đến hạn chót hoàn thành vào ngày ${formattedDate}.</span>
                        </div>
      
                        <p style="margin-top: 0; font-size: 16px;">Xin chào <strong>${u.fullName}</strong>,</p>
                        <p style="font-size: 15px; color: #475569;">Vui lòng hoàn thành công việc sau trước hạn chót:</p>
                        
                        <div style="background-color: #f1f5f9; border-left: 4px solid ${task.isImportant ? '#ef4444' : '#00A19A'}; border-radius: 8px; padding: 20px; margin: 24px 0;">
                          <table style="width: 100%; border-collapse: collapse;" className="border border-slate-200 border-collapse">
                            <tr>
                              <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; width: 120px; text-transform: uppercase;" className="p-2 border border-slate-200">Danh mục:</td>
                              <td style="padding: 4px 0; font-size: 14px; font-weight: 600; color: ${task.isImportant ? '#ef4444' : '#00A19A'};" className="p-2 border border-slate-200">${task.category || "Công việc"}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; vertical-align: top;" className="p-2 border border-slate-200">Nội dung:</td>
                              <td style="padding: 4px 0; font-size: 15px; font-weight: 700; color: #1e293b;" className="p-2 border border-slate-200">${task.title}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;" className="p-2 border border-slate-200">Người giao:</td>
                              <td style="padding: 4px 0; font-size: 14px; color: #334155;" className="p-2 border border-slate-200">${task.assignedBy.fullName}</td>
                            </tr>
                            <tr>
                              <td style="padding: 4px 0; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase;" className="p-2 border border-slate-200">Hạn chót:</td>
                              <td style="padding: 4px 0; font-size: 14px; font-weight: 700; color: #ef4444;" className="p-2 border border-slate-200">${formattedDate}</td>
                            </tr>
                          </table>
                        </div>
                        
                        <p style="font-size: 15px; color: #475569; margin-bottom: 24px;">Vui lòng truy cập hệ thống để xem chi tiết và báo cáo kết quả thực hiện.</p>
                        
                        <div style="text-align: center; margin: 32px 0 16px 0;">
                          <a href="${appUrl}/admin/tasks?taskId=${task.id}" style="background-color: ${task.isImportant ? '#ef4444' : '#00A19A'}; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-size: 15px; font-weight: 700; display: inline-block;">Xem công việc</a>
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
                  to: resolvedEmail,
                  subject: `[NHẮC HẠN CHÓT] ${task.title}`,
                  html: emailHtml
                });
                sentCount++;
              } catch (emailErr) {
                console.error(`Failed to send auto email to ${u.email}:`, emailErr);
              }
            }
          }
        }
      }
    }
    return { success: true, sent: sentCount }
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
        const groupName = task.assignedToRole
        targets = await prisma.user.findMany({
          where: {
            status: "ACTIVE",
            OR: [
              { role: groupName },
              {
                teacher: {
                  OR: [
                    { departmentRel: { name: groupName } },
                    { departmentRel: { code: groupName } },
                    { mainSubjectRel: { subjectName: groupName } },
                    { mainSubjectRel: { subjectCode: groupName } }
                  ]
                }
              }
            ]
          },
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
    return { success: true, sent: sentCount, emailSent: emailSentCount }
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
