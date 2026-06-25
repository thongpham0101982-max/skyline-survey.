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
      _count: { select: { exams: true } }
    }
  })

  const academicYears = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" }
  })

  return (
    <div className="max-w-4xl mx-auto">
      <ExamTabs activeTab="rounds" />
      <div className="mb-8">
        <h1 className="text-2xl font-black text-[#0A3230] tracking-tight">Danh Mục Vòng Thi</h1>
        <p className="text-slate-500 mt-2 text-xs font-semibold uppercase tracking-wider">Phân loại các vòng thi học sinh theo nhóm để quản lý và theo dõi hiệu quả.</p>
      </div>
      <RoundsClient initialRounds={rounds} academicYears={academicYears} />
    </div>
  )
}
