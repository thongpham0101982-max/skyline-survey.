import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { WeeklyReportClient } from "./client"
import { getOperationalScope } from "@/lib/session"
import { ACADEMIC_DIVISIONS } from "@/config/divisions"

export const metadata = { title: "Báo cáo Tuần | SQMS" }
export const dynamic = "force-dynamic"

export default async function WeeklyReportsPage() {
  const session = await auth()
  const user = session?.user as any
  const role = user?.role || "ADMIN"
  const userId = user?.id || ""

  const opScope = await getOperationalScope()

  // Staff query scoped by role
  let staffWhere: any = { role: { not: "PARENT" }, status: "ACTIVE" }
  if (opScope.scopedUserIds !== null) {
    staffWhere.id = { in: opScope.scopedUserIds }
  }

  // Academic years
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, isOff: true }
  })

  // Staff users query with teacher department info
  const staffUsers = await prisma.user.findMany({
    where: staffWhere,
    select: { 
      id: true, 
      fullName: true, 
      role: true, 
      email: true,
      teacher: { 
        select: { 
          id: true,
          position: true,
          email: true,
          departmentRel: {
            select: { id: true, name: true, code: true, divisionCode: true }
          },
          campus: { select: { campusName: true } }
        } 
      }
    },
    orderBy: { fullName: "asc" }
  })

  // Departments (roles) list scoped by operational scope
  let roles: any[] = []
  if (opScope.isSuperAdmin || opScope.isHeadOfAcademic) {
    const depts = await prisma.department.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, code: true, name: true, divisionCode: true },
      orderBy: { name: "asc" }
    })
    roles = depts.map(d => ({ id: d.id, code: d.code, name: d.name, divisionCode: d.divisionCode }))
  } else {
    roles = opScope.scopedDepartments.map(d => ({
      id: d.id,
      code: d.code,
      name: d.name,
      divisionCode: d.divisionCode
    }))
  }

  
  // Query current user's default department & division
  let defaultDeptId = ""
  let defaultDivisionCode = ""

  try {
    const myUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        teacher: {
          select: {
            departmentId: true,
            departmentRel: { select: { id: true, code: true, name: true, divisionCode: true } },
            departmentAssignments: {
              where: { isPrimary: true },
              select: { departmentId: true, department: { select: { id: true, code: true, name: true, divisionCode: true } } }
            }
          }
        }
      }
    })

    const primaryAssignment = myUser?.teacher?.departmentAssignments?.[0]?.department
    const primaryRel = myUser?.teacher?.departmentRel

    if (primaryAssignment) {
      defaultDeptId = primaryAssignment.id || primaryAssignment.code
      defaultDivisionCode = primaryAssignment.divisionCode || ""
    } else if (primaryRel) {
      defaultDeptId = primaryRel.id || primaryRel.code
      defaultDivisionCode = primaryRel.divisionCode || ""
    } else if (opScope.scopedDepartments && opScope.scopedDepartments.length > 0) {
      defaultDeptId = opScope.scopedDepartments[0].id || opScope.scopedDepartments[0].code
      defaultDivisionCode = opScope.scopedDepartments[0].divisionCode || ""
    } else if (roles.length > 0) {
      defaultDeptId = roles[0].id || roles[0].code
      defaultDivisionCode = roles[0].divisionCode || ""
    }
  } catch (e) {
    console.error("Error resolving default department:", e)
  }

  // Fetch taskCategories & taskGroups for Weekly Report
  const [taskCategories, taskGroups] = await Promise.all([
    prisma.taskCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.taskGroup.findMany({ orderBy: { name: "asc" } })
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
        operationalScope={JSON.parse(JSON.stringify(opScope))}
        divisions={ACADEMIC_DIVISIONS}
        defaultDeptId={defaultDeptId}
        defaultDivisionCode={defaultDivisionCode}
        taskCategories={JSON.parse(JSON.stringify(taskCategories))}
        taskGroups={JSON.parse(JSON.stringify(taskGroups))}
      />
    </Suspense>
  )
}
