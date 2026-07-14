import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { TeacherSupportClient } from "./client"

export const dynamic = "force-dynamic"

export default async function TeacherSupportPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const teacher = await prisma.teacher.findUnique({
    where: { userId: session.user.id }
  })
  if (!teacher) {
    return (
      <div className="p-8 text-center text-rose-500 font-bold">
        Hồ sơ Giáo viên không tồn tại trên hệ thống.
      </div>
    )
  }

  // Fetch academic years, campuses, classes, subjects
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  // Find all homeroom classes of this teacher
  const homeroomClasses = await prisma.class.findMany({
    where: {
      OR: [
        { homeroomTeacherId: teacher.id },
        { homeroomTeacherId: { contains: teacher.id } }
      ]
    },
    select: {
      id: true,
      className: true,
      students: {
        select: {
          id: true,
          studentName: true,
          studentCode: true
        }
      }
    }
  })

  // Find all subjects in the system for proposal selection
  const subjects = await prisma.subject.findMany({
    where: { status: "ACTIVE" },
    orderBy: { subjectName: "asc" }
  })

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <TeacherSupportClient
        teacher={teacher}
        academicYears={academicYears}
        homeroomClasses={homeroomClasses}
        subjects={subjects}
      />
    </div>
  )
}
