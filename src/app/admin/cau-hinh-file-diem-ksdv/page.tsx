import { getDefaultAcademicYear } from "@/lib/academicYear"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { CauHinhFileDiemKsdvClient } from "./client"

export const metadata = { title: "Cấu hình File điểm khảo sát đầu vào | Admin" }
export const dynamic = "force-dynamic"

export default async function CauHinhFileDiemKsdvPage() {
  let session: any = null
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth error:", e)
  }

  const user = session?.user as any

  let academicYears: any[] = []
  let activeYearId = ""
  let subjects: any[] = []
  let eduSystems: any[] = []
  let periods: any[] = []
  let campuses: any[] = []

  const gradesK12 = [
    "Khối 1", "Khối 2", "Khối 3", "Khối 4", "Khối 5",
    "Khối 6", "Khối 7", "Khối 8", "Khối 9",
    "Khối 10", "Khối 11", "Khối 12"
  ]

  try {
    const pAny = prisma as any
    if (pAny) {
      const [
        yearsResult,
        activeYearResult,
        subjectsResult,
        systemsResult,
        periodsResult,
        campusesResult
      ] = await Promise.all([
        pAny.academicYear ? pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []) : [],
        pAny.academicYear ? getDefaultAcademicYear(pAny).catch(() => null) : null,
        pAny.assessmentSubject ? pAny.assessmentSubject.findMany({
          where: { status: "ACTIVE" },
          orderBy: { sortOrder: "asc" }
        }).catch(() => []) : [],
        pAny.educationSystem ? pAny.educationSystem.findMany({
          orderBy: { createdAt: "asc" }
        }).catch(() => []) : [],
        pAny.inputAssessmentPeriod ? pAny.inputAssessmentPeriod.findMany({
          orderBy: { createdAt: "desc" }
        }).catch(() => []) : [],
        pAny.campus ? pAny.campus.findMany({
          where: { status: "ACTIVE" },
          orderBy: { campusName: "asc" }
        }).catch(() => []) : []
      ])

      academicYears = yearsResult || []
      activeYearId = activeYearResult?.id || academicYears[0]?.id || ""
      subjects = subjectsResult || []
      eduSystems = systemsResult || []
      periods = periodsResult || []
      campuses = campusesResult || []
    }
  } catch (err) {
    console.error("Error fetching data for CauHinhFileDiemKsdvPage:", err)
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1700px] mx-auto">
      <CauHinhFileDiemKsdvClient
        academicYears={academicYears}
        activeYearId={activeYearId}
        subjects={subjects}
        eduSystems={eduSystems}
        periods={periods}
        grades={gradesK12}
        campuses={campuses}
        currentUser={user}
      />
    </div>
  )
}
