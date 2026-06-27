import { prisma } from "@/lib/db"
import { ResultsClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"
import { getAdminSession } from "@/lib/session"

export const metadata = {
  title: "Nhập điểm & Kết quả | Admin Portal",
  description: "Nhập điểm, xếp giải và thống kê kết quả thi"
}

export default async function ResultsPage() {
  const session = await getAdminSession()

  // Fetch exams including related information
  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      code: true,
      grade: true,
      academicYearId: true,
      startDate: true,
      endDate: true,
      category: {
        select: {
          name: true
        }
      }
    }
  })

  // Fetch all academic years
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  // Fetch all active teachers for selector
  const teachers = await prisma.teacher.findMany({
    where: { status: "ACTIVE" },
    orderBy: { teacherName: "asc" },
    select: {
      id: true,
      teacherCode: true,
      teacherName: true
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

  // Fetch achievement categories and levels
  const achievementCategories = await prisma.achievementCategory.findMany({
    orderBy: { name: "asc" }
  })
  const achievementLevels = await prisma.achievementLevel.findMany({
    orderBy: { name: "asc" }
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

  return (
    <div className="max-w-7xl mx-auto">
      <ExamTabs activeTab="results" />
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#003B3A] tracking-tight">Nhập Điểm & Kết Quả</h1>
        <p className="text-slate-500 mt-2 text-xs font-semibold uppercase tracking-wider">
          Hệ thống nhập điểm, phân loại và công bố kết quả thi, quản lý thành tích và báo cáo học sinh.
        </p>
      </div>

      <ResultsClient
        exams={exams}
        academicYears={academicYears}
        teachers={teachers}
        campuses={campuses}
        classes={classes}
        achievementCategories={achievementCategories}
        achievementLevels={achievementLevels}
      />
    </div>
  )
}
