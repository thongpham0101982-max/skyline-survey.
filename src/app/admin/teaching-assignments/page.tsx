"use server"
import { prisma } from "@/lib/db"
import { TeachingClient } from "./client"

export default async function TeachingAssignmentsPage() {
  const teachers = await prisma.teacher.findMany({ orderBy: { teacherName: 'asc' } })
  const classes = await prisma.class.findMany({ orderBy: { className: 'asc' } })
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
        initialAssignments={formattedAssignments}
      />
    </div>
  )
}
