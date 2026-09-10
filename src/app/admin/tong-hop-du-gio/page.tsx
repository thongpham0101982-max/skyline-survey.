// @ts-nocheck
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getObservationData, getObservationSlots } from "@/app/teacher/du-gio/actions"
import { AdminTongHopClient } from "./client"
import { prisma } from "@/lib/db"
import { hasModulePermission } from "@/lib/permissions"

import { getAdminSession } from "@/lib/session"

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

  const adminSession = await getAdminSession()
  const { isSuperAdmin, isHeadOfAcademic, isTBP, isTTCM, isGDCS, role } = adminSession
  const roleCode = role || "ADMIN"

  const hasTongHopPerm = await hasModulePermission(roleCode, [
    "TONG_HOP_DU_GIO",
    "TONG_HOP_DU_GIO_K12",
    "TONG_HOP_DU_GIO_MN",
    "TONG_HOP_DU_GIO_DIEU_HANH",
    "MA_TRAN_DU_GIO_TTCM",
    "DU_GIO_K12",
    "DU_GIO_MAM_NON",
    "DU_GIO_GVNN",
    "XET_DUYET_DANH_GIA_LAI"
  ])

  const isBGHMN = ["BGH_MN", "BGH MN", "BGHMN"].includes(roleCode)

  if (!isSuperAdmin && !isHeadOfAcademic && !isTBP && !isTTCM && !isBGHMN && !isGDCS && !hasTongHopPerm) {
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
  const divisionCode = searchParams.divisionCode || "all"
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
    divisionCode,
    deptId
  })

  return (
    <AdminTongHopClient
      initialSlots={slotsResult.success ? (slotsResult.slots || []) : []}
      currentTeacher={refDataResult.currentTeacher}
      subjects={refDataResult.subjects || []}
      departments={refDataResult.departments || []}
      divisions={refDataResult.divisions || []}
      teachers={refDataResult.teachers || []}
      campuses={refDataResult.campuses || []}
      classes={refDataResult.classes || []}
      initialFilters={{ level, grade, period, date, campusId, divisionCode, deptId, academicYearId }}
      isTTCM={isTTCM}
      isSuperAdmin={isSuperAdmin}
      isHeadOfAcademic={isHeadOfAcademic}
      isTBP={isTBP}
      isGDCS={isGDCS}
      academicYears={refDataResult.academicYears || []}
      selectedYearId={refDataResult.selectedYearId || undefined}
    />
  )
}
