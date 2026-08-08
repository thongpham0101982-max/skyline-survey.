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
  let isHomeroomTeacher = false
  let isHuongNghiepTeacher = false

  if (teacher && activeYear) {
    // Query Homeroom classes for active academic year
    const homeroomClasses = await prisma.class.findMany({
      where: {
        status: "ACTIVE",
        academicYearId: activeYear.id,
        OR: [
          { homeroomTeacherId: teacher.id },
          { homeroomTeacherId: { contains: teacher.id } }
        ]
      },
      include: {
        campus: true,
        academicYear: true
      },
      orderBy: { className: "asc" }
    })

    if (homeroomClasses.length > 0) {
      isHomeroomTeacher = true
    }

    // Query teaching assignments specifically for Hướng nghiệp / Hoạt động trải nghiệm, hướng nghiệp in active academic year
    const huongNghiepAssignments = await prisma.teachingAssignment.findMany({
      where: {
        teacherId: teacher.id,
        academicYearId: activeYear.id,
        subject: {
          OR: [
            { subjectCode: { contains: "HNG" } },
            { subjectName: { contains: "Hướng nghiệp" } },
            { subjectName: { contains: "Huong nghiep" } },
            { subjectName: { contains: "Trải nghiệm" } }
          ]
        }
      },
      include: {
        class: {
          include: {
            campus: true,
            academicYear: true
          }
        },
        subject: true
      }
    })

    if (huongNghiepAssignments.length > 0) {
      isHuongNghiepTeacher = true
    }

    const classMap = new Map()
    homeroomClasses.forEach(c => classMap.set(c.id, { ...c, isHomeroom: true }))
    huongNghiepAssignments.forEach(a => {
      if (a.class && !classMap.has(a.class.id)) {
        classMap.set(a.class.id, { ...a.class, isHomeroom: false })
      }
    })

    classes = Array.from(classMap.values())

    const subjectMap = new Map()
    huongNghiepAssignments.forEach(a => {
      if (a.subject) subjectMap.set(a.subject.id, a.subject)
    })
    subjects = Array.from(subjectMap.values())
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
      isHomeroomTeacher={isHomeroomTeacher}
      isHuongNghiepTeacher={isHuongNghiepTeacher}
    />
  )
}
