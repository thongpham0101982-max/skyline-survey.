import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { ParentAccountsClient } from "./client"
import { ShieldCheck } from "lucide-react"

export default async function ParentAccountsPage() {
  const session = await auth();
  const user = session?.user as any;
  const isGDCS = user?.role === 'GDCS';
  const allowedCampusIds = user?.campusIds || [];
  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true }
  })
  const defaultYearId = years.find(y => y.status === "ACTIVE")?.id || years[0]?.id || null

  const campuses = await prisma.campus.findMany({
    where: isGDCS ? { id: { in: allowedCampusIds } } : { status: "ACTIVE" },
    orderBy: { campusName: "asc" }
  })

  const classes = await prisma.class.findMany({
    where: isGDCS ? { campusId: { in: allowedCampusIds } } : {},
    include: { campus: true, academicYear: { select: { id: true, name: true } } },
    orderBy: [{ academicYear: { startDate: "desc" } }, { className: "asc" }]
  })

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto animate-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 sm:px-0">
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-0.5 w-6 bg-red-500 rounded-full" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Hệ thống quản trị</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">Danh Mục Tài Khoản PHHS</h1>
          <p className="text-slate-400 font-bold text-sm">Kho lưu trữ và khởi tạo quyền truy cập dành cho Phụ huynh học sinh.</p>
        </div>
        <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-white shadow-xl shadow-slate-200/20">
           <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-inner">
              <ShieldCheck className="w-6 h-6" />
           </div>
           <div className="pr-4">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] leading-none mb-1.5">Trạng thái bảo mật</p>
              <p className="text-sm font-black text-slate-700">Mã hóa chuẩn AES-256</p>
           </div>
        </div>
      </div>
      <ParentAccountsClient classes={classes} years={years} campuses={campuses} defaultYearId={defaultYearId} />
    </div>
  )
}
