export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getObservationData, getObservationSlots } from "@/app/teacher/du-gio/actions"
import { AdminTongHopClient } from "./client"
import { prisma } from "@/lib/db"
import { hasModulePermission } from "@/lib/permissions"

export default async function AdminTongHopPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  let session: any = null
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth error in AdminTongHopPage:", e)
  }

  if (!session?.user) {
    redirect("/login")
  }

  // Get user role directly from DB or session
  let roleCode = (session.user as any)?.role || "ADMIN"
  if (session.user.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    }).catch(() => null)
    if (dbUser?.role) {
      roleCode = dbUser.role
    }
  }

  const isSuperAdmin = roleCode === "ADMIN" || roleCode === "Admin" || roleCode === "SUPER_ADMIN" || (session.user as any)?.role === "ADMIN"

  const hasTongHopPerm = await hasModulePermission(roleCode, [
    "TONG_HOP_DU_GIO",
    "TONG_HOP_DU_GIO_K12",
    "TONG_HOP_DU_GIO_MN",
    "TONG_HOP_DU_GIO_DIEU_HANH",
    "DU_GIO_K12",
    "DU_GIO_MAM_NON",
    "DU_GIO_GVNN",
    "XET_DUYET_DANH_GIA_LAI"
  ])

  const currentTeacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    select: { position: true, departmentId: true, departmentAssignments: true }
  }).catch(() => null)

  const isTTCM = currentTeacher?.position === "TTCM" || (currentTeacher?.departmentAssignments || []).some((da: any) => da.position === "TTCM")
  const isBGHMN = ["BGH_MN", "BGH MN", "BGHMN"].includes(roleCode)
  const isGDCS = ["GDCS", "GĐCS", "GD_CS", "GĐ_CS", "GIAO_VU_CS"].includes(roleCode)

  if (!isSuperAdmin && !isTTCM && !isBGHMN && !isGDCS && !hasTongHopPerm) {
    return (
      <div className="p-6 text-red-500 font-bold text-xs font-semibold">
        Bạn không có quyền truy cập trang này.
      </div>
    )
  }

  const searchParams = await props.searchParams
  const academicYearId = searchParams.academicYearId || undefined
  const level = searchParams.level || "all"
  const grade = searchParams.grade || "all"
  const period = searchParams.period || "all"
  const date = searchParams.date || ""
  const campusId = searchParams.campusId || "all"
  const deptId = searchParams.deptId || "all"

  const refDataResult = await getObservationData(academicYearId)
  if (!refDataResult.success) {
    return (
      <div className="p-6 text-red-500 font-bold text-xs font-semibold">
        Error: {refDataResult.error || "Failed to load reference data."}
      </div>
    )
  }

  const slotsResult = await getObservationSlots({
    academicYearId,
    level,
    grade,
    period,
    date,
    campusId,
    deptId
  })

  return (
    <AdminTongHopClient
      initialSlots={slotsResult.success ? (slotsResult.slots || []) : []}
      currentTeacher={refDataResult.currentTeacher}
      subjects={refDataResult.subjects || []}
      departments={refDataResult.departments || []}
      teachers={refDataResult.teachers || []}
      campuses={refDataResult.campuses || []}
      classes={refDataResult.classes || []}
      initialFilters={{ level, grade, period, date, campusId, deptId, academicYearId }}
      isTTCM={isTTCM}
      isSuperAdmin={isSuperAdmin}
      isGDCS={isGDCS}
      academicYears={refDataResult.academicYears || []}
      selectedYearId={refDataResult.selectedYearId || undefined}
    />
  )
}
