export const dynamic = "force-dynamic"
export const revalidate = 0

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { OrientationTeacherClient } from "./client"

export const metadata = {
  title: "Sổ theo dõi Hướng nghiệp - Giáo viên Chủ nhiệm (GVCN) & Giáo viên Bộ môn (GVBM)",
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

  let classes: any[] = []
  let subjects: any[] = []

  if (teacher) {
    // Query both Homeroom classes (GVCN) & Teaching Assignment classes (GVBM)
    const rawClasses = await prisma.class.findMany({
      where: {
        OR: [
          { homeroomTeacherId: teacher.id },
          { homeroomTeacherId: { contains: teacher.id } },
          { teachers: { some: { teacherId: teacher.id } } },
          { teachingAssignments: { some: { teacherId: teacher.id } } }
        ]
      },
      include: {
        campus: true,
        academicYear: true
      },
      orderBy: { className: "asc" }
    })

    classes = rawClasses.map(c => ({
      ...c,
      isHomeroom: c.homeroomTeacherId === teacher.id || 
                  (c.homeroomTeacherId ? c.homeroomTeacherId.includes(teacher.id) : false)
    }))

    const assignments = await prisma.teachingAssignment.findMany({
      where: { teacherId: teacher.id },
      include: { subject: true }
    })
    const subjectMap = new Map()
    assignments.forEach(a => {
      if (a.subject) subjectMap.set(a.subject.id, a.subject)
    })
    subjects = Array.from(subjectMap.values())
  }

  if (classes.length === 0) {
    const rawClasses = await prisma.class.findMany({ where: { status: "ACTIVE" }, orderBy: { className: "asc" }, take: 50 })
    classes = rawClasses.map(c => ({ ...c, isHomeroom: false }))
  }

  if (subjects.length === 0) {
    subjects = await prisma.subject.findMany({ where: { status: "ACTIVE" }, orderBy: { subjectName: "asc" }, take: 20 })
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
