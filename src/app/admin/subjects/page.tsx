import { prisma } from "@/lib/db"
import { SubjectsClient } from "./client"

export const metadata = { title: "Quản lý môn học | Admin Portal" }
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
    <SubjectsClient initialSubjects={subjects} years={years} defaultYearId={defaultYearId} />
  )
}
