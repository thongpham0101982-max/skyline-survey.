import { prisma } from "@/lib/db"
import { ExamsClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"
import { getAdminSession } from "@/lib/session"

export const metadata = {
  title: "Danh sách Kỳ thi | Admin Portal",
  description: "Quản lý danh sách các kỳ thi học sinh"
}

export default async function ExamsPage() {
  const session = await getAdminSession()

  // Fetch exams including all related data and counts
  const exams = await prisma.exam.findMany({
    include: {
      category: true,
      round: true,
      department: true,
      _count: {
        select: {
          students: true,
          achievements: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  // Fetch categories, rounds, departments for selection dropdowns
  const categories = await prisma.examCategory.findMany({
    orderBy: { name: "asc" }
  })

  const rounds = await prisma.examRound.findMany({
    orderBy: { name: "asc" }
  })

  const departments = await prisma.department.findMany({
    where: { status: "ACTIVE" },
    orderBy: { name: "asc" }
  })

  // Fetch all academic years
  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  return (
    <div className="max-w-7xl mx-auto">
      <ExamTabs activeTab="exams" />
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#003B3A] tracking-tight">Danh Sách Kỳ Thi</h1>
        <p className="text-slate-500 mt-2 text-xs font-semibold uppercase tracking-wider">
          Tạo và quản lý tất cả kỳ thi học sinh, cấu hình danh mục, vòng thi và tổ chuyên môn.
        </p>
      </div>
      <ExamsClient
        initialExams={exams}
        categories={categories}
        rounds={rounds}
        departments={departments}
        academicYears={academicYears}
      />
    </div>
  )
}
