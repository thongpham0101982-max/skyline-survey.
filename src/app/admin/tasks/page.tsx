import { Suspense } from "react"
import { prisma } from "@/lib/db"
import { TasksClient } from "./client"
import { auth } from "@/lib/auth"
import { checkAndNotifyOverdueTasks, checkAndNotifyUpcomingTasks } from "./actions"

export const metadata = { title: "Điều hành Công việc | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function TasksPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role || "ADMIN"
  const userId = user?.id || ""

  await Promise.all([
    checkAndNotifyOverdueTasks().catch(() => {}),
    checkAndNotifyUpcomingTasks().catch(() => {})
  ])

  let whereClause: any = {}
  if (role !== "ADMIN") {
    const userTeacher = await prisma.teacher.findUnique({
      where: { userId },
      select: {
        departmentRel: { select: { name: true, code: true } },
        mainSubjectRel: { select: { subjectName: true, subjectCode: true } }
      }
    });
    const deptName = userTeacher?.departmentRel?.name || "";
    const deptCode = userTeacher?.departmentRel?.code || "";
    const subjName = userTeacher?.mainSubjectRel?.subjectName || "";
    const subjCode = userTeacher?.mainSubjectRel?.subjectCode || "";

    whereClause = {
      OR: [
        { assignedToUserId: userId },
        { collaborators: { contains: userId } },
        { assignedToRole: role, assignedToUserId: null },
        ...(deptName ? [{ assignedToRole: deptName, assignedToUserId: null }] : []),
        ...(deptCode ? [{ assignedToRole: deptCode, assignedToUserId: null }] : []),
        ...(subjName ? [{ assignedToRole: subjName, assignedToUserId: null }] : []),
        ...(subjCode ? [{ assignedToRole: subjCode, assignedToUserId: null }] : [])
      ]
    }
  }

  const [tasks, years, departments, initialDbCategories] = await Promise.all([
    prisma.workTask.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        assignedBy: { select: { id: true, fullName: true, email: true } },
        assignedToUser: { select: { id: true, fullName: true, email: true } },
        academicYear: { select: { id: true, name: true } }
      }
    }),
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, isOff: true }
    }),
    prisma.department.findMany({
      select: { code: true, name: true }
    }).then(depts => depts.length > 0 ? depts.map(d => ({ code: d.name, name: d.name })) : [{ code: "KT&ĐBCL", name: "KT&ĐBCL" }]),
    prisma.taskCategory.findMany({
      orderBy: { name: "asc" }
    })
  ])

  let dbCategories = initialDbCategories;
  if (dbCategories.length === 0) {
    const defaultCats = [
      { name: "Khảo Sát", assignedToRole: "KT&ĐBCL" },
      { name: "Đào Tạo", assignedToRole: "KT&ĐBCL" },
      { name: "Hệ Thống", assignedToRole: "KT&ĐBCL" },
      { name: "Nhân Sự", assignedToRole: "KT&ĐBCL" },
      { name: "Khác", assignedToRole: "KT&ĐBCL" },
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
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Đang tải dữ liệu Điều hành Công việc...</div>}>
      <TasksClient
        initialTasks={JSON.parse(JSON.stringify(tasks))}
        years={years}
        roles={departments}
        dbCategories={JSON.parse(JSON.stringify(dbCategories))}
        currentRole={role}
        currentUserId={userId}
      />
    </Suspense>
  )
}
