import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { WeeklyReportClient } from "./client"

export const metadata = { title: "Báo cáo Tuần | SQMS" }
export const dynamic = "force-dynamic"

export default async function WeeklyReportsPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role || "ADMIN"
  const userId = user?.id || ""



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
