import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { getAdminSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { ImportKQHTClient } from "./client"

export const metadata = { title: "Import Kết quả Học tập | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function ImportKQHTPage() {
  const session = await getAdminSession()
  if (!session) {
    redirect("/login")
  }

  let academicYears: any[] = []
  let campuses: any[] = []
  let classes: any[] = []
  let subjects: any[] = []
  let activeYear: any = null

  try {
    const pAny = prisma as any
    activeYear = await getDefaultAcademicYear(pAny)
    
    const [yearsRes, campusesRes, classesRes, subjectsRes] = await Promise.all([
      pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => []),
      pAny.campus.findMany({ where: { status: "ACTIVE" }, orderBy: { campusName: "asc" } }).catch(() => []),
      pAny.class.findMany({ where: { status: "ACTIVE" }, include: { campus: true, academicYear: true } }).catch(() => []),
      pAny.subject.findMany({ where: { status: "ACTIVE" }, orderBy: { subjectName: "asc" } }).catch(() => [])
    ])

    academicYears = yearsRes
    campuses = campusesRes
    classes = classesRes
    subjects = subjectsRes
  } catch (err) {
    console.error("Error fetching db in ImportKQHTPage:", err)
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
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Import Kết quả Học tập</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">
          Tải lên bảng điểm định kỳ từ file Excel nhiều sheet, đối khớp thông tin và cập nhật học bạ cho từng học sinh.
        </p>
      </div>
      <ImportKQHTClient
        academicYears={safeJson(academicYears)}
        campuses={safeJson(campuses)}
        classes={safeJson(classes)}
        subjects={safeJson(subjects)}
        activeYearId={activeYear ? activeYear.id : ""}
      />
    </div>
  )
}
