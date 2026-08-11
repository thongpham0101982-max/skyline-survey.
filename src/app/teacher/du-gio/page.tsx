import { cookies } from "next/headers"
export const dynamic = "force-dynamic"
export const revalidate = 0
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { isRedirectError } from "next/dist/client/components/redirect"
import { getObservationData, getObservationSlots } from "./actions"
import { ObservationClient } from "./client"

export default async function ObservationPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  let session: any = null
  try {
    session = await auth()
  } catch (err) {
    console.error("Auth fail in ObservationPage:", err)
  }

  if (!session) {
    redirect("/login")
  }

  try {
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

    const refDataResult = await getObservationData(academicYearId).catch(() => ({ success: false }))
    const slotsResult = await getObservationSlots({
      academicYearId,
      level,
      grade,
      period,
      date,
      campusId,
      deptId
    }).catch(() => ({ success: false, slots: [] }))

    return (
      <ObservationClient
        initialSlots={slotsResult.success ? (slotsResult.slots || []) : []}
        currentTeacher={refDataResult.currentTeacher || null}
        teacherTimetableSlots={refDataResult.teacherTimetableSlots || []}
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
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("Error loading ObservationPage:", err);
    return (
      <ObservationClient
        initialSlots={[]}
        currentTeacher={null}
        teacherTimetableSlots={[]}
        subjects={[]}
        departments={[]}
        teachers={[]}
        campuses={[]}
        classes={[]}
        initialFilters={{ level: "all", grade: "all", period: "all", date: "", campusId: "all", deptId: "all" }}
        academicYears={[]}
      />
    )
  }
}
