import { prisma } from "@/lib/db"
import { AdminClassesClient } from "./client"

export default async function AdminClassesPage() {
  const classesData = await prisma.class.findMany({
    include: {
      campus: true,
      _count: { select: { students: true } }
    },
    orderBy: [{ campus: { campusName: "asc" } }, { level: "asc" }, { grade: "asc" }, { className: "asc" }]
  })

  const teachers = await prisma.teacher.findMany({
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
    homeroomTeacher: c.homeroomTeacherId ? teacherMap[c.homeroomTeacherId] || "N/A" : "Chưa phân công"
  }))

  const campuses = await prisma.campus.findMany()
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
      />
    </div>
  )
}