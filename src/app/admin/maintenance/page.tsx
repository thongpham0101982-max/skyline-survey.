import { prisma } from "@/lib/db"
import { ShieldAlert, RefreshCcw, CheckCircle2, ServerCog } from "lucide-react"
import { syncPortalAccountsAction, getBackupListAction } from "./actions"
import { SyncButton } from "./SyncButton"
import { BackupSection } from "./BackupSection"

export default async function MaintenancePage() {
  const [students, parents, users, backups] = await Promise.all([
    prisma.student.count(),
    prisma.parent.count(),
    prisma.user.count(),
    getBackupListAction(),
  ])

  const stats = {
    students,
    parents,
    users
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700 pb-16">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-6">
         <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <ServerCog className="w-8 h-8" />
         </div>
         <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hệ thống Bảo trì & Sao lưu</h1>
            <p className="text-slate-500 font-medium">Quản lý sao lưu dữ liệu tự động định kỳ 23:00 Thứ 6 và đồng bộ portal</p>
         </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
         <StatCard label="Học sinh" value={stats.students} color="border-indigo-100" />
         <StatCard label="Phụ huynh" value={stats.parents} color="border-purple-100" />
         <StatCard label="Tổng User" value={stats.users} color="border-sky-100" />
      </div>

      {/* Phần quản lý sao lưu dữ liệu tự động 23h00 Thứ 6 */}
      <BackupSection initialBackups={backups} />

      {/* Phần đồng bộ tài khoản */}
      <div className="bg-white rounded-[2rem] p-8 border-2 border-amber-100 shadow-sm space-y-6">
         <div className="flex justify-between items-start">
            <div className="space-y-1">
               <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                     <ShieldAlert className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">Đồng bộ Tài khoản Portal</h3>
               </div>
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

function StatCard({ label, value, color }: any) {
  return (
    <div className={`bg-white p-6 rounded-2xl border-2 ${color || "border-indigo-100"} shadow-sm text-center`}>
       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
       <p className="text-3xl font-black text-slate-800">{value?.toLocaleString("vi-VN")}</p>
    </div>
  )
}
