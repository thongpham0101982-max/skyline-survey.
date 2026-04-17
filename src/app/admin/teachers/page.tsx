import { prisma } from "@/lib/db"
import { TeacherManagerClient } from "./client"

export const metadata = { title: "Quản lý Giáo viên | Cổng Quản trị" }

export default async function TeacherManagerPage() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true }
  })
  const defaultYearId = years.find(y => y.status === "ACTIVE")?.id || years[0]?.id || null

  // Danh sach To chuyen mon
  const departments = await prisma.department.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" },
    select: { id: true, code: true, name: true }
  })

  // Danh sach Mon hoc tu module Quan ly mon hoc
  const subjects = await prisma.subject.findMany({
    where: { status: "ACTIVE" },
    orderBy: { subjectName: "asc" },
    select: { id: true, subjectCode: true, subjectName: true }
  })

  // Query teachers with FK joins for department and subject names
  const rawTeachers = await prisma.teacher.findMany({
    orderBy: { teacherName: "asc" },
    include: {
      user: { select: { email: true, status: true } },
      departmentRel: { select: { name: true } },
      mainSubjectRel: { select: { subjectName: true } },
    }
  })

  const classes = await prisma.class.findMany({
    orderBy: [{ academicYear: { startDate: "desc" } }, { className: "asc" }],
    include: {
      academicYear: { select: { id: true, name: true } },
      campus: { select: { campusName: true } }
    }
  })

  const homeroomAssignments = await prisma.$queryRaw`
    SELECT id as classId, homeroomTeacherId, className FROM Class WHERE homeroomTeacherId IS NOT NULL
  ` as { classId: string, homeroomTeacherId: string, className: string }[]

  const classHomeroomMap = new Map(homeroomAssignments.map(a => [a.homeroomTeacherId, a]))

  const teachers = rawTeachers.map(t => ({
    id: t.id,
    teacherCode: t.teacherCode,
    teacherName: t.teacherName,
    dateOfBirth: t.dateOfBirth || null,
    // Display name from FK relation (preferred) or legacy string field
    department: t.departmentRel?.name || null,
    departmentId: t.departmentId || null,
    mainSubject: t.mainSubjectRel?.subjectName || null,
    mainSubjectId: t.mainSubjectId || null,
    homeroomClass: t.homeroomClass || null,
    homeroomClassId: classHomeroomMap.get(t.id)?.classId || null,
    email: t.email || null,
    phone: t.phone || null,
    status: t.status,
    user: { email: t.user?.email || t.teacherCode, status: t.user?.status || "ACTIVE" }
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quản lý Giáo viên</h1>
        <p className="text-slate-500 mt-2 text-sm">Thêm, chỉnh sửa thông tin giáo viên và phân công Tổ chuyên môn.</p>
      </div>
      <TeacherManagerClient
        initialTeachers={teachers}
        years={years}
        defaultYearId={defaultYearId}
        classes={classes}
        departments={departments}
        subjects={subjects}
      />
    </div>
  )
}

