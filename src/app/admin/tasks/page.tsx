import { Suspense } from "react"
import { prisma } from "@/lib/db"
import { TasksClient } from "./client"
import { auth } from "@/lib/auth"
import { getOperationalScope } from "@/lib/session"
import {
  ensureQaWorkspaceSchema,
  getQaMetadataMapForTasks,
  getRecentQaReminders,
} from "@/lib/qa-workspace/schemaInit"
import {
  computeTaskDeadlineStatus,
  computeChecklistMetrics,
} from "@/lib/qa-workspace/workflowEngine"
import { inspectConnectedSourceModules } from "@/lib/qa-workspace/sourceSyncService"
import { ensureCoordinationTables } from "@/lib/coordination/schemaInit"

export const metadata = { title: "QA Workspace | KT&ĐBCL — Điều hành Công việc | SSM Sky-Line" }
export const dynamic = "force-dynamic"

export default async function TasksPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role || "ADMIN"
  const userId = user?.id || ""

  await Promise.all([
    ensureQaWorkspaceSchema().catch(() => {}),
    ensureCoordinationTables().catch(() => {}),
  ])

  const opScope = await getOperationalScope()

  let whereClause: any = {}
  if (!opScope.isSuperAdmin && !opScope.isHeadOfAcademic) {
    if (opScope.isDirectTBP && opScope.scopedUserIds) {
      const allowedRoles = [
        ...(opScope.scopedDepartmentCodes || []),
        ...(opScope.scopedDepartments.map(d => d.name) || []),
        ...(opScope.managedDivisions || []),
      ]
      whereClause = {
        OR: [
          { assignedToUserId: { in: opScope.scopedUserIds } },
          { assignedById: userId },
          { collaborators: { contains: userId } },
          { assignedToRole: { in: allowedRoles }, assignedToUserId: null },
        ],
      }
    } else if (opScope.isDirectTTCM && opScope.scopedUserIds) {
      const allowedRoles = [
        ...(opScope.scopedDepartmentCodes || []),
        ...(opScope.scopedDepartments.map(d => d.name) || []),
      ]
      whereClause = {
        OR: [
          { assignedToUserId: { in: opScope.scopedUserIds } },
          { assignedById: userId },
          { collaborators: { contains: userId } },
          { assignedToRole: { in: allowedRoles }, assignedToUserId: null },
        ],
      }
    } else {
      const userTeacher = await prisma.teacher.findUnique({
        where: { userId },
        select: {
          departmentRel: { select: { name: true, code: true } },
          mainSubjectRel: { select: { subjectName: true, subjectCode: true } },
        },
      })
      const deptName = userTeacher?.departmentRel?.name || ""
      const deptCode = userTeacher?.departmentRel?.code || ""
      const subjName = userTeacher?.mainSubjectRel?.subjectName || ""
      const subjCode = userTeacher?.mainSubjectRel?.subjectCode || ""

      whereClause = {
        OR: [
          { assignedToUserId: userId },
          { assignedById: userId },
          { collaborators: { contains: userId } },
          { assignedToRole: role, assignedToUserId: null },
          ...(deptName ? [{ assignedToRole: deptName, assignedToUserId: null }] : []),
          ...(deptCode ? [{ assignedToRole: deptCode, assignedToUserId: null }] : []),
          ...(subjName ? [{ assignedToRole: subjName, assignedToUserId: null }] : []),
          ...(subjCode ? [{ assignedToRole: subjCode, assignedToUserId: null }] : []),
        ],
      }
    }
  }

  // Scoped departments (Tổ chuyên môn) list — ưu tiên đưa KT&ĐBCL làm Tổ chuyên môn mặc định lên đầu
  let departmentsList: any[] = []
  if (opScope.isSuperAdmin || opScope.isHeadOfAcademic) {
    departmentsList = await prisma.department
      .findMany({
        where: { status: "ACTIVE" },
        select: { id: true, code: true, name: true, divisionCode: true },
        orderBy: { name: "asc" },
      })
      .then(depts => {
        const list =
          depts.length > 0
            ? depts.map(d => ({
                id: d.id,
                code: d.name,
                deptCode: d.code,
                name: d.name,
                divisionCode: d.divisionCode,
              }))
            : [
                {
                  code: "KT&ĐBCL",
                  deptCode: "KT-ĐBCL",
                  name: "KT&ĐBCL",
                  divisionCode: "BAN_KT_DBCL",
                },
              ]
        return list.sort((a, b) => {
          const aIsKt =
            a.name === "KT&ĐBCL" ||
            a.deptCode === "KT-ĐBCL" ||
            a.divisionCode === "BAN_KT_DBCL"
              ? -1
              : 0
          const bIsKt =
            b.name === "KT&ĐBCL" ||
            b.deptCode === "KT-ĐBCL" ||
            b.divisionCode === "BAN_KT_DBCL"
              ? -1
              : 0
          if (aIsKt !== bIsKt) return aIsKt - bIsKt
          return a.name.localeCompare(b.name, "vi")
        })
      })
  } else {
    departmentsList = opScope.scopedDepartments.map(d => ({
      code: d.name,
      deptCode: d.code,
      name: d.name,
      divisionCode: d.divisionCode,
    }))
    if (departmentsList.length === 0) {
      departmentsList = [
        {
          code: "KT&ĐBCL",
          deptCode: "KT-ĐBCL",
          name: "KT&ĐBCL",
          divisionCode: "BAN_KT_DBCL",
        },
      ]
    }
  }

  const [
    rawTasks,
    years,
    dbCategories,
    dbTaskGroups,
    allStaffUsers,
    activeDepartment,
    campuses,
    improvementActions,
    sourceModules,
    recentReminders,
  ] = await Promise.all([
    prisma.workTask.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        assignedBy: { select: { id: true, fullName: true, email: true } },
        assignedToUser: { select: { id: true, fullName: true, email: true } },
        academicYear: { select: { id: true, name: true } },
        taskGroup: { select: { id: true, name: true, leaderUserId: true } },
        comments: {
          select: {
            id: true,
            commentType: true,
            actionStatus: true,
            content: true,
            createdAt: true,
            user: { select: { id: true, fullName: true } },
          },
        },
      },
    }),
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, isOff: true },
    }),
    prisma.taskCategory.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.taskGroup.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { not: "PARENT" }, status: "ACTIVE" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        teacher: {
          select: {
            departmentRel: {
              select: { id: true, name: true, code: true, divisionCode: true },
            },
            mainSubjectRel: { select: { subjectName: true, subjectCode: true } },
          },
        },
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.department.findFirst({
      where: {
        OR: [
          { code: "KT-ĐBCL" },
          { code: "KT&ĐBCL" },
          { name: "KT&ĐBCL" },
          { code: "KT_DBCL" },
          { divisionCode: "BAN_KT_DBCL" },
        ],
      },
      select: { code: true, name: true, taskConfig: true },
    }),
    prisma.campus
      .findMany({
        select: { id: true, name: true, code: true },
        orderBy: { name: "asc" },
      })
      .catch(() => []),
    prisma.qualityImprovementAction
      .findMany({
        orderBy: { updatedAt: "desc" },
        take: 100,
      })
      .catch(() => []),
    inspectConnectedSourceModules().catch(() => []),
    getRecentQaReminders(40).catch(() => []),
  ])

  // Hydrate QA Workspace extended governance metadata & step-aware deadline statuses
  const metaMap = await getQaMetadataMapForTasks(rawTasks)
  const userLookup = new Map(allStaffUsers.map(u => [u.id, u]))

  const enrichedTasks = rawTasks.map(t => {
    const qaMeta = metaMap.get(t.id)!
    const deadlineInfo = computeTaskDeadlineStatus({
      workflowStatus: qaMeta.workflowStatus,
      endDate: t.endDate,
      reviewDueDate: qaMeta.reviewDueDate,
      completedAt: t.completedAt,
      submittedForReviewAt: qaMeta.submittedForReviewAt,
    })
    const checklistStats = computeChecklistMetrics(qaMeta.checklistJson)
    const reviewerUser = qaMeta.reviewerUserId ? userLookup.get(qaMeta.reviewerUserId) || null : null
    const coordinatorUser = qaMeta.coordinatorUserId
      ? userLookup.get(qaMeta.coordinatorUserId) || null
      : null

    return {
      ...t,
      qaMeta,
      deadlineInfo,
      checklistStats,
      reviewerUser,
      coordinatorUser,
    }
  })

  let deptSettings = null
  if (activeDepartment && activeDepartment.taskConfig) {
    try {
      deptSettings = JSON.parse(activeDepartment.taskConfig)
    } catch {}
  }

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">
          Đang tải dữ liệu QA Workspace | KT&ĐBCL...
        </div>
      }
    >
      <TasksClient
        initialTasks={JSON.parse(JSON.stringify(enrichedTasks))}
        years={years}
        roles={departmentsList}
        dbCategories={JSON.parse(JSON.stringify(dbCategories))}
        initialTaskGroups={JSON.parse(JSON.stringify(dbTaskGroups))}
        allStaffUsers={JSON.parse(JSON.stringify(allStaffUsers))}
        currentRole={role}
        currentUserId={userId}
        operationalScope={JSON.parse(JSON.stringify(opScope))}
        initialDepartmentSettings={deptSettings}
        campuses={JSON.parse(JSON.stringify(campuses))}
        initialImprovementActions={JSON.parse(JSON.stringify(improvementActions))}
        initialSourceModules={JSON.parse(JSON.stringify(sourceModules))}
        initialRecentReminders={JSON.parse(JSON.stringify(recentReminders))}
      />
    </Suspense>
  )
}
