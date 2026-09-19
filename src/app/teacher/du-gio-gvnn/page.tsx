import { cookies } from "next/headers"
export const dynamic = "force-dynamic"
export const revalidate = 0
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getForeignObservationData, getForeignObservationSlots } from "./actions"
import { ForeignObservationClient } from "./client"

export default async function ForeignTeacherObservationPage(props: {
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
  const campusId = searchParams.campusId || "all"
  const deptId = searchParams.deptId || "all"
  const grade = searchParams.grade || "all"
  const date = searchParams.date || ""
  const month = searchParams.month || ""

  const [refDataResult, slotsResult] = await Promise.all([
    getForeignObservationData(academicYearId),
    getForeignObservationSlots({
      academicYearId,
      campusId,
      deptId,
      grade,
      date,
      month,
      onlyMySlots: true
    })
  ])

  if (!refDataResult.success) {
    return (
      <div className="p-6 text-red-500 font-bold text-xs font-semibold">
        Error: {refDataResult.error || "Failed to load reference data."}
      </div>
    )
  }

  return (
    <ForeignObservationClient
      currentTeacher={refDataResult.currentTeacher}
      departments={refDataResult.departments || []}
      teachers={refDataResult.teachers || []}
      campuses={refDataResult.campuses || []}
      classes={refDataResult.classes || []}
      academicYears={refDataResult.academicYears || []}
      selectedYearId={refDataResult.selectedYearId || undefined}
      initialSlots={slotsResult.success ? (slotsResult.slots || []) : []}
      teacherStats={refDataResult.teacherStats}
    />
  )
}
