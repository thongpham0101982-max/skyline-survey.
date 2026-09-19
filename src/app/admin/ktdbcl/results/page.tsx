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

  // Concurrently fetch all independent datasets with Promise.all
  const [
    exams,
    academicYears,
    teachers,
    campuses,
    achievementCategories,
    achievementLevels
  ] = await Promise.all([
    prisma.exam.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        code: true,
        grade: true,
        academicYearId: true,
        startDate: true,
        endDate: true,
        category: { select: { name: true } }
      }
    }),
    prisma.academicYear.findMany({ orderBy: { startDate: "desc" } }),
    prisma.teacher.findMany({
      where: { status: "ACTIVE" },
      orderBy: { teacherName: "asc" },
      select: { id: true, teacherCode: true, teacherName: true }
    }),
    prisma.campus.findMany({
      where: { status: "ACTIVE" },
      orderBy: { campusName: "asc" },
      select: { id: true, campusName: true }
    }),
    prisma.achievementCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.achievementLevel.findMany({ orderBy: { name: "asc" } })
  ])

  const activeYear = academicYears.find(y => y.status === "ACTIVE" && !y.isOff) || academicYears[0]
  const classes = await prisma.class.findMany({
    where: { status: "ACTIVE", ...(activeYear ? { academicYearId: activeYear.id } : {}) },
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
