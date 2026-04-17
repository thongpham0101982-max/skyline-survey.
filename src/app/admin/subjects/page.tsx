import { prisma } from "@/lib/db"
import { SubjectsClient } from "./client"

export const metadata = { title: "Quản lý môn học | Admin Portal" }
export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({
    orderBy: { subjectCode: 'asc' },
    include: { quotas: true }
  })

  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, status: true }
  })

  const defaultYearId = years.find(y => y.status === "ACTIVE")?.id || years[0]?.id || ""

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý môn học</h1>
        <p className="text-slate-500 mt-1">Thêm mới, sửa và quản lý danh sách môn học trong trường.</p>
      </div>
      <SubjectsClient initialSubjects={subjects} years={years} defaultYearId={defaultYearId} />
    </div>
  )
}
// trigger reload
