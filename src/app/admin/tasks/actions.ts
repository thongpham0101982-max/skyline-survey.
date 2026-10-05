"use server"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import { sendEmail } from "@/lib/mail"
import { getOperationalScope } from "@/lib/session"

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
    const opScope = await getOperationalScope()

    let whereClause: any = {
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
    }

    if (opScope.scopedUserIds !== null) {
      whereClause.id = { in: opScope.scopedUserIds }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
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
              <!DOCTYPE html>
              <html lang="vi">
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${task.isImportant ? '[QUAN TRỌNG] ' : ''}Giao việc & Yêu cầu xác nhận</title>
              </head>
              <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
                  <tr>
                    <td align="center">
                      <table role="presentation" width="620" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                        <!-- Header -->
                        <tr>
                          <td bgcolor="${task.isImportant ? '#881337' : '#003B3A'}" style="background-color: ${task.isImportant ? '#881337' : '#003B3A'}; padding: 32px 28px; text-align: center;">
                            <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.15); border-radius: 20px; color: #FFFFFF; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                              ${task.isImportant ? '⚠️ QUAN TRỌNG / KHẨN CẤP' : '🏫 HỆ THỐNG GIÁO DỤC SKY-LINE'}
                            </div>
                            <h1 style="margin: 0; color: #FFFFFF; font-size: 20px; font-weight: 800; letter-spacing: 0.3px; line-height: 1.3;">
                              ${task.title}
                            </h1>
                            <p style="margin: 8px 0 0 0; color: ${task.isImportant ? '#FECDD3' : '#99F6E4'}; font-size: 13px; font-weight: 500;">
                              Hệ thống Điều hành & Quản lý Công việc Sky-Line
                            </p>
                          </td>
                        </tr>

                        <!-- Body Greeting -->
                        <tr>
                          <td style="padding: 26px 30px 14px 30px;">
                            <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Xin chào Thầy/Cô ${u.fullName},</p>
                            <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                              Thầy/Cô vừa nhận được một công việc mới được phân công từ <strong>${adminName}</strong>. Vui lòng xem thông tin bên dưới và bấm nút <strong>Xác nhận nhận việc</strong> để tiếp nhận nhiệm vụ:
                            </p>
                          </td>
                        </tr>

                        <!-- Task Info Card -->
                        <tr>
                          <td style="padding: 0 30px 20px 30px;">
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #99F6E4; padding: 16px 20px; border-collapse: separate;">
                              <tr>
                                <td style="padding-bottom: 8px; width: 34%; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Danh mục:</td>
                                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 800; color: #003B3A;">${task.category || "Công việc"}</td>
                              </tr>
                              <tr>
                                <td style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Người giao việc:</td>
                                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 700; color: #1E293B;">${adminName}</td>
                              </tr>
                              <tr>
                                <td style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Thời gian thực hiện:</td>
                                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 600; color: #334155;">${startDateFormatted} đến <strong style="color: #DC2626;">${endDateFormatted}</strong></td>
                              </tr>
                              ${task.description ? `
                              <tr>
                                <td style="padding-top: 4px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase; vertical-align: top;">Chi tiết công việc:</td>
                                <td style="padding-top: 4px; font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;">${task.description}</td>
                              </tr>
                              ` : ""}
                            </table>
                          </td>
                        </tr>

                        <!-- Bulletproof Button -->
                        <tr>
                          <td align="center" style="padding: 0 30px 28px 30px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                              <tr>
                                <td align="center" bgcolor="${task.isImportant ? '#DC2626' : '#00A19A'}" style="background-color: ${task.isImportant ? '#DC2626' : '#00A19A'}; border-radius: 10px;">
                                  <a href="${appUrl}/admin/tasks?taskId=${task.id}&action=confirm" target="_blank" style="display: inline-block; padding: 14px 34px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                                    ✅ Xác Nhận Nhận Việc Ngay &rarr;
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                            <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                              HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                            </p>
                            <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                              BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                            </p>
                            <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                              Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">bankhaothi@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
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

    const userRole = (session.user as any).role
    const isAuthorized = !task.assignedToUserId || task.assignedToUserId === userId || task.assignedById === userId || userRole === "ADMIN" || userRole === "SUPERADMIN"
    if (!isAuthorized) {
      return { success: false, error: "Bạn không có quyền xác nhận công việc này" }
    }

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
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Xác nhận tiếp nhận công việc</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                      <!-- Header -->
                      <tr>
                        <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 30px 24px; text-align: center;">
                          <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.12); border-radius: 20px; color: #CCFBF1; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                            🏫 HỆ THỐNG GIÁO DỤC SKY-LINE
                          </div>
                          <h1 style="margin: 0; color: #FFFFFF; font-size: 19px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3;">
                            ✅ ĐÃ TIẾP NHẬN CÔNG VIỆC
                          </h1>
                          <p style="margin: 6px 0 0 0; color: #99F6E4; font-size: 13px; font-weight: 500;">
                            Hệ thống Điều hành & Quản lý Công việc Sky-Line
                          </p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding: 26px 28px 14px 28px;">
                          <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Xin chào Thầy/Cô ${task.assignedBy.fullName},</p>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                            Nhân viên <strong>${userName}</strong> đã xác nhận tiếp nhận công việc được giao theo thông tin sau:
                          </p>
                        </td>
                      </tr>

                      <!-- Card -->
                      <tr>
                        <td style="padding: 0 28px 20px 28px;">
                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #99F6E4; padding: 16px 20px; border-collapse: separate;">
                            <tr>
                              <td style="padding-bottom: 8px; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Tên công việc:</td>
                              <td style="padding-bottom: 8px; font-size: 14px; font-weight: 800; color: #003B3A;">${task.title}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Thời gian xác nhận:</td>
                              <td style="font-size: 13px; font-weight: 600; color: #334155;">${new Date().toLocaleString("vi-VN")}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Bulletproof Button -->
                      <tr>
                        <td align="center" style="padding: 0 28px 28px 28px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                            <tr>
                              <td align="center" bgcolor="#00A19A" style="background-color: #00A19A; border-radius: 10px;">
                                <a href="${appUrl}/admin/tasks?taskId=${task.id}" target="_blank" style="display: inline-block; padding: 13px 30px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                                  Xem Chi Tiết Công Việc &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                            HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                            BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                          </p>
                          <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                            Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">bankhaothi@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;
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

    const userRole = (session.user as any).role
    const isAuthorized = !task.assignedToUserId || task.assignedToUserId === userId || task.assignedById === userId || userRole === "ADMIN" || userRole === "SUPERADMIN"
    if (!isAuthorized) {
      return { success: false, error: "Bạn không có quyền phản hồi công việc này" }
    }

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
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Phản hồi về công việc được giao</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                      <!-- Header -->
                      <tr>
                        <td bgcolor="#881337" style="background-color: #881337; padding: 30px 24px; text-align: center;">
                          <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.15); border-radius: 20px; color: #FECDD3; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                            ⚠️ CẦN TRAO ĐỔI / PHẢN HỒI
                          </div>
                          <h1 style="margin: 0; color: #FFFFFF; font-size: 19px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3;">
                            PHẢN HỒI VỀ CÔNG VIỆC ĐƯỢC GIAO
                          </h1>
                          <p style="margin: 6px 0 0 0; color: #FECDD3; font-size: 13px; font-weight: 500;">
                            Hệ thống Điều hành & Quản lý Công việc Sky-Line
                          </p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding: 26px 28px 14px 28px;">
                          <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Xin chào Thầy/Cô ${task.assignedBy.fullName},</p>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                            Nhân viên <strong>${userName}</strong> đã gửi phản hồi / yêu cầu trao đổi lại về công việc được giao:
                          </p>
                        </td>
                      </tr>

                      <!-- Task Details & Reason Card -->
                      <tr>
                        <td style="padding: 0 28px 20px 28px;">
                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFF1F2; border-radius: 12px; border: 1px solid #FECDD3; padding: 16px 20px; border-collapse: separate;">
                            <tr>
                              <td style="padding-bottom: 8px; width: 32%; font-size: 12px; font-weight: 700; color: #9F1239; text-transform: uppercase;">Tên công việc:</td>
                              <td style="padding-bottom: 8px; font-size: 14px; font-weight: 800; color: #881337;">${task.title}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; font-weight: 700; color: #9F1239; text-transform: uppercase; vertical-align: top;">Ý kiến / Lý do:</td>
                              <td style="font-size: 13px; font-weight: 600; color: #9F1239; line-height: 1.5; white-space: pre-wrap;">${reason.trim()}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Bulletproof Button -->
                      <tr>
                        <td align="center" style="padding: 0 28px 28px 28px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                            <tr>
                              <td align="center" bgcolor="#BE123C" style="background-color: #BE123C; border-radius: 10px;">
                                <a href="${appUrl}/admin/tasks?taskId=${task.id}" target="_blank" style="display: inline-block; padding: 13px 30px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                                  Xem & Trao Đổi Lại &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                            HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                            BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                          </p>
                          <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                            Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">bankhaothi@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;
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
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }
    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    const VALID_PROGRESS = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "OVERDUE"]
    if (!VALID_PROGRESS.includes(progress)) {
      return { success: false, error: "Trạng thái tiến độ không hợp lệ" }
    }

    const task = await prisma.workTask.findUnique({ where: { id } })
    if (!task) return { success: false, error: "Không tìm thấy công việc" }

    const isAuthorized = !task.assignedToUserId || task.assignedToUserId === userId || task.assignedById === userId || userRole === "ADMIN" || userRole === "SUPERADMIN"
    if (!isAuthorized) {
      return { success: false, error: "Bạn không có quyền cập nhật tiến độ công việc này" }
    }

    await prisma.workTask.update({ 
      where: { id }, 
      data: { 
        progress,
        updatedAt: new Date()
      } 
    })
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
    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    const VALID_PROGRESS = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "OVERDUE"]
    if (data.progress && !VALID_PROGRESS.includes(data.progress)) {
      return { success: false, error: "Trạng thái tiến độ không hợp lệ" }
    }

    const task = await prisma.workTask.findUnique({ where: { id } })
    if (!task) return { success: false, error: "Không tìm thấy công việc" }

    const isAuthorized = !task.assignedToUserId || task.assignedToUserId === userId || task.assignedById === userId || userRole === "ADMIN" || userRole === "SUPERADMIN"
    if (!isAuthorized) {
      return { success: false, error: "Bạn không có quyền phản hồi công việc này" }
    }

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
            <!DOCTYPE html>
            <html lang="vi">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>${task.isImportant ? '[QUAN TRỌNG] ' : ''}Nhắc nhở công việc</title>
            </head>
            <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                      <!-- Header -->
                      <tr>
                        <td bgcolor="${task.isImportant ? '#881337' : '#003B3A'}" style="background-color: ${task.isImportant ? '#881337' : '#003B3A'}; padding: 30px 24px; text-align: center;">
                          <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.15); border-radius: 20px; color: #FFFFFF; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                            ${task.isImportant ? '⚠️ CÔNG VIỆC KHẨN' : '⏰ NHẮC NHỞ TIẾN ĐỘ'}
                          </div>
                          <h1 style="margin: 0; color: #FFFFFF; font-size: 19px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3;">
                            NHẮC NHỞ TIẾN ĐỘ CÔNG VIỆC
                          </h1>
                          <p style="margin: 6px 0 0 0; color: ${task.isImportant ? '#FECDD3' : '#99F6E4'}; font-size: 13px; font-weight: 500;">
                            Hệ thống Điều hành & Quản lý Công việc Sky-Line
                          </p>
                        </td>
                      </tr>

                      <!-- Body -->
                      <tr>
                        <td style="padding: 26px 28px 14px 28px;">
                          <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Xin chào Thầy/Cô ${u.fullName},</p>
                          <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                            Ban điều hành gửi thông báo nhắc nhở tiến độ thực hiện công việc được giao dưới đây:
                          </p>
                        </td>
                      </tr>

                      <!-- Card -->
                      <tr>
                        <td style="padding: 0 28px 20px 28px;">
                          <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #99F6E4; padding: 16px 20px; border-collapse: separate;">
                            <tr>
                              <td style="padding-bottom: 8px; width: 30%; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Tên công việc:</td>
                              <td style="padding-bottom: 8px; font-size: 14px; font-weight: 800; color: #003B3A;">${task.title}</td>
                            </tr>
                            <tr>
                              <td style="font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Hạn chót:</td>
                              <td style="font-size: 14px; font-weight: 700; color: #DC2626;">${formattedDate}</td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Bulletproof Button -->
                      <tr>
                        <td align="center" style="padding: 0 28px 28px 28px;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                            <tr>
                              <td align="center" bgcolor="${task.isImportant ? '#DC2626' : '#00A19A'}" style="background-color: ${task.isImportant ? '#DC2626' : '#00A19A'}; border-radius: 10px;">
                                <a href="${appUrl}/admin/tasks?taskId=${task.id}" target="_blank" style="display: inline-block; padding: 13px 30px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                                  Cập Nhật Tiến Độ Ngay &rarr;
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                          <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                            HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                          </p>
                          <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                            BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                          </p>
                          <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                            Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">bankhaothi@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
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
                  <!DOCTYPE html>
                  <html lang="vi">
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Thông báo hạn chót công việc</title>
                  </head>
                  <body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #334155;">
                    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 30px 10px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0, 59, 58, 0.08); border: 1px solid #E2E8F0; border-collapse: separate;">
                            <!-- Header -->
                            <tr>
                              <td bgcolor="${task.isImportant ? '#881337' : '#003B3A'}" style="background-color: ${task.isImportant ? '#881337' : '#003B3A'}; padding: 30px 24px; text-align: center;">
                                <div style="display: inline-block; padding: 4px 14px; background-color: rgba(255,255,255,0.15); border-radius: 20px; color: #FFFFFF; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                                  ⏰ NHẮC HẠN CHÓT
                                </div>
                                <h1 style="margin: 0; color: #FFFFFF; font-size: 19px; font-weight: 800; letter-spacing: 0.3px; text-transform: uppercase; line-height: 1.3;">
                                  THÔNG BÁO HẠN CHÓT ${reminderType.toUpperCase()}
                                </h1>
                                <p style="margin: 6px 0 0 0; color: ${task.isImportant ? '#FECDD3' : '#99F6E4'}; font-size: 13px; font-weight: 500;">
                                  Hệ thống Điều hành & Quản lý Công việc Sky-Line
                                </p>
                              </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                              <td style="padding: 26px 28px 14px 28px;">
                                <p style="margin: 0; font-size: 15px; font-weight: 700; color: #003B3A;">Xin chào Thầy/Cô ${u.fullName},</p>
                                <p style="margin: 8px 0 0 0; font-size: 14px; color: #475569; line-height: 1.6;">
                                  Công việc được giao cho Thầy/Cô sắp đến hạn chót vào ngày <strong>${formattedDate}</strong>:
                                </p>
                              </td>
                            </tr>

                            <!-- Card -->
                            <tr>
                              <td style="padding: 0 28px 20px 28px;">
                                <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F0FDFA; border-radius: 12px; border: 1px solid #99F6E4; padding: 16px 20px; border-collapse: separate;">
                                  <tr>
                                    <td style="padding-bottom: 8px; width: 30%; font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Tên công việc:</td>
                                    <td style="padding-bottom: 8px; font-size: 14px; font-weight: 800; color: #003B3A;">${task.title}</td>
                                  </tr>
                                  <tr>
                                    <td style="font-size: 12px; font-weight: 700; color: #00A19A; text-transform: uppercase;">Hạn chót:</td>
                                    <td style="font-size: 14px; font-weight: 700; color: #DC2626;">${formattedDate}</td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- Bulletproof Button -->
                            <tr>
                              <td align="center" style="padding: 0 28px 28px 28px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: 0 auto; border-collapse: separate;">
                                  <tr>
                                    <td align="center" bgcolor="#00A19A" style="background-color: #00A19A; border-radius: 10px;">
                                      <a href="${appUrl}/admin/tasks?taskId=${task.id}" target="_blank" style="display: inline-block; padding: 13px 30px; font-size: 14px; font-weight: 700; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                                        Xem Chi Tiết Công Việc &rarr;
                                      </a>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                              <td bgcolor="#003B3A" style="background-color: #003B3A; padding: 22px 28px; text-align: center; border-top: 3px solid #00A19A;">
                                <p style="margin: 0; font-size: 12px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; text-transform: uppercase;">
                                  HỆ THỐNG GIÁO DỤC SKY-LINE (SKY-LINE EDUCATION SYSTEM)
                                </p>
                                <p style="margin: 4px 0 0 0; font-size: 11px; font-weight: 600; color: #99F6E4;">
                                  BAN ĐÀO TẠO & KHẢO THÍ ĐẢM BẢO CHẤT LƯỢNG GIÁO DỤC
                                </p>
                                <p style="margin: 8px 0 0 0; font-size: 11px; color: #94A3B8;">
                                  Email hỗ trợ: <a href="mailto:bankhaothi@skylineschool.edu.vn" style="color: #99F6E4; text-decoration: underline;">bankhaothi@skylineschool.edu.vn</a> &bull; Website: <a href="https://skylineschool.edu.vn" target="_blank" style="color: #99F6E4; text-decoration: none;">skylineschool.edu.vn</a>
                                </p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                  </html>
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
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }
    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    const task = await prisma.workTask.findUnique({ where: { id } })
    if (!task) return { success: false, error: "Không tìm thấy công việc" }

    const isAuthorized = task.assignedById === userId || userRole === "ADMIN" || userRole === "SUPERADMIN"
    if (!isAuthorized) {
      return { success: false, error: "Chỉ người giao việc hoặc Quản trị viên mới có quyền xóa công việc này" }
    }

    await prisma.workTask.delete({ where: { id } })
    revalidatePath("/admin/tasks")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteTasks(ids: string[]) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }
    const userId = (session.user as any).id
    const userRole = (session.user as any).role

    if (userRole === "ADMIN" || userRole === "SUPERADMIN") {
      await prisma.workTask.deleteMany({
        where: { id: { in: ids } }
      })
    } else {
      // Non-admins can only delete tasks they personally assigned
      await prisma.workTask.deleteMany({
        where: { id: { in: ids }, assignedById: userId }
      })
    }
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

export async function createTaskCategory(data: { name: string; assignedToRole: string; groupName?: string; weight?: number }) {
  try {
    const session = await auth()
    const opScope = await getOperationalScope()
    if (!session?.user || (!opScope.isManager && (session.user as any).role !== "ADMIN")) {
      return { success: false, error: "Quyền truy cập bị từ chối" }
    }
    const weightVal = typeof data.weight === "number" && !isNaN(data.weight) ? data.weight : (parseFloat(String(data.weight)) || 1.0)
    await prisma.taskCategory.create({
      data: {
        name: data.name.trim(),
        assignedToRole: data.assignedToRole,
        groupName: data.groupName?.trim() || null,
        weight: weightVal > 0 ? weightVal : 1.0
      }
    })
    revalidatePath("/admin/tasks")
    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateTaskCategory(id: string, data: { name: string; assignedToRole: string; groupName?: string; weight?: number }) {
  try {
    const session = await auth()
    const opScope = await getOperationalScope()
    if (!session?.user || (!opScope.isManager && (session.user as any).role !== "ADMIN")) {
      return { success: false, error: "Quyền truy cập bị từ chối" }
    }
    const weightVal = typeof data.weight === "number" && !isNaN(data.weight) ? data.weight : (parseFloat(String(data.weight)) || 1.0)
    await prisma.taskCategory.update({
      where: { id },
      data: {
        name: data.name.trim(),
        assignedToRole: data.assignedToRole,
        groupName: data.groupName?.trim() || null,
        weight: weightVal > 0 ? weightVal : 1.0
      }
    })
    revalidatePath("/admin/tasks")
    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteTaskCategory(id: string) {
  try {
    const session = await auth()
    const opScope = await getOperationalScope()
    if (!session?.user || (!opScope.isManager && (session.user as any).role !== "ADMIN")) {
      return { success: false, error: "Quyền truy cập bị từ chối" }
    }
    await prisma.taskCategory.delete({
      where: { id }
    })
    revalidatePath("/admin/tasks")
    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getTaskGroups() {
  try {
    let groups = await prisma.taskGroup.findMany({
      orderBy: { name: "asc" }
    })

    // Seed default 5 groups if empty
    if (groups.length === 0) {
      const defaultNames = [
        "Khảo thí Phổ thông",
        "Khảo thí Tổng hợp",
        "Khảo thí TA&CTQT",
        "ĐBCL Học sinh",
        "ĐBCL"
      ]
      for (const name of defaultNames) {
        await prisma.taskGroup.create({
          data: { name, department: "KT&ĐBCL" }
        })
      }
      groups = await prisma.taskGroup.findMany({ orderBy: { name: "asc" } })
    }

    return { 
      success: true, 
      groups: groups.map(g => ({
        ...g,
        memberUserIdsList: g.memberUserIds ? JSON.parse(g.memberUserIds) : []
      }))
    }
  } catch (e: any) {
    return { success: false, groups: [], error: e.message }
  }
}

export async function createTaskGroup(data: { name: string; department?: string; memberUserIds?: string[] }) {
  try {
    const session = await auth()
    const opScope = await getOperationalScope()
    if (!session?.user || (!opScope.isManager && (session.user as any).role !== "ADMIN")) {
      return { success: false, error: "Quyền truy cập bị từ chối" }
    }
    const group = await prisma.taskGroup.create({
      data: {
        name: data.name.trim(),
        department: data.department || "KT&ĐBCL",
        memberUserIds: data.memberUserIds && data.memberUserIds.length > 0 ? JSON.stringify(data.memberUserIds) : null
      }
    })
    revalidatePath("/admin/tasks")
    revalidatePath("/admin/weekly-reports")
    return { success: true, group }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function updateTaskGroup(id: string, data: { name: string; department?: string; memberUserIds?: string[] }) {
  try {
    const session = await auth()
    const opScope = await getOperationalScope()
    if (!session?.user || (!opScope.isManager && (session.user as any).role !== "ADMIN")) {
      return { success: false, error: "Quyền truy cập bị từ chối" }
    }
    const group = await prisma.taskGroup.update({
      where: { id },
      data: {
        name: data.name.trim(),
        department: data.department || "KT&ĐBCL",
        memberUserIds: data.memberUserIds ? JSON.stringify(data.memberUserIds) : null
      }
    })
    revalidatePath("/admin/tasks")
    revalidatePath("/admin/weekly-reports")
    return { success: true, group }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteTaskGroup(id: string) {
  try {
    const session = await auth()
    const opScope = await getOperationalScope()
    if (!session?.user || (!opScope.isManager && (session.user as any).role !== "ADMIN")) {
      return { success: false, error: "Quyền truy cập bị từ chối" }
    }
    await prisma.taskGroup.delete({
      where: { id }
    })
    revalidatePath("/admin/tasks")
    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function assignStaffToTaskGroup(groupId: string, memberUserIds: string[]) {
  try {
    const session = await auth()
    const opScope = await getOperationalScope()
    if (!session?.user || (!opScope.isManager && (session.user as any).role !== "ADMIN")) {
      return { success: false, error: "Quyền truy cập bị từ chối" }
    }
    await prisma.taskGroup.update({
      where: { id: groupId },
      data: {
        memberUserIds: JSON.stringify(memberUserIds)
      }
    })
    revalidatePath("/admin/tasks")
    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
