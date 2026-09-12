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
      />
    </Suspense>
  )
}
