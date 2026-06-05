import { Suspense } from "react"
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

  const [tasks, years, roles, initialDbCategories] = await Promise.all([
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
    }),
    prisma.taskCategory.findMany({
      orderBy: { name: "asc" }
    })
  ])

  let dbCategories = initialDbCategories;
  if (dbCategories.length === 0) {
    const defaultCats = [
      { name: "Khảo Sát", assignedToRole: "KT_DBCL" },
      { name: "Đào Tạo", assignedToRole: "KT_DBCL" },
      { name: "Hệ Thống", assignedToRole: "ADMIN" },
      { name: "Nhân Sự", assignedToRole: "ADMIN" },
      { name: "Khác", assignedToRole: "KT_DBCL" },
    ]
    try {
      await prisma.taskCategory.createMany({
        data: defaultCats
      });
      dbCategories = await prisma.taskCategory.findMany({
        orderBy: { name: "asc" }
      });
    } catch (err) {
      console.error("Auto-seeding TaskCategory failed:", err);
    }
  }

  return (
    <div className="space-y-6">
      <TasksClient
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        years={years}
        roles={roles}
        dbCategories={JSON.parse(JSON.stringify(dbCategories))}
        currentRole={role}
        currentUserId={userId}
      />
    </div>
  )
}
