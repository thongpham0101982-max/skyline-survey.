import { prisma } from "@/lib/db"
import { CategoriesClient } from "./client"
import { SurveyTabs } from "@/components/SurveyTabs"

export const metadata = {
  title: "Danh mục Khảo sát | Admin Portal",
  description: "Quản lý danh mục phân loại câu hỏi khảo sát"
}

export default async function CategoriesPage() {
  const categories = await prisma.surveySection.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      parent: true,
      children: {
        orderBy: { sortOrder: "asc" }
      },
      _count: { select: { questions: true } }
    }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 font-outfit">
      <SurveyTabs activeTab="categories" />
      <CategoriesClient initialCategories={categories} />
    </div>
  )
}
