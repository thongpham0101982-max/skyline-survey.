import { prisma } from "@/lib/db"
import { CategoriesClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"

export const metadata = {
  title: "Danh mục Kỳ thi | Admin Portal",
  description: "Quản lý danh mục loại kỳ thi học sinh"
}

export default async function CategoriesPage() {
  const categories = await prisma.examCategory.findMany({
    orderBy: { name: "asc" },
    include: {
      exams: {
        select: {
          id: true,
          academicYearId: true
        }
      }
    }
  })

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  return (
    <div className="max-w-7xl mx-auto">
      <ExamTabs activeTab="categories" />
      <CategoriesClient initialCategories={categories} academicYears={academicYears} />
    </div>
  )
}
