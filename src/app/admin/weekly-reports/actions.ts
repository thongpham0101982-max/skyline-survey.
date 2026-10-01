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
  items: { 
    id?: string; 
    mainTask?: string; 
    category?: string;
    taskGroup?: string;
    workContent: string; 
    expectedCompletion?: string; 
    progress: string; 
    proposedSolution?: string;
    managerNote?: string;
    directorNote?: string;
    directorRating?: string;
    qualityScore?: number | null;
  }[]
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
                mainTask: item.mainTask || item.category || item.taskGroup || "Công việc",
                workContent: item.workContent,
                category: item.category || null,
                taskGroup: item.taskGroup || null,
                expectedCompletion: item.expectedCompletion || null,
                progress: item.progress,
                proposedSolution: item.proposedSolution || "",
                managerNote: item.managerNote || null,
                directorNote: item.directorNote || null,
                directorRating: item.directorRating || null,
                qualityScore: item.qualityScore !== undefined ? item.qualityScore : null
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
              mainTask: item.mainTask || item.category || item.taskGroup || "Công việc",
              workContent: item.workContent,
              category: item.category || null,
              taskGroup: item.taskGroup || null,
              expectedCompletion: item.expectedCompletion || null,
              progress: item.progress,
              proposedSolution: item.proposedSolution || "",
              managerNote: item.managerNote || null,
              directorNote: item.directorNote || null,
              directorRating: item.directorRating || null,
              qualityScore: item.qualityScore !== undefined ? item.qualityScore : null
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

export async function addDirectorItemEvaluation(itemId: string, data: { directorNote?: string; directorRating?: string; qualityScore?: number | null }) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }
    
    const opScope = await getOperationalScope()
    if (!opScope.isManager && (session.user as any).role !== "ADMIN") {
      return { success: false, error: "Chỉ GĐB / Quản lý mới có quyền đánh giá" }
    }

    const item = await prisma.weeklyReportItem.findUnique({
      where: { id: itemId },
      include: { report: { select: { userId: true, weekNumber: true, month: true } } }
    })
    if (!item) return { success: false, error: "Không tìm thấy mục báo cáo" }

    const updateData: any = {}
    if (data.directorNote !== undefined) updateData.directorNote = data.directorNote
    if (data.directorRating !== undefined) updateData.directorRating = data.directorRating
    if (data.qualityScore !== undefined) updateData.qualityScore = data.qualityScore

    await prisma.weeklyReportItem.update({
      where: { id: itemId },
      data: updateData
    })

    if (data.directorNote && data.directorNote.trim()) {
      await prisma.notification.create({
        data: {
          userId: item.report.userId,
          title: `[Ý kiến Giám Đốc Ban] Báo cáo Tuần ${item.report.weekNumber} Tháng ${item.report.month}`,
          message: `GĐB đã đánh giá công việc "${item.mainTask || item.workContent.substring(0, 35)}": ${data.directorNote.substring(0, 80)}`,
          isRead: false,
          link: "/admin/weekly-reports"
        }
      }).catch(() => {})
    }

    revalidatePath("/admin/weekly-reports")
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function saveDirectorReportComment(reportId: string, directorComment: string) {
  try {
    const session = await auth()
    if (!session?.user) return { success: false, error: "Chưa đăng nhập" }
    
    const opScope = await getOperationalScope()
    if (!opScope.isManager && (session.user as any).role !== "ADMIN") {
      return { success: false, error: "Chỉ GĐB / Quản lý mới có quyền nhận xét" }
    }

    const report = await prisma.weeklyReport.findUnique({
      where: { id: reportId }
    })
    if (!report) return { success: false, error: "Không tìm thấy báo cáo" }

    await prisma.weeklyReport.update({
      where: { id: reportId },
      data: { directorComment }
    })

    if (directorComment.trim()) {
      await prisma.notification.create({
        data: {
          userId: report.userId,
          title: `[Đánh giá Giám Đốc Ban] Tuần ${report.weekNumber} Tháng ${report.month}`,
          message: `Giám đốc ban đã gửi ý kiến đánh giá báo cáo tuần: ${directorComment.substring(0, 100)}`,
          isRead: false,
          link: "/admin/weekly-reports"
        }
      }).catch(() => {})
    }

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
          { teacher: {
            OR: [
              { departmentId: roleCode },
              { departmentRel: { OR: [{ id: roleCode }, { code: roleCode }, { name: roleCode }] } },
              { departmentAssignments: { some: { OR: [{ departmentId: roleCode }, { department: { OR: [{ code: roleCode }, { name: roleCode }] } }] } } }
            ]
          } }
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
      // Create in-app notification only (KHÔNG GỬI EMAIL RA NGOÀI THEO YÊU CẦU)
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
        departmentId: staff.teacher?.departmentRel?.id || (staff.teacher as any)?.departmentId || "",
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


/**
 * Lấy danh sách giáo viên thuộc một Tổ Chuyên Môn cụ thể
 */
export async function getDepartmentTeachers(departmentId: string) {
  try {
    const dept = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, code: true, name: true, divisionCode: true, blockCM: true }
    });
    if (!dept) return { success: false, error: "Không tìm thấy Tổ chuyên môn", teachers: [] };

    // Fetch teachers assigned directly or via TeacherDepartmentAssignment
    const teachers = await prisma.teacher.findMany({
      where: {
        OR: [
          { departmentId },
          { departmentAssignments: { some: { departmentId } } }
        ],
        status: "ACTIVE"
      },
      select: {
        id: true,
        teacherCode: true,
        teacherName: true,
        email: true,
        phone: true,
        position: true,
        userId: true,
        campus: { select: { campusName: true } },
        departmentAssignments: {
          where: { departmentId },
          select: { position: true, isPrimary: true }
        }
      },
      orderBy: { teacherName: "asc" }
    });

    const resolvedList = teachers.map(t => {
      const assignment = t.departmentAssignments?.[0];
      const posInDept = assignment?.position || t.position || "GV";
      return {
        id: t.id,
        teacherCode: t.teacherCode,
        teacherName: t.teacherName,
        email: t.email || "",
        phone: t.phone || "",
        position: posInDept,
        isPrimary: assignment?.isPrimary ?? (t.position === posInDept),
        userId: t.userId,
        campusName: t.campus?.campusName || ""
      };
    });

    return {
      success: true,
      department: dept,
      teachers: JSON.parse(JSON.stringify(resolvedList))
    };
  } catch (e: any) {
    return { success: false, error: e.message, teachers: [] };
  }
}

/**
 * Gán danh sách Giáo viên vào một Tổ Chuyên Môn
 */
export async function assignTeachersToDepartment(departmentId: string, teacherIds: string[], position: string = "GV") {
  try {
    const opScope = await getOperationalScope();
    if (!opScope.isManager) {
      return { success: false, error: "Bạn không có quyền quản lý cấu hình Tổ chuyên môn" };
    }

    const dept = await prisma.department.findUnique({ where: { id: departmentId } });
    if (!dept) return { success: false, error: "Không tìm thấy Tổ chuyên môn" };

    const pAny = prisma as any;

    for (const teacherId of teacherIds) {
      // Upsert TeacherDepartmentAssignment
      if (pAny.teacherDepartmentAssignment) {
        await pAny.teacherDepartmentAssignment.upsert({
          where: {
            teacherId_departmentId: { teacherId, departmentId }
          },
          create: {
            teacherId,
            departmentId,
            position,
            isPrimary: true
          },
          update: {
            position,
            isPrimary: true
          }
        });
      }

      // Update primary department on Teacher record
      const updateData: any = { departmentId };
      if (position === "TTCM" || position === "TPTCM") {
        updateData.position = position;
      }
      await prisma.teacher.update({
        where: { id: teacherId },
        data: updateData
      });
    }

    revalidatePath("/admin/weekly-reports");
    revalidatePath("/admin/departments");
    return { success: true, count: teacherIds.length };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Gỡ Giáo viên khỏi Tổ Chuyên Môn
 */
export async function removeTeacherFromDepartment(departmentId: string, teacherId: string) {
  try {
    const opScope = await getOperationalScope();
    if (!opScope.isManager) {
      return { success: false, error: "Bạn không có quyền quản lý cấu hình Tổ chuyên môn" };
    }

    const pAny = prisma as any;
    if (pAny.teacherDepartmentAssignment) {
      await pAny.teacherDepartmentAssignment.deleteMany({
        where: { teacherId, departmentId }
      });
    }

    // Check if teacher's primary departmentId matches this one
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { departmentAssignments: true }
    });

    if (teacher && teacher.departmentId === departmentId) {
      // If there are other department assignments, assign the first one, else null
      const remaining = teacher.departmentAssignments.filter(a => a.departmentId !== departmentId);
      const nextDeptId = remaining.length > 0 ? remaining[0].departmentId : null;
      await prisma.teacher.update({
        where: { id: teacherId },
        data: { departmentId: nextDeptId }
      });
    }

    revalidatePath("/admin/weekly-reports");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Cập nhật Chức vụ của Giáo viên trong Tổ (TTCM / TPTCM / GV)
 */
export async function updateTeacherDepartmentPosition(departmentId: string, teacherId: string, position: string) {
  try {
    const opScope = await getOperationalScope();
    if (!opScope.isManager) {
      return { success: false, error: "Bạn không có quyền quản lý cấu hình Tổ chuyên môn" };
    }

    const pAny = prisma as any;
    if (pAny.teacherDepartmentAssignment) {
      await pAny.teacherDepartmentAssignment.upsert({
        where: {
          teacherId_departmentId: { teacherId, departmentId }
        },
        create: {
          teacherId,
          departmentId,
          position,
          isPrimary: position === "TTCM" || position === "TPTCM"
        },
        update: {
          position,
          ...(position === "TTCM" || position === "TPTCM" ? { isPrimary: true } : {})
        }
      });
    }

    if (position === "TTCM" || position === "TPTCM") {
      await prisma.teacher.update({
        where: { id: teacherId },
        data: { position, departmentId }
      });
    }

    revalidatePath("/admin/weekly-reports");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Lấy danh sách toàn bộ Giáo viên để tìm kiếm và gán vào Tổ
 */
export async function getAllTeachersForAssignment() {
  try {
    const teachers = await prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        teacherCode: true,
        teacherName: true,
        email: true,
        position: true,
        campus: { select: { campusName: true } },
        departmentRel: { select: { id: true, code: true, name: true, divisionCode: true } },
        departmentAssignments: {
          select: { departmentId: true, position: true, department: { select: { name: true } } }
        }
      },
      orderBy: { teacherName: "asc" }
    });

    const list = teachers.map(t => ({
      id: t.id,
      teacherCode: t.teacherCode,
      teacherName: t.teacherName,
      email: t.email || "",
      position: t.position || "GV",
      campusName: t.campus?.campusName || "",
      currentDeptName: t.departmentRel?.name || t.departmentAssignments?.[0]?.department?.name || "Chưa phân tổ",
      currentDeptId: t.departmentRel?.id || t.departmentAssignments?.[0]?.departmentId || null,
      divisionCode: t.departmentRel?.divisionCode || null
    }));

    return { success: true, teachers: JSON.parse(JSON.stringify(list)) };
  } catch (e: any) {
    return { success: false, error: e.message, teachers: [] };
  }
}

/**
 * Đặt Tổ Chuyên Môn này làm Tổ Mặc Định (Primary Department) cho Giáo viên
 */
export async function setTeacherPrimaryDepartment(departmentId: string, teacherId: string) {
  try {
    const opScope = await getOperationalScope();
    if (!opScope.isManager) {
      return { success: false, error: "Bạn không có quyền quản lý cấu hình Tổ chuyên môn" };
    }

    const pAny = prisma as any;
    if (pAny.teacherDepartmentAssignment) {
      // Gỡ cờ isPrimary của các tổ khác của GV này
      await pAny.teacherDepartmentAssignment.updateMany({
        where: { teacherId },
        data: { isPrimary: false }
      });

      // Bật isPrimary = true cho tổ này
      await pAny.teacherDepartmentAssignment.upsert({
        where: {
          teacherId_departmentId: { teacherId, departmentId }
        },
        create: {
          teacherId,
          departmentId,
          position: "GV",
          isPrimary: true
        },
        update: {
          isPrimary: true
        }
      });
    }

    // Cập nhật trường departmentId chính trong bảng Teacher
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { departmentId }
    });

    revalidatePath("/admin/weekly-reports");
    revalidatePath("/admin/departments");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getMonthlyTaskGroupProgress(month: number, year: number, deptId?: string) {
  try {
    const opScope = await getOperationalScope()
    let allowedUserIds = opScope.scopedUserIds

    const whereReport: any = { month, year }
    if (allowedUserIds !== null) {
      whereReport.userId = { in: allowedUserIds }
    }

    if (deptId && deptId !== "ALL") {
      whereReport.user = {
        OR: [
          { role: deptId },
          { teacher: {
            OR: [
              { departmentId: deptId },
              { departmentRel: { OR: [{ id: deptId }, { code: deptId }, { name: deptId }] } },
              { departmentAssignments: { some: { OR: [{ departmentId: deptId }, { department: { OR: [{ code: deptId }, { name: deptId }] } }] } } }
            ]
          } }
        ]
      }
    }

    const reports = await prisma.weeklyReport.findMany({
      where: whereReport,
      include: {
        items: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            teacher: {
              select: {
                departmentRel: { select: { name: true, code: true } }
              }
            }
          }
        }
      },
      orderBy: { weekNumber: "asc" }
    })

    const taskGroups = await prisma.taskGroup.findMany({ orderBy: { name: "asc" } })

    const groupStats: Record<string, { total: number; completed: number; doing: number; notCompleted: number; proposedSolutions: string[] }> = {}
    taskGroups.forEach(g => {
      groupStats[g.name] = { total: 0, completed: 0, doing: 0, notCompleted: 0, proposedSolutions: [] }
    })
    groupStats["Khác / Chưa gán"] = { total: 0, completed: 0, doing: 0, notCompleted: 0, proposedSolutions: [] }

    const staffMap: Record<string, any> = {}

    reports.forEach(rpt => {
      const u = rpt.user
      if (!staffMap[u.id]) {
        staffMap[u.id] = {
          userId: u.id,
          fullName: u.fullName,
          email: u.email,
          departmentName: u.teacher?.departmentRel?.name || u.role,
          groups: {},
          totalMonth: 0,
          completedMonth: 0
        }
      }

      rpt.items.forEach(item => {
        const gName = item.taskGroup || "Khác / Chưa gán"
        if (!groupStats[gName]) {
          groupStats[gName] = { total: 0, completed: 0, doing: 0, notCompleted: 0, proposedSolutions: [] }
        }

        groupStats[gName].total++
        if (item.progress === "COMPLETED") groupStats[gName].completed++
        else if (item.progress === "DOING") groupStats[gName].doing++
        else groupStats[gName].notCompleted++

        if (item.proposedSolution && item.proposedSolution.trim()) {
          groupStats[gName].proposedSolutions.push(item.proposedSolution.trim())
        }

        if (!staffMap[u.id].groups[gName]) {
          staffMap[u.id].groups[gName] = { total: 0, completed: 0, doing: 0, notCompleted: 0 }
        }
        staffMap[u.id].groups[gName].total++
        staffMap[u.id].totalMonth++
        if (item.progress === "COMPLETED") {
          staffMap[u.id].groups[gName].completed++
          staffMap[u.id].completedMonth++
        }
      })
    })

    const recommendations: { groupName: string; priority: "HIGH" | "MEDIUM" | "LOW"; title: string; content: string; proposedSolutions: string[] }[] = []

    Object.entries(groupStats).forEach(([gName, st]) => {
      if (st.total === 0) return
      const rate = Math.round((st.completed / st.total) * 100)
      if (rate < 60 || st.notCompleted > 2) {
        recommendations.push({
          groupName: gName,
          priority: rate < 40 ? "HIGH" : "MEDIUM",
          title: `Đẩy nhanh tiến độ nhóm "${gName}" (Hoàn thành ${rate}%)`,
          content: `Nhóm hiện có ${st.notCompleted} đầu việc chưa hoàn thành hoặc chưa bắt đầu. Cần tổ chức rà soát tiến độ và phân bổ thêm nguồn lực hỗ trợ hoàn thành đúng hạn.`,
          proposedSolutions: st.proposedSolutions.slice(0, 3)
        })
      } else if (st.proposedSolutions.length > 0) {
        recommendations.push({
          groupName: gName,
          priority: "LOW",
          title: `Xử lý kiến nghị / giải pháp của nhóm "${gName}"`,
          content: `Nhóm đạt tỷ lệ ${rate}%, có ${st.proposedSolutions.length} đề xuất giải pháp cần BĐH / Tổ trưởng phê duyệt và tháo gỡ.`,
          proposedSolutions: st.proposedSolutions.slice(0, 3)
        })
      }
    })

    return {
      success: true,
      groupStats,
      staffMatrix: Object.values(staffMap),
      recommendations,
      allGroups: taskGroups.map(g => g.name)
    }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function getMonthlyQualityKpiSummary(month: number, year: number, deptId?: string, divisionCode?: string) {
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

    const whereReport: any = { month, year }
    if (allowedUserIds !== null) {
      whereReport.userId = { in: allowedUserIds }
    }

    if (deptId && deptId !== "ALL") {
      whereReport.user = {
        OR: [
          { role: deptId },
          { teacher: {
            OR: [
              { departmentId: deptId },
              { departmentRel: { OR: [{ id: deptId }, { code: deptId }, { name: deptId }] } },
              { departmentAssignments: { some: { OR: [{ departmentId: deptId }, { department: { OR: [{ code: deptId }, { name: deptId }] } }] } } }
            ]
          } }
        ]
      }
    }

    const [reports, taskCategories, taskGroups] = await Promise.all([
      prisma.weeklyReport.findMany({
        where: whereReport,
        include: {
          items: true,
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              teacher: {
                select: {
                  position: true,
                  departmentRel: { select: { name: true, code: true } }
                }
              }
            }
          }
        },
        orderBy: { weekNumber: "asc" }
      }),
      prisma.taskCategory.findMany({ orderBy: { name: "asc" } }),
      prisma.taskGroup.findMany({ orderBy: { name: "asc" } })
    ])

    // Build category weight lookup
    const catWeightMap = new Map<string, number>()
    taskCategories.forEach(c => {
      catWeightMap.set(c.name.trim().toLowerCase(), c.weight || 1.0)
    })

    const staffMap: Record<string, any> = {}

    reports.forEach(rpt => {
      const u = rpt.user
      if (!staffMap[u.id]) {
        staffMap[u.id] = {
          userId: u.id,
          fullName: u.fullName,
          email: u.email,
          departmentName: u.teacher?.departmentRel?.name || u.role,
          position: u.teacher?.position || "Nhân sự",
          totalTasks: 0,
          completedTasks: 0,
          doingTasks: 0,
          notCompletedTasks: 0,
          totalWeight: 0,
          weightedCompletedScore: 0,
          totalQualityScoreSum: 0,
          directorEvaluatedCount: 0,
          directorComments: [] as string[],
          tasks: [] as any[]
        }
      }

      if (rpt.directorComment && rpt.directorComment.trim() && !staffMap[u.id].directorComments.includes(rpt.directorComment.trim())) {
        staffMap[u.id].directorComments.push(`[Tuần ${rpt.weekNumber}]: ${rpt.directorComment.trim()}`)
      }

      rpt.items.forEach(item => {
        const catName = (item.category || item.mainTask || "").trim().toLowerCase()
        const weight = catWeightMap.get(catName) || 1.0

        staffMap[u.id].totalTasks++
        staffMap[u.id].totalWeight += weight

        let progressRate = 0
        if (item.progress === "COMPLETED") {
          progressRate = 1.0
          staffMap[u.id].completedTasks++
        } else if (item.progress === "DOING") {
          progressRate = 0.5
          staffMap[u.id].doingTasks++
        } else {
          progressRate = 0.0
          staffMap[u.id].notCompletedTasks++
        }

        staffMap[u.id].weightedCompletedScore += (progressRate * weight)

        // Quality score: from director rating / qualityScore, or baseline from progress
        let itemQualityScore = item.qualityScore
        if (itemQualityScore === null || itemQualityScore === undefined) {
          if (item.directorRating === "EXCELLENT") itemQualityScore = 10
          else if (item.directorRating === "GOOD") itemQualityScore = 8.5
          else if (item.directorRating === "SATISFACTORY") itemQualityScore = 7.0
          else if (item.directorRating === "NEEDS_IMPROVEMENT") itemQualityScore = 5.0
          else {
            if (item.progress === "COMPLETED") itemQualityScore = 9.0
            else if (item.progress === "DOING") itemQualityScore = 6.0
            else itemQualityScore = 3.5
          }
        } else {
          staffMap[u.id].directorEvaluatedCount++
        }

        if (item.directorNote || item.directorRating) {
          staffMap[u.id].directorEvaluatedCount++
        }

        staffMap[u.id].totalQualityScoreSum += (itemQualityScore * weight)

        staffMap[u.id].tasks.push({
          id: item.id,
          weekNumber: rpt.weekNumber,
          mainTask: item.mainTask,
          category: item.category,
          taskGroup: item.taskGroup,
          workContent: item.workContent,
          expectedCompletion: item.expectedCompletion,
          progress: item.progress,
          weight,
          managerNote: item.managerNote,
          directorNote: item.directorNote,
          directorRating: item.directorRating,
          qualityScore: itemQualityScore
        })
      })
    })

    const staffKpis = Object.values(staffMap).map(st => {
      const weightedProgressRate = st.totalWeight > 0 ? Math.round((st.weightedCompletedScore / st.totalWeight) * 100) : 0
      const avgKpiScore = st.totalWeight > 0 ? Number((st.totalQualityScoreSum / st.totalWeight).toFixed(1)) : 0

      // KPI grading
      let kpiGrade = "C"
      let kpiGradeLabel = "Hoàn thành"
      let kpiColor = "text-amber-700 bg-amber-50 border-amber-300"

      if (avgKpiScore >= 9.0) {
        kpiGrade = "A"
        kpiGradeLabel = "Xuất sắc"
        kpiColor = "text-emerald-700 bg-emerald-50 border-emerald-300"
      } else if (avgKpiScore >= 7.5) {
        kpiGrade = "B"
        kpiGradeLabel = "Hoàn thành tốt"
        kpiColor = "text-blue-700 bg-blue-50 border-blue-300"
      } else if (avgKpiScore >= 6.0) {
        kpiGrade = "C"
        kpiGradeLabel = "Hoàn thành"
        kpiColor = "text-amber-700 bg-amber-50 border-amber-300"
      } else {
        kpiGrade = "D"
        kpiGradeLabel = "Cần cải thiện"
        kpiColor = "text-rose-700 bg-rose-50 border-rose-300"
      }

      return {
        ...st,
        totalWeight: Number(st.totalWeight.toFixed(1)),
        weightedProgressRate,
        avgKpiScore,
        kpiGrade,
        kpiGradeLabel,
        kpiColor
      }
    })

    // Sort by KPI Score desc
    staffKpis.sort((a, b) => b.avgKpiScore - a.avgKpiScore)

    // Summary statistics
    const totalStaff = staffKpis.length
    const totalTasksMonth = staffKpis.reduce((acc, s) => acc + s.totalTasks, 0)
    const gradeACount = staffKpis.filter(s => s.kpiGrade === "A").length
    const gradeBCount = staffKpis.filter(s => s.kpiGrade === "B").length
    const gradeCCount = staffKpis.filter(s => s.kpiGrade === "C").length
    const gradeDCount = staffKpis.filter(s => s.kpiGrade === "D").length
    const avgKpiScore = totalStaff > 0 ? Number((staffKpis.reduce((acc, s) => acc + s.avgKpiScore, 0) / totalStaff).toFixed(1)) : 0
    const avgCompletionRate = totalStaff > 0 ? Math.round(staffKpis.reduce((acc, s) => acc + s.weightedProgressRate, 0) / totalStaff) : 0

    return {
      success: true,
      staffKpis,
      summary: {
        totalStaff,
        totalTasksMonth,
        gradeACount,
        gradeBCount,
        gradeCCount,
        gradeDCount,
        avgKpiScore,
        avgCompletionRate
      },
      taskCategories: JSON.parse(JSON.stringify(taskCategories))
    }
  } catch (e: any) {
    return { success: false, error: e.message, staffKpis: [] }
  }
}
