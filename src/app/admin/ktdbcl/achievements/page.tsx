import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { AchievementsClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"

export const metadata = {
  title: "Loại & Mức giải thưởng | Admin Portal",
  description: "Quản lý từ điển loại thành tích và mức giải của học sinh",
}

export default async function AchievementsPage() {
  const cookieStore = await cookies()
  const selectedYearCookie = cookieStore.get("selectedAcademicYear")?.value

  const [categories, levels, academicYears] = await Promise.all([
    prisma.achievementCategory.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.achievementLevel.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.academicYear.findMany({
      orderBy: { startDate: "desc" },
    }),
  ])

  const activeYear = academicYears.find((y) => y.status === "ACTIVE")
  const initialYearId =
    selectedYearCookie && academicYears.some((y) => y.id === selectedYearCookie)
      ? selectedYearCookie
      : activeYear?.id || academicYears[0]?.id || ""

  const pendingRequestsCount = await prisma.studentAchievementRequest.count({
    where: {
      status: "PENDING",
      ...(initialYearId ? { academicYearId: initialYearId } : {}),
    },
  })

  return (
    <div className="w-full max-w-[1600px] mx-auto">
      <ExamTabs
        activeTab="achievements"
        pendingRequestsCount={pendingRequestsCount}
        academicYears={academicYears}
        initialYearId={initialYearId}
      />
      <AchievementsClient
        initialCategories={categories}
        initialLevels={levels}
        academicYears={academicYears}
      />
    </div>
  )
}
