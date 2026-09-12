"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
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

// Calculate weeks for a given month/year
export async function getWeeksOfMonth(month: number, year: number) {
  const weeks: { weekNum: number; start: string; end: string; label: string }[] = []
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  
  // Find first Monday
  const current = new Date(firstDay)
  while (current.getDay() !== 1 && current <= lastDay) {
    current.setDate(current.getDate() + 1)
  }
  
  let weekNum = 1
  while (current <= lastDay) {
    const start = new Date(current)
    const friday = new Date(current)
    friday.setDate(friday.getDate() + 4) // Monday + 4 = Friday
    
    const end = friday > lastDay ? new Date(lastDay) : friday
    
    weeks.push({
      weekNum,
      start: start.toLocaleDateString("vi-VN"),
      end: end.toLocaleDateString("vi-VN"),
      label: "Tuần " + weekNum + " (" + start.getDate() + "/" + (start.getMonth()+1) + " - " + end.getDate() + "/" + (end.getMonth()+1) + ")"
    })
    
    weekNum++
    current.setDate(current.getDate() + 7)
  }
  
  return weeks
}

export async function getWeeklyReport(userId: string, weekNumber: number, month: number, year: number) {
  try {
    const report = await prisma.weeklyReport.findFirst({
      where: { userId, weekNumber, month, year },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        user: { select: { fullName: true, role: true, email: true } }
      }
    })
    return { success: true, report: report ? JSON.parse(JSON.stringify(report)) : null }
  } catch (e: any) {
    return { success: false, report: null, error: e.message }
  }
}

export async function getAllWeeklyReports(weekNumber: number, month: number, year: number) {
  try {
    const opScope = await getOperationalScope()
    const whereClause: any = { weekNumber, month, year }
    if (opScope.scopedUserIds !== null) {
      whereClause.userId = { in: opScope.scopedUserIds }
    }

    const reports = await prisma.weeklyReport.findMany({
      where: whereClause,
      include: {
        items: { orderBy: { createdAt: "asc" } },
        user: { select: { id: true, fullName: true, role: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    })
    return { success: true, reports: JSON.parse(JSON.stringify(reports)) }
  } catch (e: any) {
    return { success: false, reports: [], error: e.message }
  }
}

export async function saveWeeklyReport(data: {
  weekNumber: number; month: number; year: number; academicYearId?: string; targetUserId?: string;
  items: { id?: string; mainTask: string; workContent: string; progress: string; proposedSolution?: string }[]
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    const currentUserId = session.user.id

    const opScope = await getOperationalScope()

    // Allow Admin, Head, TBP, or TTCM to edit report on behalf of targetUserId within their scope
    let userId = currentUserId
    if (data.targetUserId) {
      if (opScope.isSuperAdmin || opScope.isHeadOfAcademic) {
        userId = data.targetUserId
      } else if (opScope.scopedUserIds && opScope.scopedUserIds.includes(data.targetUserId)) {
        userId = data.targetUserId
      } else if (data.targetUserId !== currentUserId) {
        return { success: false, error: "Không có quyền lưu báo cáo cho nhân sự ngoài phạm vi quản lý" }
      }
    }

    let report = await prisma.weeklyReport.findFirst({
      where: { userId, weekNumber: data.weekNumber, month: data.month, year: data.year }
    })

    if (report) {
      const reportId = report.id
      report = await prisma.$transaction(async (tx) => {
        await tx.weeklyReportItem.deleteMany({ where: { reportId } })
        return tx.weeklyReport.update({
          where: { id: reportId },
          data: {
            status: "SUBMITTED",
            academicYearId: data.academicYearId || null,
            items: {
              create: data.items.map(item => ({
                mainTask: item.mainTask,
                workContent: item.workContent,
                progress: item.progress,
                proposedSolution: item.proposedSolution || ""
              }))
            }
          },
          include: { items: true }
        })
      })
    } else {
      report = await prisma.weeklyReport.create({
        data: {
          userId,
          weekNumber: data.weekNumber,
          month: data.month,
          year: data.year,
          status: "SUBMITTED",
          academicYearId: data.academicYearId || null,
          items: {
            create: data.items.map(item => ({
              mainTask: item.mainTask,
              workContent: item.workContent,
              progress: item.progress,
              proposedSolution: item.proposedSolution || ""
            }))
          }
        },
        include: { items: true }
      })
    }

    revalidatePath("/admin/weekly-reports")
    return { success: true, report: JSON.parse(JSON.stringify(report)) }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function addManagerComment(reportId: string, managerComment: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }
    
    const opScope = await getOperationalScope()
    if (!opScope.isManager) {
      return { success: false, error: "Chỉ quản lý (Trưởng ban, TBP, TTCM) mới có quyền nhận xét" }
    }

    const report = await prisma.weeklyReport.findUnique({ 
      where: { id: reportId }, 
      select: { userId: true, weekNumber: true, month: true } 
    })
    if (!report) return { success: false, error: "Không tìm thấy báo cáo" }

    // Check scope if not Head or SuperAdmin
    if (opScope.scopedUserIds !== null && !opScope.scopedUserIds.includes(report.userId)) {
      return { success: false, error: "Bạn không có quyền nhận xét báo cáo ngoài bộ phận/tổ phụ trách" }
    }

    await prisma.weeklyReport.update({
      where: { id: reportId },
      data: { managerComment, status: "REVIEWED" }
    })

    await prisma.notification.create({
      data: {
        userId: report.userId,
        title: `[Nhận xét Báo cáo Tuần] Tuần ${report.weekNumber} Tháng ${report.month}`,
        message: `Ban quản lý đã nhận xét báo cáo của bạn: ${managerComment.substring(0, 100)}`,
        isRead: false,
        link: "/admin/weekly-reports"
      }
    })

    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function addManagerItemNote(itemId: string, managerNote: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }
    
    const opScope = await getOperationalScope()
    if (!opScope.isManager) {
      return { success: false, error: "Chỉ quản lý mới có quyền ghi chú" }
    }

    const item = await prisma.weeklyReportItem.findUnique({
      where: { id: itemId },
      include: { report: { select: { userId: true } } }
    })
    if (!item) return { success: false, error: "Không tìm thấy mục báo cáo" }

    if (opScope.scopedUserIds !== null && !opScope.scopedUserIds.includes(item.report.userId)) {
      return { success: false, error: "Không có quyền ghi chú trên báo cáo ngoài bộ phận/tổ" }
    }

    await prisma.weeklyReportItem.update({
      where: { id: itemId },
      data: { managerNote }
    })
    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getConsolidatedReports(roleCode: string, weekNumber: number, month: number, year: number, divisionCode?: string) {
  try {
    const opScope = await getOperationalScope()

    let allowedUserIds = opScope.scopedUserIds

    // If divisionCode filter is passed (by Admin/Head)
    if (divisionCode && divisionCode !== "ALL") {
      const deptsInDiv = await prisma.department.findMany({
        where: { divisionCode, status: "ACTIVE" },
        select: { id: true, code: true, name: true }
      })
      const deptIds = deptsInDiv.map(d => d.id)
      const deptCodes = deptsInDiv.map(d => d.code)
      const deptNames = deptsInDiv.map(d => d.name)

      const teachers = await prisma.teacher.findMany({
        where: {
          OR: [
            { departmentId: { in: deptIds } },
            { departmentAssignments: { some: { departmentId: { in: deptIds } } } }
          ]
        },
        select: { userId: true }
      })
      const uIds = new Set(teachers.map(t => t.userId))
      const extraUsers = await prisma.user.findMany({
        where: { role: { in: [...deptCodes, ...deptNames] }, status: "ACTIVE" },
        select: { id: true }
      })
      extraUsers.forEach(u => uIds.add(u.id))

      if (allowedUserIds !== null) {
        allowedUserIds = allowedUserIds.filter(id => uIds.has(id))
      } else {
        allowedUserIds = Array.from(uIds)
      }
    }

    const whereClause: any = { weekNumber, month, year }
    if (allowedUserIds !== null) {
      whereClause.userId = { in: allowedUserIds }
    }

    if (roleCode && roleCode !== "ALL") {
      whereClause.user = {
        OR: [
          { role: roleCode },
          { teacher: { departmentRel: { OR: [{ code: roleCode }, { name: roleCode }] } } }
        ]
      }
    }

    const reports = await prisma.weeklyReport.findMany({
      where: whereClause,
      include: {
        items: { orderBy: { createdAt: "asc" } },
        user: { 
          select: { 
            id: true, 
            fullName: true, 
            role: true, 
            email: true,
            teacher: {
              select: {
                position: true,
                departmentRel: { select: { name: true, code: true, divisionCode: true } },
                campus: { select: { campusName: true } }
              }
            }
          } 
        }
      },
      orderBy: [{ user: { fullName: "asc" } }, { createdAt: "asc" }]
    })
    return { success: true, reports: JSON.parse(JSON.stringify(reports)) }
  } catch (e: any) {
    return { success: false, reports: [], error: e.message }
  }
}

export async function sendWeeklyReportEmailReminders(targetWeek?: number, targetMonth?: number, targetYear?: number, targetUserId?: string) {
  try {
    const now = new Date()
    const year = targetYear || now.getFullYear()
    const month = targetMonth || (now.getMonth() + 1)
    
    let weekNumber = targetWeek || 1
    if (!targetWeek) {
      const weeks = await getWeeksOfMonth(month, year)
      const currentDay = now.getDate()
      const foundWeek = weeks.find(w => {
        const parts = w.label.match(/\((\d+)\//)
        return parts && parseInt(parts[1]) <= currentDay
      })
      if (foundWeek) weekNumber = foundWeek.weekNum
    }

    const opScope = await getOperationalScope()

    let staffWhere: any = {
      status: "ACTIVE",
      role: { not: "PARENT" }
    }

    // Specific user 1-click remind from Personal Card
    if (targetUserId) {
      staffWhere.id = targetUserId
    } else if (opScope.scopedUserIds !== null) {
      // Scoped only to this manager's staff!
      staffWhere.id = { in: opScope.scopedUserIds }
    }

    const activeStaff = await prisma.user.findMany({
      where: staffWhere,
      select: {
        id: true,
        fullName: true,
        email: true,
        teacher: { select: { email: true } }
      }
    })

    // Fetch submitted reports for this week
    const submittedReports = await prisma.weeklyReport.findMany({
      where: {
        weekNumber,
        month,
        year,
        status: { in: ["SUBMITTED", "REVIEWED"] },
        userId: { in: activeStaff.map(s => s.id) }
      },
      select: { userId: true }
    })
    const submittedUserIds = new Set(submittedReports.map(r => r.userId))

    const pendingStaff = activeStaff.filter(u => !submittedUserIds.has(u.id))
    const appUrl = process.env.NEXTAUTH_URL || "https://skyline-survey.vercel.app"

    let sentCount = 0
    let emailSentCount = 0

    for (const u of pendingStaff) {
      // Create in-app notification
      await prisma.notification.create({
        data: {
          userId: u.id,
          title: `[NHẮC NỘP BÁO CÁO TUẦN] Tuần ${weekNumber} - Tháng ${month}`,
          message: `Vui lòng nộp báo cáo tuần ${weekNumber} trước thời hạn (Định kỳ Thứ 5 - 14h00).`,
          isRead: false,
          link: "/admin/weekly-reports"
        }
      })
      sentCount++

      const resolvedEmail = resolveUserEmail(u)
      if (resolvedEmail) {
        try {
          const emailHtml = `
            <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 36px 16px; color: #1e293b;">
              <div style="max-width: 620px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0;">
                
                <div style="background: linear-gradient(135deg, #0284c7, #0369a1); padding: 32px 28px; text-align: center; color: #ffffff;">
                  <span style="background: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 12px;">
                    ⏰ ĐỊNH KỲ THỨ 5 (14H00)
                  </span>
                  <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ffffff;">NHẮC NỘP BÁO CÁO TUẦN ${weekNumber}</h1>
                  <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Hệ thống Quản lý Giáo dục Skyline</p>
                </div>
                
                <div style="padding: 32px 28px;">
                  <p style="margin-top: 0; font-size: 15px; font-weight: 600; color: #334155;">Xin chào <strong>${u.fullName}</strong>,</p>
                  <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                    Hệ thống ghi nhận bạn <strong>chưa nộp Báo cáo Tuần ${weekNumber} (Tháng ${month}/${year})</strong>. 
                    Theo quy định, thời hạn nộp báo cáo tuần là trước <strong>14h00 Thứ 5 hàng tuần</strong>.
                  </p>
                  
                  <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 12px; padding: 18px; margin: 24px 0; border: 1px solid #bbf7d0;">
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #166534;">📌 Nội dung lưu ý:</p>
                    <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #14532d; line-height: 1.6;">
                      <li>Nộp báo cáo đầy đủ các Task chính, Nội dung công việc & Tiến độ thực tế.</li>
                      <li>Đề xuất giải pháp với các công việc gặp trở ngại để Trưởng Bộ Phận / Tổ trưởng kịp thời hỗ trợ.</li>
                      <li>TBP và Ban Điều Hành sẽ trực tiếp duyệt và nhận xét trên báo cáo.</li>
                    </ul>
                  </div>

                  <div style="text-align: center; margin: 32px 0 16px 0;">
                    <a href="${appUrl}/admin/weekly-reports" 
                       style="background-color: #48BFE3; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(0,169,157,0.3);">
                       📝 Nộp Báo Cáo Tuần Ngay
                    </a>
                  </div>
                </div>
                
                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
                  <p style="margin: 0;">Email nhắc nhở tự động từ Hệ thống Quản trị Skyline.</p>
                  <p style="margin: 4px 0 0 0;">&copy; ${now.getFullYear()} Skyline Educational System. All rights reserved.</p>
                </div>
              </div>
            </div>
          `;
          await sendEmail({
            to: resolvedEmail,
            subject: `[NHẮC NỘP BÁO CÁO TUẦN] Tuần ${weekNumber} Tháng ${month} - ${u.fullName}`,
            html: emailHtml
          });
          emailSentCount++
        } catch (emailErr) {
          console.error(`Failed to send weekly report reminder to ${resolvedEmail}:`, emailErr);
        }
      }
    }

    return {
      success: true,
      totalStaff: activeStaff.length,
      submittedCount: submittedUserIds.size,
      pendingCount: pendingStaff.length,
      remindedCount: sentCount,
      emailSentCount
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getDashboardStats(month: number, year: number, divisionCode?: string, departmentId?: string) {
  try {
    const opScope = await getOperationalScope()

    let allowedUserIds = opScope.scopedUserIds
    if (divisionCode && divisionCode !== "ALL") {
      const depts = await prisma.department.findMany({
        where: { divisionCode, status: "ACTIVE" },
        select: { id: true }
      })
      const deptIds = depts.map(d => d.id)
      const teachers = await prisma.teacher.findMany({
        where: {
          OR: [
            { departmentId: { in: deptIds } },
            { departmentAssignments: { some: { departmentId: { in: deptIds } } } }
          ]
        },
        select: { userId: true }
      })
      const uIds = new Set(teachers.map(t => t.userId))
      if (allowedUserIds !== null) {
        allowedUserIds = allowedUserIds.filter(id => uIds.has(id))
      } else {
        allowedUserIds = Array.from(uIds)
      }
    }

    if (departmentId && departmentId !== "ALL") {
      const teachers = await prisma.teacher.findMany({
        where: {
          OR: [
            { departmentId },
            { departmentAssignments: { some: { departmentId } } }
          ]
        },
        select: { userId: true }
      })
      const uIds = new Set(teachers.map(t => t.userId))
      if (allowedUserIds !== null) {
        allowedUserIds = allowedUserIds.filter(id => uIds.has(id))
      } else {
        allowedUserIds = Array.from(uIds)
      }
    }

    // Task stats filter
    const taskWhere: any = {}
    if (allowedUserIds !== null) {
      taskWhere.assignedToUserId = { in: allowedUserIds }
    }

    const [totalTasks, completed, overdue, inProgress, pending] = await Promise.all([
      prisma.workTask.count({ where: taskWhere }),
      prisma.workTask.count({ where: { ...taskWhere, progress: "COMPLETED" } }),
      prisma.workTask.count({ where: { ...taskWhere, progress: "OVERDUE" } }),
      prisma.workTask.count({ where: { ...taskWhere, progress: "IN_PROGRESS" } }),
      prisma.workTask.count({ where: { ...taskWhere, progress: "PENDING" } }),
    ])

    // Weekly report stats for the month
    const reportWhere: any = { month, year }
    if (allowedUserIds !== null) {
      reportWhere.userId = { in: allowedUserIds }
    }

    const weeklyReports = await prisma.weeklyReport.findMany({
      where: reportWhere,
      include: {
        items: true,
        user: { select: { id: true, fullName: true } }
      }
    })

    const userWeekMap: Record<string, { name: string; weeks: Record<number, { total: number; completed: number; doing: number; notCompleted: number }> }> = {}
    for (const r of weeklyReports) {
      const uid = r.userId
      if (!userWeekMap[uid]) userWeekMap[uid] = { name: r.user?.fullName || "Nhân viên", weeks: {} }
      const itemStats = { total: r.items.length, completed: 0, doing: 0, notCompleted: 0 }
      for (const item of r.items) {
        if (item.progress === "COMPLETED") itemStats.completed++
        else if (item.progress === "DOING") itemStats.doing++
        else itemStats.notCompleted++
      }
      userWeekMap[uid].weeks[r.weekNumber] = itemStats
    }

    return {
      success: true,
      stats: { totalTasks, completed, overdue, inProgress, pending },
      chartData: JSON.parse(JSON.stringify(userWeekMap))
    }
  } catch (e: any) {
    return { success: false, stats: { totalTasks: 0, completed: 0, overdue: 0, inProgress: 0, pending: 0 }, chartData: {}, error: e.message }
  }
}

/**
 * Retrieves comprehensive data for Personal Progress Tracking Cards (Thẻ theo dõi cá nhân)
 * Combines weekly report submission status, completion progress rate, and assigned work tasks.
 */
export async function getPersonalProgressCards(
  weekNumber: number,
  month: number,
  year: number,
  academicYearId?: string,
  divisionCode?: string,
  departmentId?: string
) {
  try {
    const opScope = await getOperationalScope()

    let allowedUserIds = opScope.scopedUserIds

    if (divisionCode && divisionCode !== "ALL") {
      const depts = await prisma.department.findMany({
        where: { divisionCode, status: "ACTIVE" },
        select: { id: true }
      })
      const deptIds = depts.map(d => d.id)
      const teachers = await prisma.teacher.findMany({
        where: {
          OR: [
            { departmentId: { in: deptIds } },
            { departmentAssignments: { some: { departmentId: { in: deptIds } } } }
          ]
        },
        select: { userId: true }
      })
      const uIds = new Set(teachers.map(t => t.userId))
      if (allowedUserIds !== null) {
        allowedUserIds = allowedUserIds.filter(id => uIds.has(id))
      } else {
        allowedUserIds = Array.from(uIds)
      }
    }

    if (departmentId && departmentId !== "ALL") {
      const teachers = await prisma.teacher.findMany({
        where: {
          OR: [
            { departmentId },
            { departmentAssignments: { some: { departmentId } } }
          ]
        },
        select: { userId: true }
      })
      const uIds = new Set(teachers.map(t => t.userId))
      if (allowedUserIds !== null) {
        allowedUserIds = allowedUserIds.filter(id => uIds.has(id))
      } else {
        allowedUserIds = Array.from(uIds)
      }
    }

    const staffWhere: any = {
      status: "ACTIVE",
      role: { not: "PARENT" }
    }
    if (allowedUserIds !== null) {
      staffWhere.id = { in: allowedUserIds }
    }

    const staffMembers = await prisma.user.findMany({
      where: staffWhere,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        teacher: {
          select: {
            id: true,
            position: true,
            departmentRel: { select: { id: true, name: true, code: true, divisionCode: true } },
            campus: { select: { campusName: true } }
          }
        }
      },
      orderBy: { fullName: "asc" }
    })

    const memberIds = staffMembers.map(s => s.id)

    // Fetch weekly reports for target week
    const reports = await prisma.weeklyReport.findMany({
      where: {
        userId: { in: memberIds },
        weekNumber,
        month,
        year
      },
      include: {
        items: true
      }
    })

    const reportByUser: Record<string, any> = {}
    reports.forEach(r => {
      reportByUser[r.userId] = r
    })

    // Fetch work tasks assigned to these users
    const taskWhere: any = {
      assignedToUserId: { in: memberIds }
    }
    if (academicYearId) {
      taskWhere.academicYearId = academicYearId
    }

    const tasks = await prisma.workTask.findMany({
      where: taskWhere,
      select: {
        id: true,
        assignedToUserId: true,
        progress: true,
        acceptanceStatus: true,
        title: true,
        endDate: true
      }
    })

    const tasksByUser: Record<string, any[]> = {}
    tasks.forEach(t => {
      if (t.assignedToUserId) {
        if (!tasksByUser[t.assignedToUserId]) tasksByUser[t.assignedToUserId] = []
        tasksByUser[t.assignedToUserId].push(t)
      }
    })

    // Build personal cards
    const cards = staffMembers.map(staff => {
      const report = reportByUser[staff.id] || null
      const userTasks = tasksByUser[staff.id] || []

      // Task metrics
      const taskTotal = userTasks.length
      const taskCompleted = userTasks.filter(t => t.progress === "COMPLETED").length
      const taskInProgress = userTasks.filter(t => t.progress === "IN_PROGRESS").length
      const taskOverdue = userTasks.filter(t => t.progress === "OVERDUE").length
      const taskPending = userTasks.filter(t => t.progress === "PENDING").length

      // Weekly report items metrics
      let reportTotal = 0
      let reportCompleted = 0
      let reportDoing = 0
      let reportNotCompleted = 0

      if (report && report.items) {
        reportTotal = report.items.length
        reportCompleted = report.items.filter((i: any) => i.progress === "COMPLETED").length
        reportDoing = report.items.filter((i: any) => i.progress === "DOING").length
        reportNotCompleted = report.items.filter((i: any) => i.progress === "NOT_COMPLETED" || i.progress === "NOT_STARTED").length
      }

      // Calculation of overall completion rate
      let completionRate = 0
      if (reportTotal > 0) {
        completionRate = Math.round((reportCompleted / reportTotal) * 100)
      } else if (taskTotal > 0) {
        completionRate = Math.round((taskCompleted / taskTotal) * 100)
      }

      let submissionStatus = "NOT_SUBMITTED"
      if (report) {
        submissionStatus = report.status || "SUBMITTED"
      }

      return {
        userId: staff.id,
        fullName: staff.fullName,
        email: resolveUserEmail(staff),
        role: staff.role,
        position: staff.teacher?.position || staff.role || "GV",
        departmentName: staff.teacher?.departmentRel?.name || staff.role || "Chưa phân tổ",
        departmentCode: staff.teacher?.departmentRel?.code || "",
        divisionCode: staff.teacher?.departmentRel?.divisionCode || null,
        campusName: staff.teacher?.campus?.campusName || "",
        submissionStatus,
        reportId: report?.id || null,
        reportUpdatedAt: report?.updatedAt ? new Date(report.updatedAt).toISOString() : null,
        managerComment: report?.managerComment || null,
        reportItemsCount: reportTotal,
        reportCompleted,
        reportDoing,
        reportNotCompleted,
        completionRate,
        tasks: {
          total: taskTotal,
          completed: taskCompleted,
          inProgress: taskInProgress,
          overdue: taskOverdue,
          pending: taskPending
        }
      }
    })

    // Sort: NOT_SUBMITTED first, then DRAFT, then SUBMITTED, then REVIEWED
    const statusOrder: Record<string, number> = {
      NOT_SUBMITTED: 1,
      DRAFT: 2,
      SUBMITTED: 3,
      REVIEWED: 4
    }
    cards.sort((a, b) => (statusOrder[a.submissionStatus] || 99) - (statusOrder[b.submissionStatus] || 99))

    return {
      success: true,
      cards: JSON.parse(JSON.stringify(cards)),
      summary: {
        totalStaff: cards.length,
        submittedCount: cards.filter(c => c.submissionStatus === "SUBMITTED" || c.submissionStatus === "REVIEWED").length,
        pendingCount: cards.filter(c => c.submissionStatus === "NOT_SUBMITTED" || c.submissionStatus === "DRAFT").length,
        reviewedCount: cards.filter(c => c.submissionStatus === "REVIEWED").length,
      }
    }
  } catch (e: any) {
    return { success: false, cards: [], summary: { totalStaff: 0, submittedCount: 0, pendingCount: 0, reviewedCount: 0 }, error: e.message }
  }
}

export async function getUserReportHistory(targetUserId?: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập", reports: [] }
    const currentUserId = session.user.id

    const opScope = await getOperationalScope()

    let userId = currentUserId
    if (targetUserId) {
      if (opScope.isSuperAdmin || opScope.isHeadOfAcademic) {
        userId = targetUserId
      } else if (opScope.scopedUserIds && opScope.scopedUserIds.includes(targetUserId)) {
        userId = targetUserId
      } else if (targetUserId !== currentUserId) {
        return { success: false, reports: [], error: "Không có quyền xem lịch sử của nhân sự ngoài phạm vi" }
      }
    }

    const reports = await prisma.weeklyReport.findMany({
      where: { userId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        user: { select: { fullName: true, email: true, role: true } }
      },
      orderBy: [
        { year: "desc" },
        { month: "desc" },
        { weekNumber: "desc" },
        { updatedAt: "desc" }
      ]
    })

    return { success: true, reports: JSON.parse(JSON.stringify(reports)) }
  } catch (e: any) {
    return { success: false, reports: [], error: e.message }
  }
}

export async function deleteWeeklyReport(reportId: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }
    
    const opScope = await getOperationalScope()
    if (!opScope.isManager) return { success: false, error: "Chỉ quản lý mới có quyền xóa báo cáo" }

    const report = await prisma.weeklyReport.findUnique({
      where: { id: reportId },
      select: { userId: true }
    })
    if (!report) return { success: false, error: "Không tìm thấy báo cáo" }

    if (opScope.scopedUserIds !== null && !opScope.scopedUserIds.includes(report.userId)) {
      return { success: false, error: "Không có quyền xóa báo cáo ngoài bộ phận/tổ" }
    }

    await prisma.$transaction([
      prisma.weeklyReportItem.deleteMany({ where: { reportId } }),
      prisma.weeklyReport.delete({ where: { id: reportId } })
    ])
    
    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
