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

  // Fetch exams including all related data
  const exams = await prisma.exam.findMany({
    include: {
      category: true,
      round: true,
      department: true,
      teacher: true
    },
    orderBy: { createdAt: "desc" }
  })

  // Fetch categories, rounds, departments, teachers for selection dropdowns
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

  const teachers = await prisma.teacher.findMany({
    where: { status: "ACTIVE" },
    orderBy: { teacherName: "asc" }
  })

  // Get active academic year ID if exists
  const activeYear = await prisma.academicYear.findFirst({
    where: { status: "ACTIVE" }
  })
  const academicYearId = activeYear ? activeYear.id : null

  return (
    <div className="max-w-6xl mx-auto">
      <ExamTabs activeTab="exams" />
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#0A3230] tracking-tight">Danh Sách Kỳ Thi</h1>
        <p className="text-slate-500 mt-2 text-xs font-semibold uppercase tracking-wider">
          Tạo và quản lý tất cả kỳ thi học sinh, cấu hình danh mục, vòng thi, tổ chuyên môn và GV phụ trách.
        </p>
      </div>
      <ExamsClient
        initialExams={exams}
        categories={categories}
        rounds={rounds}
        departments={departments}
        teachers={teachers}
        academicYearId={academicYearId}
      />
    </div>
  )
}
