import { prisma } from "@/lib/db"
import { CampusManagerClient } from "./client"
import { PageHeader } from "@/components/PageHeader"

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
      <PageHeader
        title="Quản lý Cơ sở"
        description="Danh sách các cơ sở giáo dục trong hệ sinh thái Sky-Line"
        breadcrumbs={[
          { label: "Cấu hình hệ thống" },
          { label: "Cơ sở giáo dục" }
        ]}
      />

      <CampusManagerClient initialCampuses={campuses} gdcsUsers={gdcsUsers} />
    </div>
  )
}
