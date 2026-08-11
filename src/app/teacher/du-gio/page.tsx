import { cookies } from "next/headers"
import { Suspense } from "react"
export const dynamic = "force-dynamic"
export const revalidate = 0
export const fetchCache = "force-no-store"
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
      <Suspense fallback={
        <div className="flex items-center justify-center p-12 bg-white rounded-3xl border border-slate-100 shadow-sm my-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00A99D] mx-auto mb-3"></div>
          <p className="text-xs font-bold text-slate-600">Đang tải không gian làm việc Dự giờ...</p>
        </div>
      }>
        <ObservationClient
          initialSlots={slotsResult.success ? (slotsResult.slots || []) : []}
          currentTeacher={refDataResult.currentTeacher || null}
          subjects={refDataResult.subjects || []}
          departments={refDataResult.departments || []}
          teachers={refDataResult.teachers || []}
          campuses={refDataResult.campuses || []}
          classes={refDataResult.classes || []}
          initialFilters={{ level, grade, period, date, campusId, deptId, academicYearId }}
          academicYears={refDataResult.academicYears || []}
          selectedYearId={refDataResult.selectedYearId || undefined}
        />
      </Suspense>
    )
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("Error loading ObservationPage:", err);
    return (
      <Suspense fallback={
        <div className="p-6 text-center text-xs font-bold text-slate-500">Đang tải...</div>
      }>
        <ObservationClient
          initialSlots={[]}
          currentTeacher={null}
          subjects={[]}
          departments={[]}
          teachers={[]}
          campuses={[]}
          classes={[]}
          initialFilters={{ level: "all", grade: "all", period: "all", date: "", campusId: "all", deptId: "all" }}
          academicYears={[]}
        />
      </Suspense>
    )
  }
}
