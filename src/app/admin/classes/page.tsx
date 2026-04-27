import { prisma } from "@/lib/db"
import { AdminClassesClient } from "./client"
import { getAdminSession } from "@/lib/session"

export default async function AdminClassesPage() {
  const session = await getAdminSession()

  // Filter classes based on session scope
  const classWhere = session.isFullAccess ? {} : { campusId: { in: session.allowedCampusIds } }
  const classesData = await prisma.class.findMany({
    where: classWhere,
    include: {
      campus: true,
      _count: { select: { students: true } }
    },
    orderBy: [{ campus: { campusName: "asc" } }, { level: "asc" }, { grade: "asc" }, { className: "asc" }]
  })

  // Filter teachers based on session scope (if we want to only assign teachers from same campus)
  const teacherWhere = session.isFullAccess ? {} : { campusId: { in: session.allowedCampusIds } }
  const teachers = await prisma.teacher.findMany({
    where: teacherWhere,
    select: { id: true, teacherName: true }
  })

  const teacherMap: Record<string, string> = {}
  teachers.forEach(t => { teacherMap[t.id] = t.teacherName })

  const mappedClasses = classesData.map((c, index) => ({
    stt: index + 1,
    id: c.id,
    level: c.level || "",
    grade: c.grade || c.className.split("-")[0] || "",
    className: c.className,
    classCode: c.classCode,
    campus: c.campus?.campusName || "N/A",
    campusId: c.campusId,
    academicYearId: c.academicYearId,
    educationSystem: c.educationSystem || "",
    studentCount: c._count.students,
    homeroomTeacherId: c.homeroomTeacherId,
    homeroomTeacher: c.homeroomTeacherId ? teacherMap[c.homeroomTeacherId] || "N/A" : "Chưa phân công"
  }))

  // Filter campuses based on session scope
  const campusWhere = session.isFullAccess ? {} : { id: { in: session.allowedCampusIds } }
  const campuses = await prisma.campus.findMany({
    where: campusWhere
  })

  const academicYears = await prisma.academicYear.findMany({
    where: { status: "ACTIVE" },
    include: { educationSystems: true }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quản lý Lớp học</h1>
      </div>
      <AdminClassesClient
        initialClasses={mappedClasses}
        campuses={campuses}
        academicYears={academicYears}
        teachers={teachers}
        isCampusLocked={!session.isFullAccess && session.allowedCampusIds.length === 1}
        defaultCampusId={!session.isFullAccess ? session.allowedCampusIds[0] : null}
      />
    </div>
  )
}
