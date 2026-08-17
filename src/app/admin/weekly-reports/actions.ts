"use server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidatePath } from "next/cache"
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
  weekNumber: number; month: number; year: number; academicYearId?: string; targetUserId?: string;
  items: { id?: string; mainTask: string; workContent: string; progress: string; proposedSolution?: string }[]
}) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập" }
    const currentUserId = session.user.id
    const currentRole = (session.user as any).role

    // Allow Admin to save report for targetUserId or default to current user
    let userId = currentUserId
    if (data.targetUserId && currentRole === "ADMIN") {
      userId = data.targetUserId
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
    const role = (session.user as any).role
    if (role !== "ADMIN") return { success: false, error: "Chỉ quản lý mới có quyền" }

    await prisma.weeklyReport.update({
      where: { id: reportId },
      data: { managerComment, status: "REVIEWED" }
    })

    const report = await prisma.weeklyReport.findUnique({ 
      where: { id: reportId }, 
      select: { userId: true, weekNumber: true, month: true } 
    })
    if (report) {
      await prisma.notification.create({
        data: {
          userId: report.userId,
          title: "[Nhận xét Báo cáo Tuần] Tuần " + report.weekNumber + " Tháng " + report.month,
          message: "Ban quản lý đã nhận xét báo cáo của bạn: " + managerComment.substring(0, 100),
          isRead: false,
          link: "/admin/weekly-reports"
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

export async function sendWeeklyReportEmailReminders(targetWeek?: number, targetMonth?: number, targetYear?: number) {
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

    // Fetch active staff/teachers (role !== 'PARENT')
    const activeStaff = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        role: { not: "PARENT" }
      },
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
        status: { in: ["SUBMITTED", "REVIEWED"] }
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
                
                <div style="background: linear-gradient(135deg, #d97706, #b45309); padding: 32px 28px; text-align: center; color: #ffffff;">
                  <span style="background: rgba(255,255,255,0.2); padding: 4px 14px; border-radius: 99px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: inline-block; margin-bottom: 12px;">
                    ⏰ THÔNG BÁO ĐỊNH KỲ THỨ 5 (14H00)
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
                  
                  <div style="background-color: #fffbe6; border-left: 4px solid #d97706; border-radius: 12px; padding: 18px; margin: 24px 0; border: 1px solid #ffe58f; border-left-width: 4px;">
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #92400e;">📌 Nội dung nhắc nhở:</p>
                    <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 13px; color: #78350f; line-height: 1.6;">
                      <li>Nộp báo cáo đầy đủ các mục Task chính, Nội dung công việc & Tiến độ.</li>
                      <li>Đề xuất giải pháp đối với các nội dung chưa hoàn thành hoặc gặp khó khăn.</li>
                      <li>Ban điều hành sẽ xem xét và đưa ra chỉ đạo trực tiếp trên báo cáo.</li>
                    </ul>
                  </div>

                  <div style="text-align: center; margin: 32px 0 16px 0;">
                    <a href="${appUrl}/admin/weekly-reports" 
                       style="background-color: #36E08F; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 12px; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(0,169,157,0.3);">
                       📝 Nộp Báo Cáo Tuần Ngay
                    </a>
                  </div>
                </div>
                
                <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
                  <p style="margin: 0;">Email nhắc nhở tự động từ Hệ thống Giáo dục Skyline.</p>
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

export async function getUserReportHistory(targetUserId?: string) {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, error: "Chưa đăng nhập", reports: [] }
    const currentUserId = session.user.id
    const currentRole = (session.user as any).role

    let userId = currentUserId
    if (targetUserId && currentRole === "ADMIN") {
      userId = targetUserId
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
