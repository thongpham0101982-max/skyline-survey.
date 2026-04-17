import { prisma } from "@/lib/db"
import { TasksClient } from "./client"
import { auth } from "@/lib/auth"
import { checkAndNotifyOverdueTasks } from "./actions"

export const metadata = { title: "Dieu hanh Cong viec | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function TasksPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role || "ADMIN"
  const userId = user?.id || ""

  await checkAndNotifyOverdueTasks().catch(() => {})

  let whereClause: any = {}
  if (role !== "ADMIN") {
    // KT_DBCL and other non-admin users only see:
    // 1. Tasks assigned specifically to them (by userId)
    // 2. Tasks assigned to their role group WITHOUT a specific user (whole-group tasks)
    whereClause = {
      OR: [
        { assignedToUserId: userId },
        { assignedToRole: role, assignedToUserId: null }
      ]
    }
  }

  const [tasks, years, roles] = await Promise.all([
    prisma.workTask.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        assignedBy: { select: { fullName: true } },
        assignedToUser: { select: { id: true, fullName: true, email: true } },
        academicYear: { select: { name: true } }
      }
    }),
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true }
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
      select: { code: true, name: true }
    })
  ])

  return (
    <div className="space-y-6">
      <TasksClient
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        years={years}
        roles={roles}
        currentRole={role}
        currentUserId={userId}
      />
    </div>
  )
}
