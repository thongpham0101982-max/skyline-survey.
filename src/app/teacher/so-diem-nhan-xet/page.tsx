import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { resolveAccountGradebookScope } from "@/lib/gradebook/subjectPermissions"
import { DiemNhanXetTeacherClient } from "./client"
import { Suspense } from "react"

export const metadata = {
  title: "Sổ điểm Vnedu - Giáo viên Bộ môn",
}

export default async function TeacherDiemNhanXetPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id
  const userRole = (session?.user as any)?.role

  const [teacher, academicYears] = await Promise.all([
    userId ? prisma.teacher.findUnique({ where: { userId } }) : Promise.resolve(null),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" } })
  ])
  const activeYear = academicYears.find(y => y.status === "ACTIVE") || academicYears[0]
  const scope = await resolveAccountGradebookScope(userId, userRole, activeYear?.id)

  let assignments: any[] = []
  if (teacher) {
    assignments = await prisma.teachingAssignment.findMany({
      where: activeYear ? { teacherId: teacher.id, academicYearId: activeYear.id } : { teacherId: teacher.id },
      include: { class: true, subject: true }
    })
  }

  const classMap = new Map()
  const subjectMap = new Map()
  if (assignments.length > 0) {
    assignments.forEach(a => {
      if (a.class) classMap.set(a.class.id, a.class)
      if (a.subject) subjectMap.set(a.subject.id, a.subject)
    })
  }

  if (scope.hasExplicitSubjectAssignment && scope.assignedSubjects.length > 0) {
    scope.assignedSubjects.forEach(s => {
      if (!subjectMap.has(s.id)) {
        subjectMap.set(s.id, s)
      }
    })
    if (classMap.size === 0) {
      const allClasses = await prisma.class.findMany({
        where: { status: "ACTIVE", ...(activeYear ? { academicYearId: activeYear.id } : {}) },
        orderBy: { className: "asc" }
      })
      allClasses.forEach(c => classMap.set(c.id, c))
    }
  }

  const classes = Array.from(classMap.values())
  const subjects = Array.from(subjectMap.values())

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Đang tải dữ liệu Sổ điểm & Nhận xét...</div>}>
      <DiemNhanXetTeacherClient
        academicYears={JSON.parse(JSON.stringify(academicYears))}
        activeYearId={activeYear?.id || ""}
        initialAssignments={JSON.parse(JSON.stringify(assignments))}
        initialClasses={JSON.parse(JSON.stringify(classes))}
        initialSubjects={JSON.parse(JSON.stringify(subjects))}
        teacherName={teacher?.teacherName || session?.user?.name || "Giáo viên"}
      />
    </Suspense>
  )
}
