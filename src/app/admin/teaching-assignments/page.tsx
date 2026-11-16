"use server"
import { prisma } from "@/lib/db"
import { ensureTimetableSchema } from "@/lib/timetable/schemaInit"
import { resolveTeacherGroup } from "@/lib/timetable/teacherGroupHelper"
import { TeachingClient } from "./client"

export default async function TeachingAssignmentsPage() {
  await ensureTimetableSchema().catch(() => {})

  const [
    rawTeachers,
    teacherGroupRows,
    years,
    campuses,
    departments,
    subjects,
    assignments,
    taMetaRows
  ] = await Promise.all([
    prisma.teacher.findMany({
      orderBy: { teacherName: 'asc' },
      include: {
        departmentRel: true,
        campus: true,
        departmentAssignments: { select: { departmentId: true } },
      }
    }),
    (prisma as any)
      .$queryRawUnsafe(`SELECT "id", "teacherGroup" FROM "Teacher"`)
      .catch(() => [] as Array<{ id: string; teacherGroup?: string | null }>),
    prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: 'asc' }
    }),
    prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: 'asc' }
    }),
    prisma.subject.findMany({
      where: { OR: [{ category: null }, { NOT: { category: "KSDV" } }] },
      orderBy: { subjectName: 'asc' }
    }),
    prisma.teachingAssignment.findMany({
      include: {
        subject: true,
        class: true
      }
    }),
    (prisma as any)
      .$queryRawUnsafe(`SELECT "id", "weeklyPeriods", "teacherRole" FROM "TeachingAssignment"`)
      .catch(() => [] as Array<{ id: string; weeklyPeriods?: number | null; teacherRole?: string | null }>)
  ])

  const groupById = new Map<string, string>()
  for (const r of teacherGroupRows || []) {
    if (r?.id) groupById.set(String(r.id), String(r.teacherGroup || ""))
  }

  const teachers = rawTeachers.map((t: any) => ({
    ...t,
    teacherGroup: resolveTeacherGroup({
      teacherGroup: groupById.get(t.id),
      teacherName: t.teacherName
    })
  }))

  const teacherGroupLookup = new Map(teachers.map((t: any) => [t.id, t.teacherGroup]))
  const taMetaMap = new Map<string, { weeklyPeriods: number | null; teacherRole: string | null }>()
  for (const m of taMetaRows || []) {
    if (m?.id) {
      taMetaMap.set(String(m.id), {
        weeklyPeriods:
          m.weeklyPeriods !== null && m.weeklyPeriods !== undefined ? Number(m.weeklyPeriods) : null,
        teacherRole: m.teacherRole ? String(m.teacherRole) : null
      })
    }
  }

  const activeYear = years.find(y => y.status === "ACTIVE" && !y.isOff) || years[0]
  const rawClasses = await prisma.class.findMany({ 
    where: { status: "ACTIVE", ...(activeYear ? { academicYearId: activeYear.id } : {}) },
    orderBy: { className: 'asc' } 
  })
  const classes = rawClasses.map(c => {
    const lvl = (c.level || "").toLowerCase().trim();
    if (["nhà trẻ", "mẫu giáo bé", "mẫu giáo nhỡ", "mẫu giáo lớn", "mầm non", "mam non"].includes(lvl)) {
      return { ...c, level: "Mầm non" }
    }
    return c;
  })

  // Format assignments for easy consumption
  const formattedAssignments = assignments
    .filter(a => a.class && a.subject)
    .map(a => {
      const meta = taMetaMap.get(a.id)
      const role = meta?.teacherRole || teacherGroupLookup.get(a.teacherId) || "GVVN"
      return {
        id: a.id,
        teacherId: a.teacherId,
        classId: a.classId,
        className: a.class.className,
        subjectId: a.subjectId,
        subjectCode: a.subject.subjectCode || "",
        subjectName: a.subject.subjectName,
        academicYearId: a.academicYearId,
        semester: a.semester,
        weeklyPeriods: meta?.weeklyPeriods ?? null,
        teacherRole: role
      }
    })

  return (
    <div className="space-y-6">
      <div className="mb-2 border-l-4 border-[#003B3A] pl-3.5">
        <h1 className="text-2xl font-bold text-[#003B3A]">Phân công giảng dạy</h1>
        <p className="text-slate-500 text-sm mt-1">
          Quản lý phân công môn học, lớp học, cơ cấu tiết GVVN / GVNN (ESL &amp; Song ngữ) và đồng bộ trực tiếp sang Thời khóa biểu.
        </p>
      </div>
      <TeachingClient 
        teachers={teachers} 
        classes={classes} 
        subjects={subjects} 
        years={years}
        departments={departments}
        campuses={campuses}
        initialAssignments={formattedAssignments}
      />
    </div>
  )
}
