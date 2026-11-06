import { cookies } from "next/headers"
export const dynamic = "force-dynamic"
export const revalidate = 0
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getObservationData, getObservationSlots } from "@/app/teacher/du-gio/actions"
import { ObservationClient } from "@/app/teacher/du-gio/client"

export default async function AdminObservationPage(props: {
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
  const divisionCode = searchParams.divisionCode || "all"
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
      campusId,
      divisionCode,
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
    ? loadedSlots.filter((s: any) => 
        s.teacherId === currentTeacherId || 
        s.registrations?.some((r: any) => r.teacherId === currentTeacherId) ||
        (s.topic && s.topic.includes(currentTeacherId))
      )
    : [];

  const role = (session.user as any)?.role || "TEACHER";
  const upperRole = (role || "").toUpperCase().trim();
  const teacherPos = (refDataResult.currentTeacher?.position || "").toLowerCase().trim();
  const isManager = ["ADMIN", "SUPER_ADMIN", "BAN_DHCM", "BGH", "TTCM", "TPCM", "TBP", "GDCS", "TO_TRUONG"].includes(upperRole) ||
    teacherPos.includes("tổ trưởng") || teacherPos.includes("tổ phó") || teacherPos.includes("trưởng bộ phận") || teacherPos.includes("giám đốc") || teacherPos.includes("ttcm");

  const requestedMode = searchParams.mode?.toLowerCase();
  const initialViewMode = requestedMode === "personal" || requestedMode === "teacher" 
    ? "TEACHER" 
    : isManager 
    ? "ADMIN" 
    : "TEACHER";

  return (
    <ObservationClient
      isAdminPage={true}
      initialViewMode={initialViewMode}
      isPreschoolPage={false}
      initialSlots={loadedSlots}
      currentTeacher={refDataResult.currentTeacher}
      subjects={refDataResult.subjects || []}
      departments={refDataResult.departments || []}
      divisions={refDataResult.divisions || []}
      teachers={refDataResult.teachers || []}
      campuses={refDataResult.campuses || []}
      classes={refDataResult.classes || []}
      initialFilters={{ level, grade, classId, period, date, campusId, divisionCode, deptId, academicYearId }}
      academicYears={refDataResult.academicYears || []}
      selectedYearId={refDataResult.selectedYearId || undefined}
      initialReceivedEvaluations={refDataResult.myReceivedEvaluations || []}
      initialPersonalSlots={myPersonalSlots}
    />
  )
}
