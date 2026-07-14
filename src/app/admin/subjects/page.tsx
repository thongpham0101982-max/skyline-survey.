import { prisma } from "@/lib/db"
import { SubjectsClient } from "./client"

export const metadata = { title: "Quan ly mon hoc | Admin Portal" }
export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  const subjects = await prisma.subject.findMany({
    orderBy: { subjectCode: 'asc' },
    include: {
      quotas: true,
      parentSubject: { select: { id: true, subjectName: true, subjectCode: true } },
      subSubjects: { select: { id: true, subjectName: true, subjectCode: true } }
    }
  })

  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: 'desc' },
    select: { id: true, name: true, status: true, isOff: true }
  })

  const defaultYearId = years.find(y => y.status === "ACTIVE" && !y.isOff)?.id || years.find(y => !y.isOff)?.id || years[0]?.id || ""

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Quan ly mon hoc</h1>
        <p className="text-slate-500 mt-1">Them moi, sua va quan ly danh sach mon hoc trong truong.</p>
      </div>
      <SubjectsClient initialSubjects={subjects} years={years} defaultYearId={defaultYearId} />
    </div>
  )
}
