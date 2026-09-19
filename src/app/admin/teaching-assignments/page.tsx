"use server"
import { prisma } from "@/lib/db"
import { TeachingClient } from "./client"

export default async function TeachingAssignmentsPage() {
  // Concurrently fetch all independent datasets with Promise.all
  const [
    teachers,
    years,
    campuses,
    departments,
    subjects,
    assignments
  ] = await Promise.all([
    prisma.teacher.findMany({
      orderBy: { teacherName: 'asc' },
      include: { departmentRel: true, campus: true }
    }),
    prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: 'asc' }
    }),
    prisma.department.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: 'asc' }
    }),
    prisma.subject.findMany({ orderBy: { subjectName: 'asc' } }),
    prisma.teachingAssignment.findMany({
      include: {
        subject: true,
        class: true
      }
    })
  ])

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
    .map(a => ({
      id: a.id,
      teacherId: a.teacherId,
      classId: a.classId,
      className: a.class.className,
      subjectId: a.subjectId,
      subjectName: a.subject.subjectName,
      academicYearId: a.academicYearId,
      semester: a.semester
    }))

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900">Phân công giảng dạy</h1>
        <p className="text-slate-500 mt-1">Quản lý phân công môn học, lớp học và học kỳ cho Giáo viên.</p>
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
