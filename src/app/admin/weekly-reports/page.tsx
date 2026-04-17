import { auth } from "@/lib/auth"
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
      select: { id: true, fullName: true, role: true, email: true },
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
