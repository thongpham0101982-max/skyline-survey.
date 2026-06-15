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
  const level = searchParams.level || "all"
  const subjectId = searchParams.subjectId || "all"
  const grade = searchParams.grade || "all"
  const teacherId = searchParams.teacherId || "all"
  const date = searchParams.date || ""
  const campusId = searchParams.campusId || "all"
  const deptId = searchParams.deptId || "all"

  const refDataResult = await getObservationData()
  if (!refDataResult.success) {
    return (
      <div className="p-6 text-red-500 font-bold bg-red-50 rounded-2xl border border-red-200">
        Error: {refDataResult.error || "Failed to load reference data."}
      </div>
    )
  }

  const slotsResult = await getObservationSlots({
    level,
    subjectId,
    grade,
    teacherId,
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
      initialFilters={{ level, subjectId, grade, teacherId, date, campusId, deptId }}
    />
  )
}
