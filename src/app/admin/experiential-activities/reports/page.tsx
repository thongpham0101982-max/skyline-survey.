import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ExperientialReportsClient } from "./client"

export const metadata = { title: "Thống kê Hoạt động Trải nghiệm | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function ExperientialReportsPage() {
  let session: any = null
  try {
    session = await auth()
  } catch (e) {
    console.error("Auth error in ExperientialReportsPage:", e)
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
  let activeYear: any = null

  try {
    const pAny = prisma as any
    activeYear = await getDefaultAcademicYear(pAny)
    academicYears = await pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => [])
  } catch (err) {
    console.error("Error fetching db in ExperientialReportsPage:", err)
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
      <ExperientialReportsClient
        academicYears={safeJson(academicYears)}
        activeYearId={activeYear ? activeYear.id : ""}
        activeYearName={activeYear ? activeYear.name : ""}
      />
    </div>
  )
}
