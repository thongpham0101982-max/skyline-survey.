"use client"
import { useEffect, useState, useCallback } from "react"
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
  Loader2,
  GraduationCap,
  Building2,
  PieChart as PieIcon,
  UserCheck,
  Search,
  Filter,
  Sparkles,
  BookOpen,
  ChevronRight,
  RefreshCw,
  Clock,
  Radio
} from "lucide-react"
import { WelcomeAlert } from "@/components/WelcomeAlert"
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts"

// CHUẨN MÀU CƠ SỞ THEO YÊU CẦU:
// CS1: Xanh Sky-Line (#00A99D)
// CS2: Xanh Sky-Line pha màu tím (#6C5CE7)
// CS3: Màu tím than đậm (#2E1065)
// CS4: Màu vàng đất (#D97706)
// CS5: Màu xám xanh (#475569)
const CAMPUS_COLOR_MAP: Record<string, { name: string; color: string; bg: string; border: string; text: string }> = {
  "CS1": { name: "Cơ sở 1 (Sky-Line Central)", color: "#00A99D", bg: "bg-teal-50", border: "border-teal-200", text: "text-[#00A99D]" },
  "CS2": { name: "Cơ sở 2 (Sky-Line Riverside)", color: "#6C5CE7", bg: "bg-indigo-50", border: "border-indigo-200", text: "text-[#6C5CE7]" },
  "CS3": { name: "Cơ sở 3 (Sky-Line Hill)", color: "#2E1065", bg: "bg-purple-950/10", border: "border-purple-900/30", text: "text-[#2E1065]" },
  "CS4": { name: "Cơ sở 4 (Sky-Line International)", color: "#D97706", bg: "bg-amber-50", border: "border-amber-200", text: "text-[#D97706]" },
  "CS5": { name: "Cơ sở 5 (Sky-Line Global)", color: "#475569", bg: "bg-slate-100", border: "border-slate-300", text: "text-[#475569]" },
}

const getCampusInfo = (nameOrCode: string) => {
  const str = String(nameOrCode || "").toUpperCase()
  if (str.includes("CS1") || str.includes("CƠ SỞ 1") || str.includes("CENTRAL") || str === "1") return CAMPUS_COLOR_MAP["CS1"]
  if (str.includes("CS2") || str.includes("CƠ SỞ 2") || str.includes("RIVERSIDE") || str === "2") return CAMPUS_COLOR_MAP["CS2"]
  if (str.includes("CS3") || str.includes("CƠ SỞ 3") || str.includes("HILL") || str === "3") return CAMPUS_COLOR_MAP["CS3"]
  if (str.includes("CS4") || str.includes("CƠ SỞ 4") || str.includes("BEACH") || str.includes("INTERNATIONAL") || str === "4") return CAMPUS_COLOR_MAP["CS4"]
  if (str.includes("CS5") || str.includes("CƠ SỞ 5") || str.includes("GLOBAL") || str === "5") return CAMPUS_COLOR_MAP["CS5"]
  return { name: nameOrCode || "Khác", color: "#00A99D", bg: "bg-teal-50", border: "border-teal-200", text: "text-[#00A99D]" }
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string>("")
  const [isAutoRefresh, setIsAutoRefresh] = useState(true)

  // Filters for Entry Level Students
  const [entryGradeFilter, setEntryGradeFilter] = useState<string>("ALL")
  const [entrySourceFilter, setEntrySourceFilter] = useState<string>("ALL")
  const [entryCampusFilter, setEntryCampusFilter] = useState<string>("ALL")
  const [entrySearchQuery, setEntrySearchQuery] = useState<string>("")

  const userName = session?.user?.name || "Thành viên"

  const fetchMetrics = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true)
    try {
      const yearId = localStorage.getItem("selectedAcademicYear") || "";
      const r = await fetch("/api/check-he-thong?action=getMetrics&academicYearId=" + yearId + "&_t=" + Date.now())
      if (r.ok) {
        const data = await r.json()
        setMetrics(data)
        const now = new Date()
        setLastUpdated(now.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      }
    } catch (e) {
      console.error("Failed to load dashboard metrics:", e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()

    window.addEventListener("academicYearChanged", () => fetchMetrics())
    return () => window.removeEventListener("academicYearChanged", () => fetchMetrics())
  }, [fetchMetrics])

  // Realtime Auto-refresh Interval (mỗi 30s)
  useEffect(() => {
    if (!isAutoRefresh) return
    const timer = setInterval(() => {
      fetchMetrics(true)
    }, 30000)
    return () => clearInterval(timer)
  }, [isAutoRefresh, fetchMetrics])

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="w-12 h-12 text-[#00A99D] animate-spin opacity-80" />
        <p className="text-slate-500 font-bold tracking-wider uppercase text-xs">Đang tải dữ liệu Realtime...</p>
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
    transferOutStats: { total: 0, inProvince: 0, outProvince: 0, abroad: 0, inProvincePrivate: 0 },
    gradeDistribution: [],
    campusDistribution: [],
    levelDistribution: [],
    entryLevelStats: { total: 0, grade1: { total: 0, surveyCount: 0, preschoolCount: 0 }, grade6: { total: 0, surveyCount: 0 }, grade10: { total: 0, surveyCount: 0 }, students: [] }
  }

  const campusIds = (session?.user as any)?.campusIds || []

  // Entry Level Students Filtering
  const rawEntryStudents = finalMetrics.entryLevelStats?.students || []
  const filteredEntryStudents = rawEntryStudents.filter((s: any) => {
    if (entryGradeFilter !== "ALL" && s.rawGrade !== entryGradeFilter) return false
    if (entrySourceFilter !== "ALL" && s.source !== entrySourceFilter) return false
    if (entryCampusFilter !== "ALL") {
      const info = getCampusInfo(s.campusName)
      if (!s.campusName?.includes(entryCampusFilter) && info.name !== entryCampusFilter) return false
    }
    if (entrySearchQuery.trim()) {
      const q = entrySearchQuery.trim().toLowerCase()
      const matchName = s.studentName?.toLowerCase().includes(q)
      const matchCode = s.studentCode?.toLowerCase().includes(q)
      const matchClass = s.className?.toLowerCase().includes(q)
      const matchCampus = s.campusName?.toLowerCase().includes(q)
      if (!matchName && !matchCode && !matchClass && !matchCampus) return false
    }
    return true
  })

  // Level Colors
  const LEVEL_COLORS: Record<string, string> = {
    "Mầm non": "#f43f5e",
    "Tiểu học": "#00A99D",
    "THCS": "#6C5CE7",
    "THPT": "#2E1065",
    "Khác": "#94a3b8"
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <WelcomeAlert name={userName} />
      
      {/* REALTIME DASHBOARD TOP BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#003B3A] tracking-tight">Tổng quan Hệ thống Realtime</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Realtime
            </span>
          </div>
          <p className="text-slate-500 text-sm font-medium mt-0.5">
            Năm học: <span className="font-bold text-[#00A99D]">{finalMetrics.academicYearName || "---"}</span> | Cập nhật gần nhất: <span className="font-bold text-slate-700">{lastUpdated || "Ngay bây giờ"}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
          {/* TOGGLE AUTO REFRESH */}
          <button
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
              isAutoRefresh 
                ? "bg-teal-50 text-[#00A99D] border-teal-200 shadow-2xs" 
                : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isAutoRefresh ? 'animate-pulse text-[#00A99D]' : ''}`} />
            Auto-refresh (30s): <strong>{isAutoRefresh ? "BẬT" : "TẮT"}</strong>
          </button>

          {/* MANUAL REFRESH BUTTON */}
          <button
            onClick={() => fetchMetrics()}
            disabled={refreshing}
            className="px-3.5 py-1.5 bg-[#003B3A] hover:bg-[#002b2a] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới ngay
          </button>

          {campusIds.length > 0 && (
            <span className="px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs">
              Đang lọc: {campusIds.length} Cơ sở
            </span>
          )}
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        
        {/* CARD 1: TỔNG HỌC SINH */}
        <div className="relative bg-white rounded-2xl border-2 border-teal-100 p-5 shadow-xs hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-[#00A99D] bg-teal-50 rounded-xl shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tổng Học sinh toàn trường</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.totalStudents.toLocaleString()}</h3>
            </div>
          </div>
        </div>

        {/* CARD 2: SỐ LỚP CƠ SỞ */}
        <div className="relative bg-white rounded-2xl border-2 border-indigo-100 p-5 shadow-xs hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-[#6C5CE7] bg-indigo-50 rounded-xl shadow-2xs">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Lớp học Cơ sở</p>
              <h3 className="text-2xl font-black text-slate-800 mt-1">{finalMetrics.totalClasses}</h3>
              <div className="text-[11px] text-slate-500 font-semibold mt-1 space-x-2">
                <span>Phổ thông: <strong className="text-[#6C5CE7]">{finalMetrics.generalClasses || 0}</strong></span>
                <span>•</span>
                <span>Mầm non: <strong className="text-rose-500">{finalMetrics.preschoolClasses || 0}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 3: HỌC SINH LƯU CHUYỂN */}
        <div className="relative bg-white rounded-2xl border-2 border-amber-100 p-5 shadow-xs hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-[#D97706] bg-amber-50 rounded-xl shadow-2xs">
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
                <span>Lớp: <strong className="text-[#00A99D]">{finalMetrics.changeClassCount || 0}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* CARD 4: TỶ LỆ HOÀN THÀNH */}
        <div className="relative bg-white rounded-2xl border-2 border-slate-200 p-5 shadow-xs hover:shadow-md transition-all duration-300 group overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-[#475569] bg-slate-100 rounded-xl shadow-2xs">
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
        <div className="bg-white rounded-2xl border-2 border-slate-100 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 text-[#00A99D] flex items-center justify-center bg-teal-50 rounded-xl font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-base">Theo dõi Diễn biến Sỹ số Học sinh theo Thống kê Tháng</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                  Biểu diễn diễn biến biến động tổng số học sinh đang học theo từng tháng
                </p>
              </div>
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
                <Line type="monotone" dataKey="generalCount" stroke="#00A99D" strokeWidth={3} activeDot={{ r: 6 }} name="Sỹ số Phổ thông" />
                <Line type="monotone" dataKey="preschoolCount" stroke="#f43f5e" strokeWidth={3} activeDot={{ r: 6 }} name="Sỹ số Mầm non" />
                <Line type="monotone" dataKey="count" stroke="#6C5CE7" strokeWidth={2} strokeDasharray="5 5" activeDot={{ r: 4 }} name="Tổng sỹ số" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: BIỂU ĐỒ PHÂN BỔ SỸ SỐ (KHỐI 1-12, BẬC HỌC, CƠ SỞ CHUẨN MÀU) */}
      {/* ======================================================== */}
      
      {/* 1.1 BIỂU ĐỒ SỸ SỐ HỌC SINH THEO KHỐI (KHỐI 1 ĐẾN KHỐI 12) */}
      <div className="bg-white rounded-2xl border-2 border-teal-100 p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 text-[#00A99D] bg-teal-50 rounded-xl flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Biểu đồ Sỹ số Học sinh theo Khối (Khối 1 - Khối 12)</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                Thống kê tổng sỹ số học sinh từ Khối 1 đến Khối 12 phân lớp thực tế trong Quản lý Lớp học
              </p>
            </div>
          </div>
        </div>

        <div className="h-80 w-full pr-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={finalMetrics.gradeDistribution} margin={{ top: 15, right: 15, left: -15, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="label" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={{ stroke: '#e2e8f0' }} 
                interval={0}
                angle={-25}
                textAnchor="end"
                dy={5}
              />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dx={-5} domain={[0, 'auto']} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                cursor={{ fill: 'rgba(0, 169, 157, 0.05)' }}
                formatter={(value: any) => [`${value} Học sinh`, 'Sỹ số']}
              />
              <Bar dataKey="count" name="Sỹ số" radius={[8, 8, 0, 0]}>
                {finalMetrics.gradeDistribution?.map((entry: any, index: number) => {
                  const color = entry.level === "Mầm non" ? "#f43f5e" : entry.level === "Tiểu học" ? "#00A99D" : entry.level === "THCS" ? "#6C5CE7" : "#2E1065";
                  return <Cell key={`cell-${index}`} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chú giải phân loại theo bậc học */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-slate-50 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#00A99D] inline-block"></span>
            <span>Tiểu học (Khối 1 - 5)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#6C5CE7] inline-block"></span>
            <span>THCS (Khối 6 - 9)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#2E1065] inline-block"></span>
            <span>THPT (Khối 10 - 12)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f43f5e] inline-block"></span>
            <span>Mầm non</span>
          </div>
        </div>
      </div>

      {/* 1.2 GRID 2 BIỂU ĐỒ: THEO BẬC HỌC & THEO CƠ SỞ CHUẨN MÀU YÊU CẦU */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* BIỂU ĐỒ THEO BẬC HỌC */}
        <div className="bg-white rounded-2xl border-2 border-indigo-100 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 text-[#6C5CE7] bg-indigo-50 rounded-xl flex items-center justify-center font-bold">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Biểu đồ Sỹ số Học sinh theo Bậc học</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                Phân bổ sỹ số giữa Mầm non, Tiểu học, THCS, THPT
              </p>
            </div>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={finalMetrics.levelDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="level"
                  label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(1)}%`}
                  labelLine={false}
                >
                  {finalMetrics.levelDistribution?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={LEVEL_COLORS[entry.level] || "#94a3b8"} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value} Học sinh`, 'Sỹ số']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* BIỂU ĐỒ THEO CƠ SỞ - MÀU SẮC CHUẨN THEO YÊU CẦU */}
        <div className="bg-white rounded-2xl border-2 border-purple-100 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 text-[#2E1065] bg-purple-50 rounded-xl flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Biểu đồ Sỹ số Học sinh theo Cơ sở</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                Màu chuẩn: CS1 (Xanh Sky-Line), CS2 (Xanh tím), CS3 (Tím than), CS4 (Vàng đất), CS5 (Xám xanh)
              </p>
            </div>
          </div>

          <div className="h-72 w-full pr-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={finalMetrics.campusDistribution} margin={{ top: 15, right: 15, left: -15, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="campusName" stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dx={-5} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }}
                  formatter={(value: any) => [`${value} Học sinh`, 'Sỹ số']}
                />
                <Bar dataKey="count" name="Sỹ số Cơ sở" radius={[8, 8, 0, 0]}>
                  {finalMetrics.campusDistribution?.map((entry: any, index: number) => {
                    const info = getCampusInfo(entry.campusName || entry.campusCode);
                    return <Cell key={`cell-campus-${index}`} fill={info.color} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* LEGEND CHÚ GIẢI MÀU CƠ SỞ CHUẨN */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-slate-100 text-[11px] font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md inline-block bg-[#00A99D]"></span>
              <span className="text-[#00A99D]">CS1: Xanh Sky-Line</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md inline-block bg-[#6C5CE7]"></span>
              <span className="text-[#6C5CE7]">CS2: Xanh tím</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md inline-block bg-[#2E1065]"></span>
              <span className="text-[#2E1065]">CS3: Tím than</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md inline-block bg-[#D97706]"></span>
              <span className="text-[#D97706]">CS4: Vàng đất</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md inline-block bg-[#475569]"></span>
              <span className="text-[#475569]">CS5: Xám xanh</span>
            </div>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* SECTION 2: CHỨC NĂNG QUẢN LÝ HỌC SINH ĐẦU CẤP (KHỐI 1, KHỐI 9, KHỐI 10) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border-2 border-teal-100 p-6 shadow-xs space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 text-[#00A99D] bg-teal-50 rounded-xl flex items-center justify-center font-black shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Quản lý & Phân tích Học sinh Đầu cấp</h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">
                Thống kê học sinh các khối đầu cấp: <strong className="text-[#00A99D]">Khối 1</strong>, <strong className="text-[#6C5CE7]">Khối 6</strong>, <strong className="text-[#2E1065]">Khối 10</strong> phân loại theo nguồn nhập học
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3.5 py-1.5 bg-teal-50 text-[#00A99D] rounded-xl border border-teal-200 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
              <UserCheck className="w-4 h-4 text-[#00A99D]" />
              Tổng HS Đầu cấp: {finalMetrics.entryLevelStats?.total || 0} HS
            </span>
          </div>
        </div>

        {/* SUMMARY STAT CARDS CHO KHỐI 1, 9, 10 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* KHỐI 1 CARD */}
          <div className="bg-gradient-to-br from-teal-50/60 to-emerald-50/40 rounded-2xl border-2 border-teal-100 p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-[#00A99D] text-white rounded-lg text-xs font-black uppercase tracking-wider">Khối 1</span>
              <span className="text-xs font-bold text-slate-500">Tổng: <strong className="text-[#00A99D] text-base font-black">{finalMetrics.entryLevelStats?.grade1?.total || 0}</strong> HS</span>
            </div>
            <div className="space-y-2 pt-1 border-t border-teal-100/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#00A99D]"></span> Nhập học qua Khảo sát:
                </span>
                <strong className="text-[#00A99D] font-black">{finalMetrics.entryLevelStats?.grade1?.surveyCount || 0} HS</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#D97706]"></span> Chuyển từ Mẫu giáo lớn:
                </span>
                <strong className="text-[#D97706] font-black">{finalMetrics.entryLevelStats?.grade1?.preschoolCount || 0} HS</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Trực tiếp / Khác:
                </span>
                <strong className="text-slate-700 font-black">{finalMetrics.entryLevelStats?.grade1?.otherCount || 0} HS</strong>
              </div>
            </div>
          </div>

          {/* KHỐI 9 CARD */}
          <div className="bg-gradient-to-br from-indigo-50/60 to-blue-50/40 rounded-2xl border-2 border-indigo-100 p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-[#6C5CE7] text-white rounded-lg text-xs font-black uppercase tracking-wider">Khối 6</span>
              <span className="text-xs font-bold text-slate-500">Tổng: <strong className="text-[#6C5CE7] text-base font-black">{finalMetrics.entryLevelStats?.grade6?.total || 0}</strong> HS</span>
            </div>
            <div className="space-y-2 pt-1 border-t border-indigo-100/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#6C5CE7]"></span> Nhập học qua Khảo sát:
                </span>
                <strong className="text-[#6C5CE7] font-black">{finalMetrics.entryLevelStats?.grade6?.surveyCount || 0} HS</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Trực tiếp / Khác:
                </span>
                <strong className="text-slate-700 font-black">{finalMetrics.entryLevelStats?.grade6?.otherCount || 0} HS</strong>
              </div>
            </div>
          </div>

          {/* KHỐI 10 CARD */}
          <div className="bg-gradient-to-br from-purple-50/60 to-fuchsia-50/40 rounded-2xl border-2 border-purple-100 p-5 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-[#2E1065] text-white rounded-lg text-xs font-black uppercase tracking-wider">Khối 10</span>
              <span className="text-xs font-bold text-slate-500">Tổng: <strong className="text-[#2E1065] text-base font-black">{finalMetrics.entryLevelStats?.grade10?.total || 0}</strong> HS</span>
            </div>
            <div className="space-y-2 pt-1 border-t border-purple-100/80">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#2E1065]"></span> Nhập học qua Khảo sát:
                </span>
                <strong className="text-[#2E1065] font-black">{finalMetrics.entryLevelStats?.grade10?.surveyCount || 0} HS</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Trực tiếp / Khác:
                </span>
                <strong className="text-slate-700 font-black">{finalMetrics.entryLevelStats?.grade10?.otherCount || 0} HS</strong>
              </div>
            </div>
          </div>

        </div>

        {/* BỘ LỌC VÀ TÌM KIẾM HỌC SINH ĐẦU CẤP DẠNG MULTI-FILTER */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
          
          {/* SEARCH BOX */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã HS, lớp..."
              value={entrySearchQuery}
              onChange={(e) => setEntrySearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#00A99D] transition-all"
            />
          </div>

          {/* FILTER BUTTONS & DROPDOWNS */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            
            {/* LỌC KHỐI */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
              <button
                onClick={() => setEntryGradeFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-all ${entryGradeFilter === "ALL" ? "bg-white text-[#00A99D] shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Tất cả khối
              </button>
              <button
                onClick={() => setEntryGradeFilter("1")}
                className={`px-3 py-1.5 rounded-lg transition-all ${entryGradeFilter === "1" ? "bg-[#00A99D] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Khối 1
              </button>
              <button
                onClick={() => setEntryGradeFilter("6")}
                className={`px-3 py-1.5 rounded-lg transition-all ${entryGradeFilter === "6" ? "bg-[#6C5CE7] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Khối 6
              </button>
              <button
                onClick={() => setEntryGradeFilter("10")}
                className={`px-3 py-1.5 rounded-lg transition-all ${entryGradeFilter === "10" ? "bg-[#2E1065] text-white shadow-2xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Khối 10
              </button>
            </div>

            {/* LỌC CƠ SỞ CHUẨN MÀU */}
            <select
              value={entryCampusFilter}
              onChange={(e) => setEntryCampusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#00A99D]"
            >
              <option value="ALL">-- Tất cả cơ sở --</option>
              <option value="CS1">CS1 (Sky-Line Central - Xanh Sky-Line)</option>
              <option value="CS2">CS2 (Sky-Line Riverside - Xanh tím)</option>
              <option value="CS3">CS3 (Sky-Line Hill - Tím than)</option>
              <option value="CS4">CS4 (Sky-Line International - Vàng đất)</option>
              <option value="CS5">CS5 (Sky-Line Global - Xám xanh)</option>
            </select>

            {/* LỌC NGUỒN NHẬP HỌC */}
            <select
              value={entrySourceFilter}
              onChange={(e) => setEntrySourceFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-[#00A99D]"
            >
              <option value="ALL">-- Tất cả nguồn nhập học --</option>
              <option value="KHAO_SAT">Nhập học qua Khảo sát</option>
              <option value="MAU_GIAO_LON">Chuyển từ Mẫu giáo lớn</option>
              <option value="KHAC">Trực tiếp / Khác</option>
            </select>
          </div>

        </div>

        {/* BẢNG TRA CỨU DANH SÁCH HỌC SINH ĐẦU CẤP (HIỂN THỊ CƠ SỞ CHUẨN MÀU) */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs font-semibold text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">STT</th>
                <th className="py-3 px-4">Mã HS</th>
                <th className="py-3 px-4">Họ và Tên</th>
                <th className="py-3 px-4">Khối</th>
                <th className="py-3 px-4">Lớp học</th>
                <th className="py-3 px-4">Cơ sở</th>
                <th className="py-3 px-4">Nguồn nhập học đầu cấp</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredEntryStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    Không tìm thấy dữ liệu học sinh đầu cấp phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredEntryStudents.slice(0, 50).map((st: any, idx: number) => {
                  const campusInfo = getCampusInfo(st.campusName);
                  return (
                    <tr key={st.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-black text-slate-800">{st.studentCode}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{st.studentName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                          st.rawGrade === '1' ? 'bg-teal-100 text-[#00A99D]' :
                          st.rawGrade === '6' ? 'bg-indigo-100 text-[#6C5CE7]' :
                          'bg-purple-100 text-[#2E1065]'
                        }`}>
                          {st.grade}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">{st.className}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1.5 ${campusInfo.bg} ${campusInfo.border} ${campusInfo.text}`}>
                          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: campusInfo.color }}></span>
                          {st.campusName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {st.source === "KHAO_SAT" && (
                          <span className="px-2.5 py-1 bg-teal-50 text-[#00A99D] border border-teal-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#00A99D]" />
                            Qua Khảo sát
                          </span>
                        )}
                        {st.source === "MAU_GIAO_LON" && (
                          <span className="px-2.5 py-1 bg-amber-50 text-[#D97706] border border-amber-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                            <BookOpen className="w-3 h-3 text-[#D97706]" />
                            Từ Mẫu giáo lớn
                          </span>
                        )}
                        {st.source === "KHAC" && (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-semibold">
                            Trực tiếp / Khác
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-black uppercase">
                          Đang học
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
          {filteredEntryStudents.length > 50 && (
            <div className="p-3 bg-slate-50 text-center text-xs font-bold text-slate-500 border-t border-slate-100">
              Hiển thị 50 / {filteredEntryStudents.length} học sinh đầu cấp. Sử dụng bộ lọc hoặc từ khóa tìm kiếm để thu hẹp danh sách.
            </div>
          )}
        </div>

      </div>

      {/* SECTION: CHI TIẾT LUỒNG HỌC SINH (NHẬP HỌC MỚI & CHUYỂN ĐI) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* COLUMN LEFT: NHẬP HỌC MỚI */}
        <div className="bg-white rounded-2xl border-2 border-teal-100 p-6 shadow-xs space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 text-[#00A99D] bg-teal-50 rounded-lg flex items-center justify-center">
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
              <span className="text-2xl font-black text-[#00A99D] block mt-1">{(finalMetrics.newEnrollmentStats?.total || 0).toLocaleString()}</span>
            </div>
            <div className="p-4 rounded-xl bg-teal-50/40 border border-teal-100/60 text-center">
              <span className="text-[10px] font-bold text-[#00A99D] uppercase tracking-wider block">Nội tỉnh (Tư thục)</span>
              <span className="text-2xl font-black text-[#00A99D] block mt-1">{(finalMetrics.newEnrollmentStats?.inProvincePrivate || 0).toLocaleString()}</span>
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
        <div className="bg-white rounded-2xl border-2 border-rose-100 p-6 shadow-xs space-y-6">
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
