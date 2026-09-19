import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TeacherSupportClient } from "./client"
import { getDefaultAcademicYear } from "@/lib/academicYear"

export const dynamic = "force-dynamic"

export default async function TeacherSupportPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id },
    include: {
      departmentRel: true
    }
  })
  if (!teacher) {
    return (
      <div className="p-8 text-center text-rose-500 font-bold">
        Hồ sơ Giáo viên không tồn tại trên hệ thống.
      </div>
    )
  }

  // Parallelize defaultYear and allYears
  const [defaultYear, allYears] = await Promise.all([
    getDefaultAcademicYear(prisma),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" } })
  ])
  const academicYears = defaultYear
    ? [defaultYear, ...allYears.filter(y => y.id !== defaultYear.id)]
    : allYears

  const activeYearId = defaultYear?.id || academicYears[0]?.id

  // Parallelize homeroom classes, teaching assignments, and subjects
  const [homeroomClasses, teachingAssignments, subjects] = await Promise.all([
    prisma.class.findMany({
      where: {
        academicYearId: activeYearId,
        OR: [
          { homeroomTeacherId: teacher.id },
          { homeroomTeacherId: { contains: teacher.id } }
        ]
      },
      select: {
        id: true,
        className: true,
        students: {
          where: {
            academicYearId: activeYearId,
            NOT: {
              studentCode: { startsWith: "2" }
            }
          },
          select: {
            id: true,
            studentName: true,
            studentCode: true
          }
        }
      },
      orderBy: { className: "asc" }
    }),
    prisma.teachingAssignment.findMany({
      where: {
        teacherId: teacher.id,
        academicYearId: activeYearId
      },
      include: {
        class: {
          select: {
            id: true,
            className: true,
            educationSystem: true,
            students: {
              select: {
                id: true,
                studentName: true,
                studentCode: true
              }
            }
          }
        },
        subject: true
      }
    }),
    prisma.subject.findMany({
      where: { status: "ACTIVE" },
      orderBy: { subjectName: "asc" }
    })
  ])

  // Build unified assigned classes (both homeroom and teaching assignments)
  const classMap = new Map()
  homeroomClasses.forEach(c => {
    classMap.set(c.id, {
      id: c.id,
      className: c.className,
      isHomeroom: true,
      students: c.students,
      subjects: []
    })
  })
  teachingAssignments.forEach(ta => {
    if (ta.class) {
      const existing = classMap.get(ta.classId)
      if (existing) {
        if (ta.subject && !existing.subjects.some((s: any) => s.id === ta.subject.id)) {
          existing.subjects.push(ta.subject)
        }
      } else {
        classMap.set(ta.classId, {
          id: ta.class.id,
          className: ta.class.className,
          isHomeroom: false,
          educationSystem: ta.class.educationSystem,
          students: ta.class.students,
          subjects: ta.subject ? [ta.subject] : []
        })
      }
    }
  })

  const initialAssignedClasses = Array.from(classMap.values())

  // Subjects already loaded in Promise.all above

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <TeacherSupportClient
        teacher={teacher}
        academicYears={academicYears}
        homeroomClasses={homeroomClasses}
        initialAssignedClasses={initialAssignedClasses}
        subjects={subjects}
      />
    </div>
  )
}
