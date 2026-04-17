import { prisma } from "@/lib/db"
import { ParentAccountsClient } from "./client"

export default async function ParentAccountsPage() {
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true }
  })
  const defaultYearId = years.find(y => y.status === "ACTIVE")?.id || years[0]?.id || null

  const classes = await prisma.class.findMany({
    include: { campus: true, academicYear: { select: { id: true, name: true } } },
    orderBy: [{ academicYear: { startDate: "desc" } }, { className: "asc" }]
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Danh Muc Tai Khoan PHHS</h1>
        <p className="text-slate-500 mt-2 font-medium">Trung tam khoi tao tai khoan Phu huynh theo Nam hoc.</p>
      </div>
      <ParentAccountsClient classes={classes} years={years} defaultYearId={defaultYearId} />
    </div>
  )
}
