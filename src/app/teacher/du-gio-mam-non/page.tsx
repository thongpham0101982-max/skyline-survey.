import { cookies } from "next/headers"
export const dynamic = "force-dynamic"
export const revalidate = 0
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getObservationData, getObservationSlots } from "@/app/teacher/du-gio/actions"
import { ObservationClient } from "@/app/teacher/du-gio/client"

export default async function PreschoolObservationPage(props: {
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
  const level = "Mầm non"
  const grade = searchParams.grade || "all"
  const period = searchParams.period || "all"
  const date = searchParams.date || ""
  const month = searchParams.month || ""
  const campusId = searchParams.campusId || "all"
  const deptId = searchParams.deptId || "all"
  const classId = searchParams.classId || "all"

  const [refDataResult, slotsResult] = await Promise.all([
    getObservationData(academicYearId),
    getObservationSlots({
      academicYearId,
      level,
      grade,
      classId,
      period,
      date,
      month,
      campusId,
      deptId
    })
  ]);

  if (!refDataResult.success) {
    return (
      <div className="p-6 text-red-500 font-bold text-xs font-semibold">
        Error: {refDataResult.error || "Failed to load reference data."}
      </div>
    )
  }

  const currentTeacherId = refDataResult.currentTeacher?.id;
  const loadedSlots = slotsResult.success ? (slotsResult.slots || []) : [];
  const myPersonalSlots = currentTeacherId
    ? loadedSlots.filter((s: any) => s.teacherId === currentTeacherId || s.registrations?.some((r: any) => r.teacherId === currentTeacherId))
    : [];

  return (
    <ObservationClient
      isPreschoolPage={true}
      initialSlots={loadedSlots}
      currentTeacher={refDataResult.currentTeacher}
      subjects={refDataResult.subjects || []}
      departments={refDataResult.departments || []}
      teachers={refDataResult.teachers || []}
      campuses={refDataResult.campuses || []}
      classes={refDataResult.classes || []}
      initialFilters={{ level, grade, classId, period, date, month, campusId, deptId, academicYearId }}
      academicYears={refDataResult.academicYears || []}
      selectedYearId={refDataResult.selectedYearId || undefined}
      initialReceivedEvaluations={refDataResult.myReceivedEvaluations || []}
      initialPersonalSlots={myPersonalSlots}
    />
  )
}
