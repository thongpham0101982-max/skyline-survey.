import { prisma } from "@/lib/db"
import { getDefaultAcademicYear } from "@/lib/academicYear"
import { TeacherTransfersClient } from "./client"
import { getAdminSession } from "@/lib/session"

export const metadata = { title: "Kết chuyển Nhân sự | Cổng Quản trị" }

export default async function TeacherTransfersPage() {
  await getAdminSession()

  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true, isOff: true }
  })

  const activeYear = await getDefaultAcademicYear(prisma)
  const defaultYearId =
    activeYear?.id ||
    years.find(y => y.status === "ACTIVE" && !y.isOff)?.id ||
    years.find(y => !y.isOff)?.id ||
    years[0]?.id ||
    null

  // Determine a "source" year — one step before the current year
  const currentIdx = years.findIndex(y => y.id === defaultYearId)
  const sourceYearId = years[currentIdx + 1]?.id || years[0]?.id || null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Kết chuyển Nhân sự
        </h1>
        <p className="text-slate-500 mt-2 text-sm">
          Chuyển danh sách giáo viên từ năm học cũ sang năm học mới.
        </p>
      </div>
      <TeacherTransfersClient
        years={years}
        defaultFromYearId={sourceYearId}
        defaultToYearId={defaultYearId}
      />
    </div>
  )
}
