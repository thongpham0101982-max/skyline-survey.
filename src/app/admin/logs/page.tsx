import { prisma } from "@/lib/db"
import { LogsClient } from "./client"

export const metadata = { title: "Nhật ký Hệ thống | Admin Portal" }
export const dynamic = "force-dynamic"

export default async function LogsPage({ searchParams }: { searchParams: any }) {
  const params = await searchParams;
  const page = parseInt(params.page) || 1
  const limit = 50
  const search = params.search || ""
  const action = params.action || ""

  const where: any = {}
  if (search) {
    where.OR = [
      { userEmail: { contains: search } },
      { targetTable: { contains: search } },
      { action: { contains: search } },
      { newValues: { contains: search } }
    ]
  }
  if (action) {
    where.action = action
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.auditLog.count({ where })
  ])

  // Get distinct actions for filtering list
  const actionsResult = await prisma.auditLog.groupBy({
    by: ['action']
  })

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Nhật ký Hệ thống (Audit Logs)</h1>
        <p className="text-slate-500 mt-1">Theo dõi hoạt động đăng nhập, thay đổi dữ liệu của tài khoản nhân sự và giáo viên.</p>
      </div>
      <LogsClient 
        initialLogs={logs} 
        total={total} 
        page={page} 
        limit={limit} 
        search={search} 
        selectedAction={action} 
        actions={actionsResult.map(a => a.action).filter(Boolean)} 
      />
    </div>
  )
}
