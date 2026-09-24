import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DiemNhanXetTeacherClient } from "./client"
import { Suspense } from "react"

export const metadata = {
  title: "Sổ điểm / Nhận xét - Giáo viên Bộ môn",
}

export default async function TeacherDiemNhanXetPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id

  const [teacher, academicYears] = await Promise.all([
    userId ? prisma.teacher.findUnique({ where: { userId } }) : Promise.resolve(null),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" } })
  ])
  const activeYear = academicYears.find(y => y.status === "ACTIVE") || academicYears[0]

  let assignments: any[] = []
  if (teacher) {
    assignments = await prisma.teachingAssignment.findMany({
      where: activeYear ? { teacherId: teacher.id, academicYearId: activeYear.id } : { teacherId: teacher.id },
      include: { class: true, subject: true }
    })
  }

  let classes: any[] = []
  let subjects: any[] = []

  if (assignments.length > 0) {
    const classMap = new Map()
    const subjectMap = new Map()
    assignments.forEach(a => {
      if (a.class) classMap.set(a.class.id, a.class)
      if (a.subject) subjectMap.set(a.subject.id, a.subject)
    })
    classes = Array.from(classMap.values())
    subjects = Array.from(subjectMap.values())
  }
  // Strictly enforce Teaching Assignments: No fallback to all school classes/subjects

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
