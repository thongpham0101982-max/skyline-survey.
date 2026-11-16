import { prisma } from "@/lib/db"
import { SubjectsClient } from "./client"

export const metadata = { title: "Quản lý môn học | Admin Portal" }
export const dynamic = "force-dynamic";

export default async function SubjectsPage() {
  try {
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE "Subject" ADD COLUMN "isTimetableSchedulable" INTEGER NOT NULL DEFAULT 1`
    )
  } catch {
    // Column already exists
  }
  try {
    await (prisma as any).$executeRawUnsafe(
      `ALTER TABLE "SubjectQuota" ADD COLUMN "teacherSplitJson" TEXT NOT NULL DEFAULT ''`
    )
  } catch {
    // Column already exists
  }

  const [rawSubjects, schedulableRows, splitRows, years] = await Promise.all([
    prisma.subject
      .findMany({
        orderBy: { subjectCode: "asc" },
        include: {
          quotas: true,
          parentSubject: { select: { id: true, subjectName: true, subjectCode: true } },
          subSubjects: { select: { id: true, subjectName: true, subjectCode: true } },
          aliases: { select: { id: true, aliasPattern: true } }
        }
      })
      .catch(() =>
        prisma.subject.findMany({
          orderBy: { subjectCode: "asc" },
          include: {
            quotas: true,
            parentSubject: { select: { id: true, subjectName: true, subjectCode: true } },
            subSubjects: { select: { id: true, subjectName: true, subjectCode: true } }
          }
        })
      ),
    (prisma as any)
      .$queryRawUnsafe(`SELECT "id", "isTimetableSchedulable" FROM "Subject"`)
      .catch(() => [] as Array<{ id: string; isTimetableSchedulable: number }>),
    (prisma as any)
      .$queryRawUnsafe(`SELECT "id", "teacherSplitJson" FROM "SubjectQuota"`)
      .catch(() => [] as Array<{ id: string; teacherSplitJson: string }>),
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, status: true, isOff: true }
    })
  ])

  const schedMap = new Map<string, boolean>()
  if (Array.isArray(schedulableRows)) {
    for (const r of schedulableRows) {
      if (r?.id) {
        schedMap.set(String(r.id), Boolean(Number(r.isTimetableSchedulable ?? 1)))
      }
    }
  }

  const splitMap = new Map<string, string>()
  if (Array.isArray(splitRows)) {
    for (const r of splitRows) {
      if (r?.id && r.teacherSplitJson) {
        splitMap.set(String(r.id), String(r.teacherSplitJson))
      }
    }
  }

  const subjects = rawSubjects.map((s: any) => ({
    ...s,
    isTimetableSchedulable: schedMap.has(s.id) ? schedMap.get(s.id)! : true,
    quotas: Array.isArray(s.quotas)
      ? s.quotas.map((q: any) => ({
          ...q,
          teacherSplitJson: splitMap.get(q.id) || ""
        }))
      : []
  }))

  const defaultYearId =
    years.find(y => y.status === "ACTIVE" && !y.isOff)?.id ||
    years.find(y => !y.isOff)?.id ||
    years[0]?.id ||
    ""

  return (
    <SubjectsClient initialSubjects={subjects} years={years} defaultYearId={defaultYearId} />
  )
}
