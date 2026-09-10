import { prisma } from "@/lib/db"
import { RolesClient } from "./client"

export const metadata = { title: "Quản lý Phân quyền | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function RolesPage() {
  const roles = await prisma.role.findMany({
    orderBy: { name: 'asc' },
    include: { permissions: true }
  })

  const userCounts = await prisma.user.groupBy({
    by: ['role'],
    _count: {
      role: true
    }
  })

  const ROLE_ORDER = [
    "ADMIN", "TB_DHCM", "GDCS", "TBP", "TTCM", "KHAO_THI", "BGH_MN",
    "GIAO_VU", "CTHS", "TVAN", "NS", "TEACHER", "GV_MN", "GVNN", "PARENT", "STUDENT"
  ];

  const rolesWithCounts = roles.map(r => {
    const countObj = userCounts.find(uc => uc.role === r.code)
    return {
      ...r,
      userCount: countObj?._count?.role || 0
    }
  }).sort((a, b) => {
    const idxA = ROLE_ORDER.indexOf(a.code);
    const idxB = ROLE_ORDER.indexOf(b.code);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.name.localeCompare(b.name, 'vi');
  });

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Phân quyền</h1>
        <p className="text-slate-500 mt-1">Quản lý các nhóm quyền và ma trận phân quyền chi tiết cho từng chức năng.</p>
      </div>
      <RolesClient initialRoles={rolesWithCounts} />
    </div>
  )
}
