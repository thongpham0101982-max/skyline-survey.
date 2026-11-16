import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { CategoriesClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"

export const metadata = {
  title: "Danh mục kỳ thi | Admin Portal",
  description: "Quản lý từ điển danh mục phân loại kỳ thi học sinh",
}

export default async function CategoriesPage() {
  const cookieStore = await cookies()
  const selectedYearCookie = cookieStore.get("selectedAcademicYear")?.value

  const [categories, academicYears] = await Promise.all([
    prisma.examCategory.findMany({
      orderBy: { name: "asc" },
      include: {
        exams: {
          select: {
            id: true,
            academicYearId: true,
          },
        },
      },
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
    <div className="max-w-7xl mx-auto">
      <ExamTabs
        activeTab="categories"
        pendingRequestsCount={pendingRequestsCount}
        academicYears={academicYears}
        initialYearId={initialYearId}
      />
      <CategoriesClient initialCategories={categories} academicYears={academicYears} />
    </div>
  )
}
