import { prisma } from "@/lib/db"
import { CategoriesClient } from "./client"

export const metadata = {
  title: "Danh muc Khao sat | Admin Portal",
  description: "Quan ly danh muc phan loai cau hoi khao sat"
}

export default async function CategoriesPage() {
  const categories = await prisma.surveySection.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { questions: true } }
    }
  })

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Danh Muc Khao Sat</h1>
        <p className="text-slate-500 mt-2 text-sm">Phan loai cau hoi khao sat theo chu de de to chuc va phan tich du lieu hieu qua hon.</p>
      </div>
      <CategoriesClient initialCategories={categories} />
    </div>
  )
}
