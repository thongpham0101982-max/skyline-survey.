import { prisma } from "@/lib/db"
import { CampusManagerClient } from "./client"
import { Building2 } from "lucide-react"

export default async function CampusPage() {
  const campuses = await prisma.campus.findMany({
    include: {
      manager: {
        select: { id: true, fullName: true, email: true }
      }
    },
    orderBy: { campusCode: "asc" }
  })

  const gdcsUsers = await prisma.user.findMany({
    where: {
      role: { in: ["GĐ_CS", "GIAO_VU", "GDCS", "GIAO_VU_CS"] }
    },
    select: { id: true, fullName: true, email: true },
    orderBy: { fullName: "asc" }
  })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-[#36E08F] rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quản lý Cơ sở</h1>
          <p className="text-slate-500 font-medium">Danh sách các cơ sở giáo dục trong hệ thống</p>
        </div>
      </div>

      <CampusManagerClient initialCampuses={campuses} gdcsUsers={gdcsUsers} />
    </div>
  )
}
