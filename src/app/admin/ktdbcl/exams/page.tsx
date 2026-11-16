import { cookies } from "next/headers"
import { prisma } from "@/lib/db"
import { ExamsClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"
import { getAdminSession } from "@/lib/session"

export const metadata = {
  title: "Danh sách kỳ thi theo năm học | Admin Portal",
  description: "Quản lý danh sách các kỳ thi và sân chơi học sinh theo từng năm học",
}

export default async function ExamsPage() {
  await getAdminSession()
  const cookieStore = await cookies()
  const selectedYearCookie = cookieStore.get("selectedAcademicYear")?.value

  const [exams, categories, rounds, departments, academicYears] = await Promise.all([
    prisma.exam.findMany({
      include: {
        category: true,
        round: true,
        department: true,
        academicYear: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            students: true,
            achievements: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.examCategory.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.examRound.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      where: { status: "ACTIVE" },
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
    <div className="max-w-7xl mx-auto">
      <ExamTabs
        activeTab="exams"
        pendingRequestsCount={pendingRequestsCount}
        academicYears={academicYears}
        initialYearId={initialYearId}
      />

      <ExamsClient
        initialExams={exams}
        categories={categories}
        rounds={rounds}
        departments={departments}
        academicYears={academicYears}
        initialYearId={initialYearId}
      />
    </div>
  )
}
