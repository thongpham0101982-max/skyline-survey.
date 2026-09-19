import { PageHeader } from "@/components/PageHeader"
import { prisma } from "@/lib/db"
import { AdminClassesClient } from "./client"
import { getAdminSession } from "@/lib/session"

export default async function AdminClassesPage() {
  const session = await getAdminSession()

  const [academicYears, campuses] = await Promise.all([
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
      include: { educationSystems: true }
    }),
    prisma.campus.findMany({
      where: session.isFullAccess ? {} : { id: { in: session.allowedCampusIds } }
    })
  ])

  const activeYear = academicYears.find(y => y.status === "ACTIVE" && !y.isOff) || academicYears[0]
  const classWhere = session.isFullAccess 
    ? (activeYear ? { academicYearId: activeYear.id } : {}) 
    : { campusId: { in: session.allowedCampusIds }, ...(activeYear ? { academicYearId: activeYear.id } : {}) }
  const teacherWhere = session.isFullAccess ? {} : { campusId: { in: session.allowedCampusIds } }

  const [classesData, rawTeachers] = await Promise.all([
    prisma.class.findMany({
      where: classWhere,
      include: {
        campus: true,
        _count: { select: { students: { where: { status: 'ACTIVE' } } } },
        students: {
          where: { status: 'ACTIVE' },
          select: { studentType: true }
        }
      },
      orderBy: [{ campus: { campusName: "asc" } }, { level: "asc" }, { grade: "asc" }, { className: "asc" }]
    }),
    prisma.teacher.findMany({
      where: teacherWhere,
      select: {
        id: true,
        teacherName: true,
        departmentRel: {
          select: {
            blockCM: true
          }
        }
      }
    })
  ])

  const teacherMap: Record<string, string> = {}
  rawTeachers.forEach(t => { teacherMap[t.id] = t.teacherName })

  const teachers = rawTeachers.map(t => ({
    id: t.id,
    teacherName: t.teacherName,
    blockCM: t.departmentRel?.blockCM || null
  }))

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
    chinhKhoaCount: (c.students || []).filter((s: any) => s.studentType !== 'GIAO_LUU').length,
    giaoLuuCount: (c.students || []).filter((s: any) => s.studentType === 'GIAO_LUU').length,
    homeroomTeacherId: c.homeroomTeacherId,
    homeroomTeacher: c.homeroomTeacherId 
      ? c.homeroomTeacherId.split(",").map(id => teacherMap[id.trim()]).filter(Boolean).join(", ") 
      : "Chưa phân công"
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Lớp học"
        description="Danh sách các lớp học theo từng cơ sở và niên khóa"
        breadcrumbs={[
          { label: "Cấu hình hệ thống" },
          { label: "Lớp học" }
        ]}
      />
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
