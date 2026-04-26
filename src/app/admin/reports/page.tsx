import { prisma } from "@/lib/db"
import { TrackingClient } from "./client"
import { getAdminSession } from "@/lib/session"

export default async function ReportsPage() {
  const session = await getAdminSession()

  const periods = await prisma.surveyPeriod.findMany({
    orderBy: { startDate: "desc" }
  })

  // Load campuses filtered by session scope
  const campusWhere = session.isFullAccess ? {} : { id: { in: session.allowedCampusIds } }
  const campuses = await prisma.campus.findMany({
    where: campusWhere,
    orderBy: { campusCode: "asc" }
  })

  // If user is campus-scoped, default selected campus to their first assigned one
  const defaultCampusId = session.isFullAccess ? null : (session.allowedCampusIds[0] || null)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Trung tâm Đo Lường &amp; Quản Tỷ Báo Cáo</h1>
        <p className="text-slate-500 mt-2 font-medium">Bảng xếp hạng thời gian thực tiến độ Survey theo từng Cấp Lớp, Từng phụ huynh.</p>
      </div>
      <TrackingClient
        periods={periods}
        campuses={campuses}
        defaultCampusId={defaultCampusId}
        isCampusLocked={!session.isFullAccess && session.allowedCampusIds.length === 1}
      />
    </div>
  )
}
