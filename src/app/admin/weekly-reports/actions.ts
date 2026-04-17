"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Calculate weeks for a given month/year
export async function getWeeksOfMonth(month: number, year: number) {
  const weeks: { weekNum: number; start: string; end: string; label: string }[] = []
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  
  // Find first Monday
  let current = new Date(firstDay)
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
      label: "Tuan " + weekNum + " (" + start.getDate() + "/" + (start.getMonth()+1) + " - " + end.getDate() + "/" + (end.getMonth()+1) + ")"
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
        user: { select: { fullName: true, role: true } }
      }
    })
    return { success: true, report: report ? JSON.parse(JSON.stringify(report)) : null }
  } catch (e: any) {
    return { success: false, report: null, error: e.message }
  }
}

export async function getAllWeeklyReports(weekNumber: number, month: number, year: number) {
  try {
    const reports = await prisma.weeklyReport.findMany({
      where: { weekNumber, month, year },
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
  weekNumber: number; month: number; year: number; academicYearId?: string;
  items: { id?: string; mainTask: string; workContent: string; progress: string; proposedSolution?: string }[]
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    const userId = session.user.id

    let report = await prisma.weeklyReport.findFirst({
      where: { userId, weekNumber: data.weekNumber, month: data.month, year: data.year }
    })

    if (report) {
      // Delete old items and recreate
      await prisma.weeklyReportItem.deleteMany({ where: { reportId: report.id } })
      report = await prisma.weeklyReport.update({
        where: { id: report.id },
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
    const role = (session.user as any).role
    if (role !== "ADMIN") return { success: false, error: "Chỉ quản lý mới có quyền" }

    await prisma.weeklyReport.update({
      where: { id: reportId },
      data: { managerComment, status: "REVIEWED" }
    })

    // Notify the report owner
    const report = await prisma.weeklyReport.findUnique({ where: { id: reportId }, select: { userId: true, weekNumber: true, month: true } })
    if (report) {
      await prisma.notification.create({
        data: {
          userId: report.userId,
          title: "[Nhận xét BC] Tuần " + report.weekNumber + " Tháng " + report.month,
          message: "Quản lý đã nhận xét báo cáo của bạn: " + managerComment.substring(0, 100),
          isRead: false
        }
      })
    }

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
    const role = (session.user as any).role
    if (role !== "ADMIN") return { success: false, error: "Chỉ quản lý mới có quyền" }

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

export async function getConsolidatedReports(roleCode: string, weekNumber: number, month: number, year: number) {
  try {
    const whereUser = roleCode === "ALL" ? {} : { role: roleCode }
    const reports = await prisma.weeklyReport.findMany({
      where: { weekNumber, month, year, user: whereUser },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        user: { select: { id: true, fullName: true, role: true, email: true } }
      },
      orderBy: [{ user: { fullName: "asc" } }, { createdAt: "asc" }]
    })
    return { success: true, reports: JSON.parse(JSON.stringify(reports)) }
  } catch (e: any) {
    return { success: false, reports: [], error: e.message }
  }
}

export async function getDashboardStats(month: number, year: number) {
  try {
    // Task stats
    const [totalTasks, completed, overdue, inProgress, pending] = await Promise.all([
      prisma.workTask.count(),
      prisma.workTask.count({ where: { progress: "COMPLETED" } }),
      prisma.workTask.count({ where: { progress: "OVERDUE" } }),
      prisma.workTask.count({ where: { progress: "IN_PROGRESS" } }),
      prisma.workTask.count({ where: { progress: "PENDING" } }),
    ])

    // Weekly report stats for the month
    const weeklyReports = await prisma.weeklyReport.findMany({
      where: { month, year },
      include: {
        items: true,
        user: { select: { id: true, fullName: true } }
      }
    })

    // Group by user & week for chart data
    const userWeekMap: Record<string, { name: string; weeks: Record<number, { total: number; completed: number; doing: number; notCompleted: number }> }> = {}
    for (const r of weeklyReports) {
      const uid = r.userId
      if (!userWeekMap[uid]) userWeekMap[uid] = { name: r.user.fullName, weeks: {} }
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
