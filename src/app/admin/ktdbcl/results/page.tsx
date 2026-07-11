import { prisma } from "@/lib/db"
import { ResultsClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"
import { getAdminSession } from "@/lib/session"

export const metadata = {
  title: "Nhập điểm & Kết quả | Admin Portal",
  description: "Nhập điểm, xếp giải và thống kê kết quả thi"
}

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getAdminSession()
  const params = await searchParams
  const initialTab = (params?.tab === 'reports' || params?.tab === 'profiles') ? params.tab : 'input'

  // Active tab for ExamTabs navigation
  const activeNavTab = params?.tab === 'reports' ? 'reports' : params?.tab === 'profiles' ? 'profiles' : 'results'

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
      <ExamTabs activeTab={activeNavTab as any} />

      <ResultsClient
        exams={exams}
        academicYears={academicYears}
        teachers={teachers}
        campuses={campuses}
        classes={classes}
        achievementCategories={achievementCategories}
        achievementLevels={achievementLevels}
        initialTab={initialTab as 'input' | 'reports' | 'profiles'}
      />
    </div>
  )
}
