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
      _count: { select: { exams: true } }
    }
  })

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  return (
    <div className="max-w-4xl mx-auto">
      <ExamTabs activeTab="categories" />
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#003B3A] tracking-tight">Danh Mục Kỳ Thi</h1>
        <p className="text-slate-500 mt-2 text-xs font-semibold uppercase tracking-wider">Phân loại các kỳ thi học sinh theo nhóm để quản lý và theo dõi hiệu quả.</p>
      </div>
      <CategoriesClient initialCategories={categories} academicYears={academicYears} />
    </div>
  )
}
