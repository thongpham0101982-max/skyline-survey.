import { prisma } from "@/lib/db"
import { RoundsClient } from "./client"
import { ExamTabs } from "@/components/ExamTabs"

export const metadata = {
  title: "Danh mục Vòng thi | Admin Portal",
  description: "Quản lý danh sách các vòng thi học sinh"
}

export default async function RoundsPage() {
  const rounds = await prisma.examRound.findMany({
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
    <div className="max-w-4xl mx-auto">
      <ExamTabs activeTab="rounds" />
      <RoundsClient initialRounds={rounds} academicYears={academicYears} />
    </div>
  )
}
