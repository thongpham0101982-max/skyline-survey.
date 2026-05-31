"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { 
  Users, 
  Layers, 
  ArrowRightLeft, 
  ClipboardCheck, 
  TrendingUp, 
  Award,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2
} from "lucide-react"
import { WelcomeAlert } from "@/components/WelcomeAlert"

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const userName = session?.user?.name || "Thành viên"

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const r = await fetch("/api/check-he-thong?action=getMetrics")
        if (r.ok) {
          setMetrics(await r.json())
        }
      } catch (e) {
        console.error("Failed to load dashboard metrics:", e)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin opacity-60" />
        <p className="text-slate-400 font-bold tracking-wide uppercase text-xs">Đang tải số liệu thống kê...</p>
      </div>
    )
  }

  const finalMetrics = metrics || {
    totalStudents: 0,
    totalClasses: 0,
    transferCount: 0,
    completionRate: 0,
    assessmentGroup: [],
    admissionGroup: []
  }

  const campusIds = (session?.user as any)?.campusIds || []

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <WelcomeAlert name={userName} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Tổng quan Hệ thống</h1>
          <p className="text-slate-500 font-medium mt-1">Số liệu thống kê chi tiết theo phạm vi Cơ sở của bạn.</p>
        </div>
        {campusIds.length > 0 && (
          <span className="px-4 py-1.5 text-xs font-black bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1.5 self-start md:self-auto">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
            Đang lọc: {campusIds.length} Cơ sở
          </span>
        )}
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* CARD 1: TỔNG HỌC SINH */}
        <div className="relative bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tổng Học sinh</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.totalStudents.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        {/* CARD 2: SỐ LỚP CƠ SỞ */}
        <div className="relative bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lớp học Cơ sở</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.totalClasses}</h3>
            </div>
          </div>
        </div>

        {/* CARD 3: HỌC SINH LƯU CHUYỂN */}
        <div className="relative bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">HS Lưu chuyển</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.transferCount}</h3>
            </div>
          </div>
        </div>

        {/* CARD 4: TỶ LỆ HOÀN THÀNH */}
        <div className="relative bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tỷ lệ Hoàn thành</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.completionRate.toFixed(1)}%</h3>
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        
        {/* SECTION LEFT: SURVEY RESULTS BY GRADE */}
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Khảo sát theo Khối học</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">Thống kê số lượng học sinh hoàn thành khảo sát</p>
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {finalMetrics.assessmentGroup.map((g: any, idx: number) => {
              const gradeName = g.grade ? `Khối ${g.grade}` : "Chưa phân khối"
              return (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold text-slate-600">{gradeName}</span>
                    <span className="font-black text-indigo-600">{g._count} học sinh</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (g._count / (finalMetrics.totalStudents || 1)) * 100)}%` }}></div>
                  </div>
                </div>
              )
            })}
            {finalMetrics.assessmentGroup.length === 0 && (
              <p className="text-sm text-slate-400 font-semibold py-8 text-center uppercase tracking-wider">Chưa có số liệu khảo sát khối</p>
            )}
          </div>
        </div>

        {/* SECTION RIGHT: ADMISSION RESULTS */}
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Thống kê Kết quả Xét tuyển</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">Tỷ lệ học sinh đạt điều kiện đầu vào</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {finalMetrics.admissionGroup.map((a: any, idx: number) => {
              const resultName = a.admissionResult ? String(a.admissionResult).toUpperCase() : "CHƯA XÉT DUYỆT"
              let colorClasses = "bg-slate-50 border-slate-200 text-slate-600"
              let Icon = AlertCircle

              if (resultName.includes("KHONG") || resultName.includes("KHÔNG")) {
                colorClasses = "bg-rose-50 border-rose-100 text-rose-700"
                Icon = XCircle
              } else if (resultName.includes("DAT") || resultName.includes("ĐẠT")) {
                colorClasses = "bg-emerald-50 border-emerald-100 text-emerald-700"
                Icon = CheckCircle2
              }

              return (
                <div key={idx} className={`p-5 rounded-2xl border ${colorClasses} flex flex-col items-center text-center shadow-sm relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
                  <Icon className="w-8 h-8 opacity-70 mb-2" />
                  <span className="text-[10px] font-black tracking-wider uppercase">{resultName}</span>
                  <span className="text-2xl font-black mt-1">{a._count}</span>
                </div>
              )
            })}
            {finalMetrics.admissionGroup.length === 0 && (
              <p className="text-sm text-slate-400 font-semibold py-8 text-center uppercase tracking-wider col-span-2">Chưa có kết quả xét duyệt</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
