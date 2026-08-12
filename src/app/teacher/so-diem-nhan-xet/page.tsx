import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { DiemNhanXetTeacherClient } from "./client"

export const metadata = {
  title: "Sổ điểm / Nhận xét - Giáo viên Bộ môn",
}

export default async function TeacherDiemNhanXetPage() {
  const session = await auth()
  const userId = (session?.user as any)?.id

  let teacher = null
  if (userId) {
    teacher = await prisma.teacher.findUnique({ where: { userId } })
  }

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })
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
    <DiemNhanXetTeacherClient
      academicYears={JSON.parse(JSON.stringify(academicYears))}
      activeYearId={activeYear?.id || ""}
      initialAssignments={JSON.parse(JSON.stringify(assignments))}
      initialClasses={JSON.parse(JSON.stringify(classes))}
      initialSubjects={JSON.parse(JSON.stringify(subjects))}
      teacherName={teacher?.teacherName || session?.user?.name || "Giáo viên"}
    />
  )
}
