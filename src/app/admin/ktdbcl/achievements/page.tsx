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
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#003B3A] tracking-tight">Danh Mục Thành Tích</h1>
        <p className="text-slate-500 mt-2 text-xs font-semibold uppercase tracking-wider">Cấu hình loại thành tích và các mức giải thưởng của học sinh.</p>
      </div>
      <AchievementsClient 
        initialCategories={categories} 
        initialLevels={levels} 
        academicYears={academicYears} 
      />
    </div>
  )
}
