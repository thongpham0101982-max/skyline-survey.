import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { OrientationTeacherClient } from "./client"

export const metadata = {
  title: "Sổ theo dõi Hướng nghiệp - Giáo viên Bộ môn HNG & GVCN",
}

export default async function TeacherOrientationPage() {
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
  } else {
    classes = await prisma.class.findMany({ where: { status: "ACTIVE" }, orderBy: { className: "asc" } })
    subjects = await prisma.subject.findMany({ where: { status: "ACTIVE" }, orderBy: { subjectName: "asc" } })
  }

  // Ensure HNG / Hướng nghiệp subject is in subjects list
  const hasHNG = subjects.some(s => (s.subjectCode || "").toUpperCase().includes("HNG") || (s.subjectName || "").includes("Hướng nghiệp"))
  if (!hasHNG) {
    const hngSub = await prisma.subject.findFirst({
      where: {
        OR: [
          { subjectCode: { contains: "HNG" } },
          { subjectName: { contains: "Hướng nghiệp" } }
        ]
      }
    })
    if (hngSub) {
      subjects.unshift(hngSub)
    } else {
      subjects.unshift({ id: "sub-hng-default", subjectCode: "HNG", subjectName: "Hướng nghiệp" })
    }
  }

  return (
    <OrientationTeacherClient
      academicYears={JSON.parse(JSON.stringify(academicYears))}
      activeYearId={activeYear?.id || ""}
      initialClasses={JSON.parse(JSON.stringify(classes))}
      initialSubjects={JSON.parse(JSON.stringify(subjects))}
      teacherName={teacher?.teacherName || session?.user?.name || "Giáo viên"}
      teacherId={teacher?.id || ""}
    />
  )
}
