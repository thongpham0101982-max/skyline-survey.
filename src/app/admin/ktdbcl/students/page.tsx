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
      academicYearId: true
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
      academicYearId: true
    }
  })

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  return (
    <div className="max-w-6xl mx-auto">
      <ExamTabs activeTab="students" />
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#003B3A] tracking-tight">Đăng Ký Dự Thi</h1>
        <p className="text-slate-500 mt-2 text-xs font-semibold uppercase tracking-wider">
          Gán học sinh vào danh sách dự thi theo từng kỳ thi, cơ sở và lớp học theo khối.
        </p>
      </div>

      <StudentsClient exams={exams} campuses={campuses} classes={classes} academicYears={academicYears} />
    </div>
  )
}
