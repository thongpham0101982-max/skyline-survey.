"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"

function resolveUserEmail(u: any) {
  let email = u?.teacher?.email || u?.email;
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
    const adminId = (session.user as any).id
    const adminName = (session.user as any).fullName || (session.user as any).name || (session.user as any).email || "Ban Điều Hành"

    const collaboratorStr = data.collaborators ? (typeof data.collaborators === 'string' ? data.collaborators : JSON.stringify(data.collaborators)) : null

    // Determine assignee IDs (support single or multiple assigned individuals)
    let assignedUserIds: (string | null)[] = []
    if (Array.isArray(data.assignedToUserIds) && data.assignedToUserIds.length > 0) {
      assignedUserIds = data.assignedToUserIds
    } else if (data.assignedToUserId) {
      assignedUserIds = [data.assignedToUserId]
    } else {
      assignedUserIds = [null] // Assign to whole department
    }

    let primaryTask: any = null
    let createdTasksCount = 0

    for (const uid of assignedUserIds) {
      const task = await prisma.workTask.create({
        data: {
          category: data.category,
          title: data.title,
          description: data.description || "",
          assignedToRole: data.assignedToRole || "KT_DBCL",
          assignedToUserId: uid,
          assignedById: adminId,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          progress: "PENDING",
          acceptanceStatus: "WAITING_CONFIRMATION",
          month: data.month ? parseInt(data.month) : null,
          academicYearId: data.academicYearId || null,
          isImportant: data.isImportant || false,
          collaborators: collaboratorStr
        }
      })
      if (!primaryTask) primaryTask = task
      createdTasksCount++

      const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app"
      const startDateFormatted = new Date(task.startDate).toLocaleDateString("vi-VN")
      const endDateFormatted = new Date(task.endDate).toLocaleDateString("vi-VN")

      // Fetch target main assignees
      let targets: any[] = []
      if (uid) {
        const u = await prisma.user.findUnique({
          where: { id: uid },
          select: { id: true, fullName: true, email: true, teacher: { select: { email: true } } }
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
          select: { id: true, fullName: true, email: true, teacher: { select: { email: true } } }
        })
      }

      // Fetch collaborator users if provided
      let collaboratorUsers: any[] = []
      if (Array.isArray(data.collaboratorUserIds) && data.collaboratorUserIds.length > 0) {
        collaboratorUsers = await prisma.user.findMany({
          where: { id: { in: data.collaboratorUserIds } },
          select: { id: true, fullName: true, email: true, teacher: { select: { email: true } } }
        })
      }

      // Send to main assignees
      for (const u of targets) {
        await prisma.notification.create({
          data: {
            userId: u.id,
            title: (task.isImportant ? "[QUAN TRỌNG] " : "") + "[Yêu cầu xác nhận nhận việc] " + data.title,
            message: adminName + " đã giao công việc mới cho bạn. Vui lòng kiểm tra và xác nhận nhận việc trước ngày " + endDateFormatted,
            isRead: false,
            link: "/admin/tasks?taskId=" + task.id + "&action=confirm"
          }
        })

        const resolvedEmail = resolveUserEmail(u)
        if (resolvedEmail) {
          try {
            const emailHtml = `
              <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9; padding: 32px 16px; color: #1e293b;">
                <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
                  
                  <div style="background: linear-gradient(135deg, ${task.isImportant ? '#dc2626' : '#48BFE3'}, ${task.isImportant ? '#991b1b' : '#007A72'}); padding: 32px 28px; text-align: center; color: #ffffff;">
                    <span style="background: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 12px;">
                      ${task.isImportant ? '⚠️ QUAN TRỌNG / KHẨN CẤP' : 'CÔNG VIỆC MỚI ĐƯỢC GIAO'}
                    </span>
                    <h1 style="margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3; color: #ffffff;">${task.title}</h1>
                    <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">Hệ thống Điều hành Công việc Skyline</p>
                  </div>
                  
                  <div style="padding: 32px 28px;">
                    <p style="margin-top: 0; font-size: 15px; font-weight: 600; color: #334155;">Xin chào <strong>${u.fullName}</strong>,</p>
                    <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                      Bạn vừa nhận được một công việc mới được phân công từ <strong>${adminName}</strong>. 
                      Vui lòng xem thông tin bên dưới và bấm nút <strong>Xác nhận nhận việc</strong> để tiếp nhận công việc.
                    </p>
                    
                    <div style="background-color: #f8fafc; border-left: 4px solid ${task.isImportant ? '#dc2626' : '#48BFE3'}; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #e2e8f0; border-left-width: 4px;">
                      <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                          <td style="padding: 6px 0; font-size: 12px; font-weight: 700; color: #64748b; width: 130px; text-transform: uppercase;">Danh mục:</td>
                          <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: ${task.isImportant ? '#dc2626' : '#48BFE3'};">${task.category || "Công việc"}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Người giao:</td>
                          <td style="padding: 6px 0; font-size: 14px; color: #1e293b; font-weight: 600;">${adminName}</td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Thời gian:</td>
                          <td style="padding: 6px 0; font-size: 14px; color: #334155;">${startDateFormatted} đến <strong style="color: #dc2626;">${endDateFormatted}</strong></td>
                        </tr>
                        ${task.description ? `
                        <tr>
                          <td style="padding: 6px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; vertical-align: top;">Chi tiết công việc:</td>
                          <td style="padding: 6px 0; font-size: 14px; color: #334155; white-space: pre-wrap;">${task.description}</td>
                        </tr>
                        ` : ''}
                      </table>
                    </div>

                    <div style="text-align: center; margin: 28px 0 12px 0;">
                      <a href="${appUrl}/admin/tasks?taskId=${task.id}&action=confirm" 
                         style="background-color: ${task.isImportant ? '#dc2626' : '#48BFE3'}; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(0,169,157,0.3);">
                         ✅ Xác Nhận Nhận Việc Ngay
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            `;
            await sendEmail({
              to: resolvedEmail,
              subject: `${task.isImportant ? '[QUAN TRỌNG] ' : ''}[Giao việc & Yêu cầu xác nhận] ${task.title}`,
              html: emailHtml
            });
          } catch (emailErr) {
            console.error(`Failed to send email to ${resolvedEmail}:`, emailErr);
          }
        }
      }

      // Send notifications to collaborators
      for (const col of collaboratorUsers) {
        if (targets.some(t => t.id === col.id)) continue;
        await prisma.notification.create({
          data: {
            userId: col.id,
            title: "[PHỐI HỢP THỰC HIỆN] " + data.title,
            message: adminName + " đã thêm bạn là Người phối hợp công việc: '" + data.title + "'",
            isRead: false,
            link: "/admin/tasks?taskId=" + task.id
          }
        })
      }
    }

    revalidatePath("/admin/tasks")
    return { success: true, createdCount: createdTasksCount }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function confirmTaskAssignment(taskId: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }
    const userId = (session.user as any).id
    const userName = (session.user as any).fullName || (session.user as any).name || (session.user as any).email || "Nhân viên"

    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      include: {
        assignedBy: { select: { id: true, fullName: true, email: true, teacher: { select: { email: true } } } }
      }
    })
    if (!task) return { success: false, error: "Không tìm thấy công việc" }

    await prisma.workTask.update({
      where: { id: taskId },
      data: {
        acceptanceStatus: "ACCEPTED",
        acceptedAt: new Date(),
        progress: task.progress === "PENDING" ? "IN_PROGRESS" : task.progress
      }
    })

    // Send notification and email back to assigner
    if (task.assignedById && task.assignedById !== userId) {
      await prisma.notification.create({
        data: {
          userId: task.assignedById,
          title: "[ĐÃ XÁC NHẬN NHẬN VIỆC] " + task.title,
          message: userName + " đã xác nhận tiếp nhận công việc: '" + task.title + "'",
          isRead: false,
          link: "/admin/tasks?taskId=" + task.id
        }
      })

      const assignerEmail = resolveUserEmail(task.assignedBy)
      if (assignerEmail) {
        try {
          const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app"
          const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9; padding: 32px 16px; color: #1e293b;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                <div style="background-color: #10b981; padding: 24px; text-align: center; color: #ffffff;">
                  <h2 style="margin: 0; font-size: 20px; font-weight: 700;">✅ ĐÃ XÁC NHẬN TIẾP NHẬN CÔNG VIỆC</h2>
                  <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Hệ thống Điều hành Công việc Skyline</p>
                </div>
                <div style="padding: 24px;">
                  <p style="margin-top: 0;">Xin chào <strong>${task.assignedBy.fullName}</strong>,</p>
                  <p>Nhân viên <strong>${userName}</strong> đã bấm <strong>Xác nhận tiếp nhận công việc</strong> được giao:</p>
                  <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 0; font-weight: 700; color: #166534; font-size: 15px;">${task.title}</p>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #15803d;">Thời gian xác nhận: ${new Date().toLocaleString("vi-VN")}</p>
                  </div>
                  <div style="text-align: center; margin-top: 24px;">
                    <a href="${appUrl}/admin/tasks?taskId=${task.id}" style="background-color: #10b981; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Xem chi tiết công việc</a>
                  </div>
                </div>
              </div>
            </div>
          `
          await sendEmail({
            to: assignerEmail,
            subject: `[XÁC NHẬN NHẬN VIỆC] ${userName} đã nhận công việc: ${task.title}`,
            html: emailHtml
          })
        } catch (emailErr) {
          console.error("Failed to send acceptance notification email:", emailErr)
        }
      }
    }

    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function rejectTaskAssignment(taskId: string, reason: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }
    const userId = (session.user as any).id
    const userName = (session.user as any).fullName || (session.user as any).name || (session.user as any).email || "Nhân viên"

    if (!reason || !reason.trim()) return { success: false, error: "Vui lòng nhập lý do hoặc phản hồi" }

    const task = await prisma.workTask.findUnique({
      where: { id: taskId },
      include: {
        assignedBy: { select: { id: true, fullName: true, email: true, teacher: { select: { email: true } } } }
      }
    })
    if (!task) return { success: false, error: "Không tìm thấy công việc" }

    await prisma.workTask.update({
      where: { id: taskId },
      data: {
        acceptanceStatus: "REJECTED",
        rejectionReason: reason.trim(),
        staffNote: "Phản hồi/Từ chối: " + reason.trim(),
        staffUpdatedAt: new Date()
      }
    })

    // Notify assigner
    if (task.assignedById && task.assignedById !== userId) {
      await prisma.notification.create({
        data: {
          userId: task.assignedById,
          title: "[TỪ CHỐI / CẦN TRAO ĐỔI] " + task.title,
          message: userName + " đã gửi phản hồi về công việc: '" + task.title + "'. Lý do: " + reason.trim(),
          isRead: false,
          link: "/admin/tasks?taskId=" + task.id
        }
      })

      const assignerEmail = resolveUserEmail(task.assignedBy)
      if (assignerEmail) {
        try {
          const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app"
          const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9; padding: 32px 16px; color: #1e293b;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                <div style="background-color: #ef4444; padding: 24px; text-align: center; color: #ffffff;">
                  <h2 style="margin: 0; font-size: 20px; font-weight: 700;">⚠️ TỪ CHỐI / PHẢN HỒI CÔNG VIỆC</h2>
                  <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Hệ thống Điều hành Công việc Skyline</p>
                </div>
                <div style="padding: 24px;">
                  <p style="margin-top: 0;">Xin chào <strong>${task.assignedBy.fullName}</strong>,</p>
                  <p>Nhân viên <strong>${userName}</strong> đã gửi phản hồi / yêu cầu trao đổi lại về công việc được giao:</p>
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin: 16px 0;">
                    <p style="margin: 0; font-weight: 700; color: #991b1b; font-size: 15px;">${task.title}</p>
                    <p style="margin: 8px 0 0 0; font-size: 14px; color: #7f1d1d;"><strong>Ý kiến / Lý do:</strong> ${reason.trim()}</p>
                  </div>
                  <div style="text-align: center; margin-top: 24px;">
                    <a href="${appUrl}/admin/tasks?taskId=${task.id}" style="background-color: #ef4444; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Xem & Trao đổi lại</a>
                  </div>
                </div>
              </div>
            </div>
          `
          await sendEmail({
            to: assignerEmail,
            subject: `[PHẢN HỒI CÔNG VIỆC] ${userName} gửi ý kiến về công việc: ${task.title}`,
            html: emailHtml
          })
        } catch (emailErr) {
          console.error("Failed to send rejection notification email:", emailErr)
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
    const collaboratorStr = data.collaborators ? (typeof data.collaborators === 'string' ? data.collaborators : JSON.stringify(data.collaborators)) : null

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
        isImportant: data.isImportant || false,
        collaborators: collaboratorStr
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
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }

    const task = await prisma.workTask.findUnique({ where: { id } })
    if (!task) return { success: false, error: "Không tìm thấy công việc" }

    await prisma.workTask.update({
      where: { id },
      data: {
        progress: data.progress,
        staffNote: data.staffNote,
        staffUpdatedAt: new Date()
      }
    })

    // Notify assigner and admins
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })
    const userName = (session.user as any).fullName || (session.user as any).email || "Nhân viên"
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: "[Cập nhật CV] " + task.title,
          message: userName + " đã cập nhật tiến độ: " + data.progress + ". Nội dung: " + (data.staffNote || "(không có ghi chú)"),
          isRead: false,
          link: "/admin/tasks?taskId=" + task.id
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
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: (task.isImportant ? "[QUAN TRỌNG] " : "") + "[Nhắc việc] " + task.title,
          message: "Công việc được giao bởi " + task.assignedBy.fullName + ". Hạn chót: " + formattedDate,
          isRead: false,
          link: "/admin/tasks?taskId=" + task.id
        }
      })

      const resolvedEmail = resolveUserEmail(u);
      if (resolvedEmail) {
        try {
          const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; color: #334155; line-height: 1.6;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
                <div style="background-color: ${task.isImportant ? '#ef4444' : '#48BFE3'}; padding: 28px; text-align: center;">
                  <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">NHẮC NHỞ CÔNG VIỆC</h2>
                  <p style="color: #ffffff; margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Hệ thống Điều hành Công việc Skyline</p>
                </div>
                
                <div style="padding: 28px;">
                  <p style="margin-top: 0; font-size: 15px;">Xin chào <strong>${u.fullName}</strong>,</p>
                  <p style="font-size: 14px; color: #475569;">Bạn nhận được nhắc nhở thực hiện công việc từ ban điều hành:</p>
                  
                  <div style="background-color: #f1f5f9; border-left: 4px solid ${task.isImportant ? '#ef4444' : '#48BFE3'}; border-radius: 8px; padding: 18px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 15px; font-weight: 700; color: #1e293b;">${task.title}</p>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b;">Hạn chót: <strong style="color: #ef4444;">${formattedDate}</strong></p>
                  </div>
                  
                  <div style="text-align: center; margin: 28px 0 12px 0;">
                    <a href="${appUrl}/admin/tasks?taskId=${task.id}" style="background-color: ${task.isImportant ? '#ef4444' : '#48BFE3'}; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 10px; font-size: 14px; font-weight: 700; display: inline-block;">Cập nhật tiến độ ngay</a>
                  </div>
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
          console.error(`Failed to send reminder email to ${resolvedEmail}:`, emailErr);
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
      
      if (daysDiff >= 0 && daysDiff <= 1.5) {
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
            await prisma.notification.create({
              data: {
                userId: u.id,
                title: reminderKey,
                message: `Công việc sắp đến hạn chót vào ngày ${formattedDate}. Vui lòng cập nhật tiến độ!`,
                isRead: false,
                link: `/admin/tasks?taskId=${task.id}`
              }
            })
            
            const resolvedEmail = resolveUserEmail(u)
            if (resolvedEmail) {
              try {
                const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app"
                const emailHtml = `
                  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 32px 16px; color: #334155;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                      <div style="background-color: ${task.isImportant ? '#ef4444' : '#48BFE3'}; padding: 24px; text-align: center; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700;">THÔNG BÁO HẠN CHÓT ${reminderType}</h2>
                      </div>
                      <div style="padding: 24px;">
                        <p style="margin-top: 0;">Xin chào <strong>${u.fullName}</strong>,</p>
                        <p>Công việc được giao cho bạn sắp đến hạn chót vào ngày <strong>${formattedDate}</strong>:</p>
                        <div style="background-color: #f1f5f9; border-left: 4px solid #48BFE3; padding: 16px; border-radius: 8px; margin: 16px 0;">
                          <p style="margin: 0; font-weight: 700;">${task.title}</p>
                        </div>
                        <div style="text-align: center; margin-top: 24px;">
                          <a href="${appUrl}/admin/tasks?taskId=${task.id}" style="background-color: #48BFE3; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; display: inline-block;">Xem công việc</a>
                        </div>
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
                console.error(`Failed to send auto email to ${resolvedEmail}:`, emailErr);
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
          where: { userId: u.id, title: "[TRỄ HẠN] " + task.title }
        })
        if (!exists) {
          await prisma.notification.create({
            data: {
              userId: u.id,
              title: "[TRỄ HẠN] " + task.title,
              message: "Công việc đã quá hạn chót " + new Date(task.endDate).toLocaleDateString("vi-VN") + ". Vui lòng cập nhật tiến độ!",
              isRead: false,
              link: "/admin/tasks?taskId=" + task.id
            }
          })
        }
      }

      const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })
      for (const admin of admins) {
        const exists = await prisma.notification.findFirst({
          where: { userId: admin.id, title: "[TRỄ HẠN ADMIN] " + task.title }
        })
        if (!exists) {
          await prisma.notification.create({
            data: {
              userId: admin.id,
              title: "[TRỄ HẠN ADMIN] " + task.title,
              message: "Công việc giao cho " + task.assignedToRole + " đã quá hạn " + new Date(task.endDate).toLocaleDateString("vi-VN"),
              isRead: false,
              link: "/admin/tasks?taskId=" + task.id
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
