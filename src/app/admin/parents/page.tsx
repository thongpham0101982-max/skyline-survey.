import { prisma } from "@/lib/db"
import { ParentAccountsClient } from "./client"
import { ShieldCheck, UserCheck } from "lucide-react"
import { getAdminSession } from "@/lib/session"

export default async function ParentAccountsPage() {
  const session = await getAdminSession()
  const isRestricted = !session.isFullAccess
  const allowedCampusIds = session.allowedCampusIds

  const years = await prisma.academicYear.findMany({
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, status: true, isOff: true }
  })
  const defaultYearId = years.find(y => y.status === "ACTIVE" && !y.isOff)?.id || years.find(y => !y.isOff)?.id || years[0]?.id || null

  const campuses = await prisma.campus.findMany({
    where: isRestricted ? { id: { in: allowedCampusIds } } : { status: "ACTIVE" },
    orderBy: { campusName: "asc" }
  })

  const classes = await prisma.class.findMany({
    where: isRestricted ? { campusId: { in: allowedCampusIds } } : {},
    include: { campus: true, academicYear: { select: { id: true, name: true } } },
    orderBy: [{ academicYear: { startDate: "desc" } }, { className: "asc" }]
  })

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      
      {/* HEADER TITLE BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#36E08F]" />
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Hệ thống quản trị Sky-Line</span>
          </div>
          <h1 className="text-3xl font-black text-[#003B3A] tracking-tight">Danh Mục Tài Khoản PHHS</h1>
          <p className="text-slate-500 font-medium text-xs">Kho lưu trữ, quản lý liên kết Phụ huynh - Học sinh & khởi tạo quyền truy cập hệ thống.</p>
        </div>

        <div className="flex items-center gap-4 bg-teal-50/60 p-4 rounded-2xl border border-teal-100">
           <div className="w-12 h-12 rounded-xl bg-[#003B3A] text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bảo mật tài khoản</p>
              <p className="text-xs font-bold text-[#003B3A]">Mã hóa bcrypt & Chuẩn AES-256</p>
           </div>
        </div>
      </div>

      <ParentAccountsClient 
        classes={classes} 
        years={years} 
        campuses={campuses} 
        defaultYearId={defaultYearId} 
        isCampusLocked={isRestricted && allowedCampusIds.length === 1}
        defaultCampusId={isRestricted ? allowedCampusIds[0] : null}
      />
    </div>
  )
}
