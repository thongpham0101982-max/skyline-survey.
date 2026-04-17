import { prisma } from "@/lib/db"
import { RolesClient } from "./client"

export const metadata = { title: "Quản lý Phân quyền | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function RolesPage() {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: { permissions: true }
  })

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Phân quyền</h1>
        <p className="text-slate-500 mt-1">Quản lý các nhóm quyền và ma trận phân quyền chi tiết cho từng chức năng.</p>
      </div>
      <RolesClient initialRoles={roles} />
    </div>
  )
}
