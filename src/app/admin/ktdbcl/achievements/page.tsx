import { prisma } from "@/lib/db"
import { AchievementsClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"

export const metadata = {
  title: "Danh mục Thành tích | Admin Portal",
  description: "Quản lý loại thành tích và mức giải của học sinh"
}

export default async function AchievementsPage() {
  const categories = await prisma.achievementCategory.findMany({
    orderBy: { name: "asc" }
  })

  const levels = await prisma.achievementLevel.findMany({
    orderBy: { name: "asc" }
  })

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  return (
    <div className="max-w-4xl mx-auto">
      <ExamTabs activeTab="achievements" />
      <AchievementsClient 
        initialCategories={categories} 
        initialLevels={levels} 
        academicYears={academicYears} 
      />
    </div>
  )
}
