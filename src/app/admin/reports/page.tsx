import { prisma } from "@/lib/db"
import { TrackingClient } from "./client"

export default async function ReportsPage() {
  const periods = await prisma.surveyPeriod.findMany({
    orderBy: { startDate: 'desc' }
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trung tâm Đo Lường & Quản Tỷ Báo Cáo</h1>
        <p className="text-slate-500 mt-2 font-medium">Bảng xếp hạng thời gian thực tiến độ Survey theo từng Cấp Lớp, Từng phụ huynh.</p>
      </div>

      <TrackingClient periods={periods} />
    </div>
  )
}