import { prisma } from "@/lib/db"
import { StudentsClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"
import { getAdminSession } from "@/lib/session"

export const metadata = {
  title: "Đăng ký Dự thi | Admin Portal",
  description: "Đăng ký dự thi cho học sinh"
}

export default async function StudentsPage() {
  const session = await getAdminSession()

  // Fetch exams
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      grade: true,
      academicYearId: true,
      _count: {
        select: { students: true }
      }
    }
  })

  // Fetch campuses
  const campuses = await prisma.campus.findMany({
    where: { status: "ACTIVE" },
    orderBy: { campusName: "asc" },
    select: {
      id: true,
      campusName: true
    }
  })

  // Fetch classes
  const classes = await prisma.class.findMany({
    where: { status: "ACTIVE" },
    orderBy: { className: "asc" },
    select: {
      id: true,
      className: true,
      grade: true,
      campusId: true,
      academicYearId: true,
      campus: {
        select: { campusCode: true }
      },
      _count: {
        select: { students: true }
      }
    }
  })

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  return (
    <div className="max-w-7xl mx-auto">
      <ExamTabs activeTab="students" />


      <StudentsClient exams={exams} campuses={campuses} classes={classes} academicYears={academicYears} />
    </div>
  )
}
