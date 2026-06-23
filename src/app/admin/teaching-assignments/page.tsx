"use server"
import { prisma } from "@/lib/db"
import { TeachingClient } from "./client"

export default async function TeachingAssignmentsPage() {
  const rawTeachers = await prisma.teacher.findMany({
    orderBy: { teacherName: 'asc' },
    include: { departmentRel: true }
  })
  const teachers = rawTeachers.filter(t => {
    const block = (t.departmentRel?.blockCM || "").toLowerCase().trim();
    return block !== "mầm non" && block !== "mam non";
  })

  const rawClasses = await prisma.class.findMany({ orderBy: { className: 'asc' } })
  const classes = rawClasses.filter(c => {
    const lvl = (c.level || "").toLowerCase().trim();
    return !["nhà trẻ", "mẫu giáo bé", "mẫu giáo nhỡ", "mẫu giáo lớn", "mầm non", "mam non"].includes(lvl);
  })
  const departments = await prisma.department.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: 'asc' }
  })
  const subjects = await prisma.subject.findMany({ orderBy: { subjectName: 'asc' } })
  const years = await prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } })
  
  const assignments = await prisma.teachingAssignment.findMany({
    include: {
      subject: true,
      class: true
    }
  })

  // Format assignments for easy consumption
  const formattedAssignments = assignments.map(a => ({
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
        initialAssignments={formattedAssignments}
      />
    </div>
  )
}
