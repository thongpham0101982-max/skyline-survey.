import { prisma } from "@/lib/db"
import { ShieldAlert, RefreshCcw, CheckCircle2 } from "lucide-react"
import { syncPortalAccountsAction } from "./actions"
import { SyncButton } from "./SyncButton"

export default async function MaintenancePage() {
  const stats = {
    students: await prisma.student.count(),
    parents: await prisma.parent.count(),
    users: await prisma.user.count()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
         <div className="p-3 text-amber-600 text-xs font-semibold">
            <ShieldAlert className="w-8 h-8" />
         </div>
         <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hệ thống Bảo trì</h1>
            <p className="text-slate-500 font-medium">Thiết lập và đồng bộ tài khoản người dùng portal</p>
         </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
         <StatCard label="Học sinh" value={stats.students} />
         <StatCard label="Phụ huynh" value={stats.parents} />
         <StatCard label="Tổng User" value={stats.users} />
      </div>

      <div className="bg-white rounded-[2rem] p-10 border-2 border-amber-100 shadow-sm space-y-8">
         <div className="flex justify-between items-start">
            <div className="space-y-1">
               <h3 className="text-xl font-black text-slate-800">Đồng bộ Tài khoản Portal</h3>
               <p className="text-slate-400 text-sm font-medium">Tự động tạo User cho Học sinh & Phụ huynh theo quy chuẩn:</p>
               <ul className="text-xs text-slate-500 mt-4 space-y-2 list-disc ml-5">
                  <li><strong>Học sinh:</strong> Tài khoản = Mã HS, Mật khẩu = Mã HS</li>
                  <li><strong>Phụ huynh:</strong> Tài khoản = P + Mã HS, Mật khẩu = Mã HS</li>
               </ul>
            </div>
            <SyncButton syncAction={syncPortalAccountsAction} />
         </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-sm text-center">
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
       <p className="text-3xl font-black text-slate-800">{value}</p>
    </div>
  )
}
