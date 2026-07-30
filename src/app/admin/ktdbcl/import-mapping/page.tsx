import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { getAdminSession } from "@/lib/session"
import { redirect } from "next/navigation"
import { ImportMappingClient } from "./client"

export const metadata = { title: "Import Ánh xạ Mã Học sinh | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function ImportMappingPage() {
  const session = await getAdminSession()
  if (!session) {
    redirect("/login")
  }

  let academicYears: any[] = []
  let activeYear: any = null

  try {
    const pAny = prisma as any
    activeYear = await getDefaultAcademicYear(pAny)
    
    academicYears = await pAny.academicYear.findMany({ orderBy: { startDate: "desc" } }).catch(() => [])
  } catch (err) {
    console.error("Error fetching db in ImportMappingPage:", err)
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
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Import Ánh xạ Mã Học sinh</h1>
        <p className="text-slate-500 mt-1 text-sm font-medium">
          Thiết lập bảng đối chiếu giữa Mã HS lưu trong hệ thống và Mã vnEdu (mã của Sở GDĐT).
        </p>
      </div>
      <ImportMappingClient
        academicYears={safeJson(academicYears)}
        activeYearId={activeYear ? activeYear.id : ""}
      />
    </div>
  )
}
