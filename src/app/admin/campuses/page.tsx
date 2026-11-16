import { prisma } from "@/lib/db"
import { CampusManagerClient } from "./client"
import { PageHeader } from "@/components/PageHeader"

export const dynamic = "force-dynamic"

export default async function CampusPage() {
  const campuses = await prisma.campus.findMany({
    include: {
      manager: {
        select: { id: true, fullName: true, email: true }
      }
    },
    orderBy: { campusCode: "asc" }
  })

  const existingManagerIds = campuses
    .map((c) => c.managerId)
    .filter((id): id is string => Boolean(id))

  const gdcsUsers = await prisma.user.findMany({
    where: {
      OR: [
        {
          status: "ACTIVE",
          OR: [
            {
              role: {
                in: [
                  "GDCS",
                  "GĐCS",
                  "GD_CS",
                  "GĐ_CS",
                  "gdcs",
                  "gđcs",
                  "gd_cs",
                  "gđ_cs",
                  "GIAO_VU",
                  "GIAO_VU_CS",
                  "BGH",
                  "BGH_CS",
                  "BGH_MN",
                  "TBP"
                ]
              }
            },
            {
              teacher: {
                position: {
                  in: ["GĐCS", "GDCS", "GĐ_CS", "GD_CS", "GIAO_VU", "GIAO_VU_CS", "BGH", "BGH_CS", "BGH_MN"]
                }
              }
            },
            { teacher: { positions: { contains: "GĐCS" } } },
            { teacher: { positions: { contains: "GDCS" } } }
          ]
        },
        ...(existingManagerIds.length > 0 ? [{ id: { in: existingManagerIds } }] : [])
      ]
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
