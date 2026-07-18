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
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const userName = session?.user?.name || "Thành viên"

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const yearId = localStorage.getItem("selectedAcademicYear") || "";
        const r = await fetch("/api/check-he-thong?action=getMetrics&academicYearId=" + yearId)
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

    window.addEventListener("academicYearChanged", fetchMetrics)
    return () => window.removeEventListener("academicYearChanged", fetchMetrics)
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
    generalClasses: 0,
    preschoolClasses: 0,
    transferCount: 0,
    newEnrollmentsCount: 0,
    changeClassCount: 0,
    completionRate: 0,
    assessmentGroup: [],
    admissionGroup: [],
    monthlyHeadcount: [],
    newEnrollmentStats: { total: 0, inProvince: 0, outProvince: 0, abroad: 0, inProvincePrivate: 0 },
    transferOutStats: { total: 0, inProvince: 0, outProvince: 0, abroad: 0, inProvincePrivate: 0 }
  }

  const campusIds = (session?.user as any)?.campusIds || []

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <WelcomeAlert name={userName} />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#003B3A] tracking-tight">Tổng quan Hệ thống</h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">Năm học đang hoạt động: <span className="font-bold text-[#00A99D]">{finalMetrics.academicYearName || "---"}</span> | Số liệu thống kê chi tiết theo phạm vi Cơ sở của bạn.</p>
        </div>
        {campusIds.length > 0 && (
          <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider shadow-sm flex items-center gap-1.5 self-start md:self-auto text-xs font-semibold">
            <span className="w-1.5 h-1.5 animate-pulse text-xs font-semibold"></span>
            Đang lọc: {campusIds.length} Cơ sở
          </span>
        )}
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* CARD 1: TỔNG HỌC SINH */}
        <div className="relative bg-white rounded-2xl border-2 border-blue-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform text-xs font-semibold"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-blue-600 shadow-sm text-xs font-semibold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tổng Học sinh</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.totalStudents.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        {/* CARD 2: SỐ LỚP CƠ SỞ */}
        <div className="relative bg-white rounded-2xl border-2 border-indigo-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform text-xs font-semibold"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-indigo-600 shadow-sm text-xs font-semibold">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lớp học Cơ sở</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.totalClasses}</h3>
              <div className="text-[11px] text-slate-500 font-semibold mt-1 space-x-2">
                <span>Phổ thông: <strong className="text-indigo-600">{finalMetrics.generalClasses || 0}</strong></span>
                <span>•</span>
                <span>Mầm non: <strong className="text-rose-500">{finalMetrics.preschoolClasses || 0}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: HỌC SINH LƯU CHUYỂN */}
        <div className="relative bg-white rounded-2xl border-2 border-amber-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform text-xs font-semibold"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-amber-600 shadow-sm text-xs font-semibold">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">HS Lưu chuyển</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">
                {((finalMetrics.newEnrollmentsCount || 0) + (finalMetrics.transferCount || 0) + (finalMetrics.changeClassCount || 0)).toLocaleString()}
              </h3>
              <div className="text-[10px] text-slate-500 font-semibold mt-1 space-x-1.5 flex flex-wrap">
                <span>Mới: <strong className="text-emerald-600">{finalMetrics.newEnrollmentsCount || 0}</strong></span>
                <span>•</span>
                <span>Đi: <strong className="text-rose-500">{finalMetrics.transferCount || 0}</strong></span>
                <span>•</span>
                <span>Lớp: <strong className="text-blue-500">{finalMetrics.changeClassCount || 0}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: TỶ LỆ HOÀN THÀNH */}
        <div className="relative bg-white rounded-2xl border-2 border-emerald-100 p-5 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 mix-blend-multiply filter blur-xl opacity-70 group-hover:scale-110 transition-transform text-xs font-semibold"></div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-emerald-600 shadow-sm text-xs font-semibold">
              <ClipboardCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tỷ lệ Hoàn thành</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.completionRate.toFixed(1)}%</h3>
            </div>
          </div>
        </div>

      </div>
      {/* BIỂU ĐỒ SỸ SỐ HỌC SINH THEO THÁNG */}
      {finalMetrics.monthlyHeadcount && finalMetrics.monthlyHeadcount.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-indigo-100 p-6 shadow-sm space-y-6 mt-8">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 text-indigo-600 flex items-center justify-center bg-indigo-50 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Theo dõi Sỹ số Học sinh theo từng Tháng</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                Biểu diễn biến tổng số học sinh đang học trong năm học
              </p>
            </div>
          </div>
          <div className="h-80 w-full pr-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={finalMetrics.monthlyHeadcount} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-5} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                <Line type="monotone" dataKey="generalCount" stroke="#4f46e5" strokeWidth={3} activeDot={{ r: 6 }} name="Sỹ số Phổ thông" />
                <Line type="monotone" dataKey="preschoolCount" stroke="#f43f5e" strokeWidth={3} activeDot={{ r: 6 }} name="Sỹ số Mầm non" />
                <Line type="monotone" dataKey="count" stroke="#0d9488" strokeWidth={2} strokeDasharray="5 5" activeDot={{ r: 4 }} name="Tổng sỹ số" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

            {/* SECTION: CHI TIẾT LUỒNG HỌC SINH */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        
        {/* COLUMN LEFT: NHẬP HỌC MỚI */}
        <div className="bg-white rounded-2xl border-2 border-emerald-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 text-emerald-600 bg-emerald-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Báo cáo Nhập học mới</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">Phân tích nguồn học sinh mới nhập học</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng sỹ số nhập mới</span>
              <span className="text-2xl font-black text-emerald-600 block mt-1">{(finalMetrics.newEnrollmentStats?.total || 0).toLocaleString()}</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-100/50 text-center">
              <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wider block">Nội tỉnh (Tư thục)</span>
              <span className="text-2xl font-black text-teal-700 block mt-1">{(finalMetrics.newEnrollmentStats?.inProvincePrivate || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50">
              <span className="font-bold text-slate-500">Nội tỉnh (Tổng cộng)</span>
              <span className="font-black text-slate-800">{(finalMetrics.newEnrollmentStats?.inProvince || 0).toLocaleString()} HS</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50">
              <span className="font-bold text-slate-500">Ngoại tỉnh</span>
              <span className="font-black text-slate-800">{(finalMetrics.newEnrollmentStats?.outProvince || 0).toLocaleString()} HS</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1.5">
              <span className="font-bold text-slate-500">Nước ngoài</span>
              <span className="font-black text-slate-800">{(finalMetrics.newEnrollmentStats?.abroad || 0).toLocaleString()} HS</span>
            </div>
          </div>
        </div>

        {/* COLUMN RIGHT: HỌC SINH CHUYỂN ĐI */}
        <div className="bg-white rounded-2xl border-2 border-rose-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 text-rose-600 bg-rose-50 rounded-lg flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Báo cáo Học sinh Chuyển đi</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">Phân tích điểm đến của học sinh chuyển trường</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng sỹ số chuyển đi</span>
              <span className="text-2xl font-black text-rose-600 block mt-1">{(finalMetrics.transferOutStats?.total || 0).toLocaleString()}</span>
            </div>
            <div className="p-4 rounded-xl bg-rose-50/30 border border-rose-100/50 text-center">
              <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Nội tỉnh (sang Tư thục)</span>
              <span className="text-2xl font-black text-rose-700 block mt-1">{(finalMetrics.transferOutStats?.inProvincePrivate || 0).toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50">
              <span className="font-bold text-slate-500">Nội tỉnh (Tổng cộng)</span>
              <span className="font-black text-slate-800">{(finalMetrics.transferOutStats?.inProvince || 0).toLocaleString()} HS</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50">
              <span className="font-bold text-slate-500">Ngoại tỉnh</span>
              <span className="font-black text-slate-800">{(finalMetrics.transferOutStats?.outProvince || 0).toLocaleString()} HS</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1.5">
              <span className="font-bold text-slate-500">Nước ngoài</span>
              <span className="font-black text-slate-800">{(finalMetrics.transferOutStats?.abroad || 0).toLocaleString()} HS</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
