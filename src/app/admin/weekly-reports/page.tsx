import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { WeeklyReportClient } from "./client"
import { sendWeeklyReportEmailReminders } from "./actions"

export const metadata = { title: "Báo cáo Tuần | SQMS" }
export const dynamic = "force-dynamic"

export default async function WeeklyReportsPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role || "ADMIN"
  const userId = user?.id || ""

  // Auto trigger Thursday 14:00 reminder check if today is Thursday after 14:00
  const now = new Date()
  if (now.getDay() === 4 && now.getHours() >= 14) {
    sendWeeklyReportEmailReminders().catch(() => {})
  }

  const [years, staffUsers, roles] = await Promise.all([
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, isOff: true }
    }),
    prisma.user.findMany({
      where: { role: { not: "PARENT" }, status: "ACTIVE" },
      select: { 
        id: true, 
        fullName: true, 
        role: true, 
        email: true,
        teacher: { select: { email: true } }
      },
      orderBy: { fullName: "asc" }
    }),
    prisma.role.findMany({
      select: { code: true, name: true },
      orderBy: { name: "asc" }
    })
  ])

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">Đang tải Báo cáo Tuần...</div>}>
      <WeeklyReportClient
        currentRole={role}
        currentUserId={userId}
        currentUserName={user?.name || user?.fullName || ""}
        years={years}
        staffUsers={JSON.parse(JSON.stringify(staffUsers))}
        roles={roles}
      />
    </Suspense>
  )
}
