import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { StudentProfilesAdminClient } from "./client"

export const metadata = { title: "Hồ sơ Học sinh | Admin Portal" }
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function AdminStudentProfilesPage() {
  let session: any = null
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth error in AdminStudentProfilesPage:", e)
  }

  if (!session) {
    redirect("/login")
  }

  const user = session.user as any
  const ALLOWED_ROLES = ["ADMIN", "ADMINISTRATOR", "KT_DBCL", "GDCS", "GIAO_VU_CS", "GIAO_VU"]
  if (!ALLOWED_ROLES.includes(user?.role)) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl max-w-xl mx-auto mt-20 text-center">
        <h3 className="font-extrabold text-base mb-2">Quyền truy cập hạn chế</h3>
        <p className="text-xs font-semibold">Bạn không có quyền truy cập chức năng này.</p>
      </div>
    )
  }

  let academicYears: any[] = []
  let campuses: any[] = []
  let classes: any[] = []
  let activeYear: any = null

  try {
    const pAny = prisma as any
    activeYear = await getDefaultAcademicYear(pAny)
    const activeYearId = activeYear ? activeYear.id : null

    const [yearsRes, campusesRes, classesRes] = await Promise.all([
      pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []),
      pAny.campus.findMany({ where: { status: "ACTIVE" }, orderBy: { campusName: "asc" } }).catch(() => []),
      pAny.class.findMany({ where: { status: "ACTIVE" }, include: { campus: true, academicYear: true } }).catch(() => [])
    ])

    academicYears = yearsRes
    campuses = campusesRes
    classes = classesRes
  } catch (err) {
    console.error("Error fetching db in AdminStudentProfilesPage:", err)
  }

  const safeJson = (data: any) => {
    try {
      if (!data) return []
      return JSON.parse(JSON.stringify(data))
    } catch (e) {
      return []
    }
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hồ sơ Học sinh Toàn trường</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">
          Xem và xuất bản hồ sơ CV năng lực chuẩn quốc tế cho học sinh tất cả các lớp, khối và cơ sở.
        </p>
      </div>
      <StudentProfilesAdminClient
        academicYears={safeJson(academicYears)}
        campuses={safeJson(campuses)}
        classes={safeJson(classes)}
        activeYearId={activeYear ? activeYear.id : ""}
        activeYearName={activeYear ? activeYear.name : ""}
      />
    </div>
  )
}
