const fs = require('fs');

// 1. Add new server actions
let actions = fs.readFileSync('src/app/admin/weekly-reports/actions.ts', 'utf8');

const newActions = `
export async function getConsolidatedReports(roleCode: string, weekNumber: number, month: number, year: number) {
  try {
    const whereUser = roleCode === "ALL" ? {} : { role: roleCode }
    const reports = await prisma.weeklyReport.findMany({
      where: { weekNumber, month, year, user: whereUser },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        user: { select: { id: true, fullName: true, role: true, email: true, employeeCode: true } }
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
`;

if (!actions.includes('getConsolidatedReports')) {
  actions = actions.trimEnd() + '\n' + newActions;
  fs.writeFileSync('src/app/admin/weekly-reports/actions.ts', actions);
  console.log('OK: New actions added');
} else {
  console.log('SKIP: Actions exist');
}

// 2. Update page.tsx to pass roles
const pageContent = `import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { WeeklyReportClient } from "./client"

export const metadata = { title: "Bao cao Tuan | SQMS" }
export const dynamic = "force-dynamic"

export default async function WeeklyReportsPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role || "ADMIN"
  const userId = user?.id || ""

  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true }
  })

  let staffUsers: any[] = []
  let roles: any[] = []
  if (role === "ADMIN") {
    staffUsers = await prisma.user.findMany({
      where: { role: { not: "PARENT" }, status: "ACTIVE" },
      select: { id: true, fullName: true, role: true, email: true, employeeCode: true },
      orderBy: { fullName: "asc" }
    })
    roles = await prisma.role.findMany({
      select: { code: true, name: true },
      orderBy: { name: "asc" }
    })
  }

  return (
    <div className="space-y-6">
      <WeeklyReportClient
        currentRole={role}
        currentUserId={userId}
        currentUserName={user?.name || user?.fullName || ""}
        years={years}
        staffUsers={staffUsers}
        roles={roles}
      />
    </div>
  )
}
`;
fs.writeFileSync('src/app/admin/weekly-reports/page.tsx', pageContent);
console.log('OK: page.tsx updated with roles');

console.log('Now building enhanced client...');
