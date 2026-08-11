import { cookies } from "next/headers"
export const dynamic = "force-dynamic"
export const revalidate = 0
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getObservationData, getObservationSlots } from "./actions"
import { ObservationClient } from "./client"

export default async function ObservationPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const session = await auth()
  if (!session) {
    redirect("/login")
  }

  const searchParams = await props.searchParams
  const cookieStore = await cookies()
  const activeYearCookie = cookieStore.get("selectedAcademicYear")?.value
  const academicYearId = searchParams.academicYearId || activeYearCookie || undefined
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
    <ObservationClient
      initialSlots={slotsResult.success ? (slotsResult.slots || []) : []}
      currentTeacher={refDataResult.currentTeacher}
      subjects={refDataResult.subjects || []}
      departments={refDataResult.departments || []}
      teachers={refDataResult.teachers || []}
      campuses={refDataResult.campuses || []}
      classes={refDataResult.classes || []}
      initialFilters={{ level, grade, period, date, campusId, deptId, academicYearId }}
      academicYears={refDataResult.academicYears || []}
      selectedYearId={refDataResult.selectedYearId || undefined}
    />
  )
}
