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
  Loader2,
  GraduationCap,
  Building2,
  PieChart as PieIcon,
  UserCheck,
  Search,
  Filter,
  Sparkles,
  BookOpen,
  ChevronRight
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

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Filters for Entry Level Students
  const [entryGradeFilter, setEntryGradeFilter] = useState<string>("ALL")
  const [entrySourceFilter, setEntrySourceFilter] = useState<string>("ALL")
  const [entrySearchQuery, setEntrySearchQuery] = useState<string>("")

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
    transferOutStats: { total: 0, inProvince: 0, outProvince: 0, abroad: 0, inProvincePrivate: 0 },
    gradeDistribution: [],
    campusDistribution: [],
    levelDistribution: [],
    entryLevelStats: { total: 0, grade1: { total: 0, surveyCount: 0, preschoolCount: 0 }, grade9: { total: 0, surveyCount: 0 }, grade10: { total: 0, surveyCount: 0 }, students: [] }
  }

  const campusIds = (session?.user as any)?.campusIds || []

  // Entry Level Students Filtering
  const rawEntryStudents = finalMetrics.entryLevelStats?.students || []
  const filteredEntryStudents = rawEntryStudents.filter((s: any) => {
    if (entryGradeFilter !== "ALL" && s.rawGrade !== entryGradeFilter) return false
    if (entrySourceFilter !== "ALL" && s.source !== entrySourceFilter) return false
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
    "Tiểu học": "#3b82f6",
    "THCS": "#10b981",
    "THPT": "#8b5cf6",
    "Khác": "#94a3b8"
  }

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
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-blue-600 bg-blue-50 rounded-xl shadow-xs">
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
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-indigo-600 bg-indigo-50 rounded-xl shadow-xs">
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
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-amber-600 bg-amber-50 rounded-xl shadow-xs">
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
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center text-emerald-600 bg-emerald-50 rounded-xl shadow-xs">
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
        <div className="bg-white rounded-2xl border-2 border-indigo-100 p-6 shadow-sm space-y-6">
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

      {/* ======================================================== */}
      {/* SECTION 1: BIỂU ĐỒ PHÂN BỔ SỸ SỐ (THEO KHỐI 1-12, BẬC HỌC, CƠ SỞ) */}
      {/* ======================================================== */}
      
      {/* 1.1 BIỂU ĐỒ SỸ SỐ HỌC SINH THEO KHỐI (KHỐI 1 ĐẾN KHỐI 12) */}
      <div className="bg-white rounded-2xl border-2 border-blue-100 p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 text-blue-600 bg-blue-50 rounded-xl flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Biểu đồ Sỹ số Học sinh theo Khối (Khối 1 - Khối 12)</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                Thống kê tổng sỹ số học sinh đang theo học chi tiết từ Khối 1 đến Khối 12
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
                cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                formatter={(value: any) => [`${value} Học sinh`, 'Sỹ số']}
              />
              <Bar dataKey="count" name="Sỹ số" radius={[8, 8, 0, 0]}>
                {finalMetrics.gradeDistribution?.map((entry: any, index: number) => {
                  const color = entry.level === "Mầm non" ? "#f43f5e" : entry.level === "Tiểu học" ? "#3b82f6" : entry.level === "THCS" ? "#10b981" : "#8b5cf6";
                  return <Cell key={`cell-${index}`} fill={color} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chú giải phân loại theo bậc học */}
        <div className="flex flex-wrap items-center justify-center gap-6 pt-2 border-t border-slate-50 text-xs font-bold text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block"></span>
            <span>Tiểu học (Khối 1 - 5)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <span>THCS (Khối 6 - 9)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500 inline-block"></span>
            <span>THPT (Khối 10 - 12)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
            <span>Mầm non</span>
          </div>
        </div>
      </div>

      {/* 1.2 GRID 2 BIỂU ĐỒ: THEO BẬC HỌC & THEO CƠ SỞ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* BIỂU ĐỒ THEO BẬC HỌC */}
        <div className="bg-white rounded-2xl border-2 border-emerald-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 text-emerald-600 bg-emerald-50 rounded-xl flex items-center justify-center font-bold">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Biểu đồ Sỹ số Học sinh theo Bậc học</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                Phân bổ sỹ số giữa các Bậc học Mầm non, Tiểu học, THCS, THPT
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

        {/* BIỂU ĐỒ THEO CƠ SỞ */}
        <div className="bg-white rounded-2xl border-2 border-purple-100 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-10 h-10 text-purple-600 bg-purple-50 rounded-xl flex items-center justify-center font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-base">Biểu đồ Sỹ số Học sinh theo Cơ sở</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5 uppercase tracking-wider">
                Phân bổ số lượng học sinh tại từng Cơ sở trường học
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
                  cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                  formatter={(value: any) => [`${value} Học sinh`, 'Sỹ số']}
                />
                <Bar dataKey="count" name="Sỹ số Cơ sở" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* SECTION 2: CHỨC NĂNG QUẢN LÝ HỌC SINH ĐẦU CẤP (KHỐI 1, KHỐI 9, KHỐI 10) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border-2 border-teal-100 p-6 shadow-sm space-y-6">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 text-[#00A99D] bg-teal-50 rounded-xl flex items-center justify-center font-black shadow-xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Quản lý & Phân tích Học sinh Đầu cấp</h2>
              <p className="text-xs text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">
                Thống kê học sinh các khối đầu cấp: <strong className="text-[#00A99D]">Khối 1</strong>, <strong className="text-indigo-600">Khối 9</strong>, <strong className="text-purple-600">Khối 10</strong> phân loại theo nguồn nhập học
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-xl border border-teal-200 text-xs font-extrabold flex items-center gap-1.5 shadow-2xs">
              <UserCheck className="w-4 h-4 text-teal-600" />
              Tổng HS Đầu cấp: {finalMetrics.entryLevelStats?.total || 0} HS
            </span>
          </div>
        </div>

        {/* SUMMARY STAT CARDS CHO KHỐI 1, 9, 10 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* KHỐI 1 CARD */}
          <div className="bg-gradient-to-br from-teal-50/50 to-emerald-50/30 rounded-2xl border-2 border-teal-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-teal-600 text-white rounded-lg text-xs font-black uppercase tracking-wider">Khối 1</span>
              <span className="text-xs font-bold text-slate-500">Tổng: <strong className="text-teal-700 text-base font-black">{finalMetrics.entryLevelStats?.grade1?.total || 0}</strong> HS</span>
            </div>
            <div className="space-y-2 pt-1 border-t border-teal-100/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Nhập học qua Khảo sát:
                </span>
                <strong className="text-emerald-700 font-black">{finalMetrics.entryLevelStats?.grade1?.surveyCount || 0} HS</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Chuyển từ Mẫu giáo lớn:
                </span>
                <strong className="text-amber-700 font-black">{finalMetrics.entryLevelStats?.grade1?.preschoolCount || 0} HS</strong>
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
          <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50/30 rounded-2xl border-2 border-indigo-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-black uppercase tracking-wider">Khối 9</span>
              <span className="text-xs font-bold text-slate-500">Tổng: <strong className="text-indigo-700 text-base font-black">{finalMetrics.entryLevelStats?.grade9?.total || 0}</strong> HS</span>
            </div>
            <div className="space-y-2 pt-1 border-t border-indigo-100/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Nhập học qua Khảo sát:
                </span>
                <strong className="text-indigo-700 font-black">{finalMetrics.entryLevelStats?.grade9?.surveyCount || 0} HS</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400"></span> Trực tiếp / Khác:
                </span>
                <strong className="text-slate-700 font-black">{finalMetrics.entryLevelStats?.grade9?.otherCount || 0} HS</strong>
              </div>
            </div>
          </div>

          {/* KHỐI 10 CARD */}
          <div className="bg-gradient-to-br from-purple-50/50 to-fuchsia-50/30 rounded-2xl border-2 border-purple-100 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-purple-600 text-white rounded-lg text-xs font-black uppercase tracking-wider">Khối 10</span>
              <span className="text-xs font-bold text-slate-500">Tổng: <strong className="text-purple-700 text-base font-black">{finalMetrics.entryLevelStats?.grade10?.total || 0}</strong> HS</span>
            </div>
            <div className="space-y-2 pt-1 border-t border-purple-100/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span> Nhập học qua Khảo sát:
                </span>
                <strong className="text-purple-700 font-black">{finalMetrics.entryLevelStats?.grade10?.surveyCount || 0} HS</strong>
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

        {/* BỘ LỌC VÀ TÌM KIẾM HỌC SINH ĐẦU CẤP */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
          
          {/* SEARCH BOX */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, mã HS, lớp..."
              value={entrySearchQuery}
              onChange={(e) => setEntrySearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
          </div>

          {/* FILTER BUTTONS */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            
            {/* LỌC KHỐI */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-xs font-bold">
              <button
                onClick={() => setEntryGradeFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-all ${entryGradeFilter === "ALL" ? "bg-white text-teal-700 shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Tất cả khối
              </button>
              <button
                onClick={() => setEntryGradeFilter("1")}
                className={`px-3 py-1.5 rounded-lg transition-all ${entryGradeFilter === "1" ? "bg-teal-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Khối 1
              </button>
              <button
                onClick={() => setEntryGradeFilter("9")}
                className={`px-3 py-1.5 rounded-lg transition-all ${entryGradeFilter === "9" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Khối 9
              </button>
              <button
                onClick={() => setEntryGradeFilter("10")}
                className={`px-3 py-1.5 rounded-lg transition-all ${entryGradeFilter === "10" ? "bg-purple-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"}`}
              >
                Khối 10
              </button>
            </div>

            {/* LỌC NGUỒN NHẬP HỌC */}
            <select
              value={entrySourceFilter}
              onChange={(e) => setEntrySourceFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              <option value="ALL">-- Tất cả nguồn nhập học --</option>
              <option value="KHAO_SAT">Nhập học qua Khảo sát</option>
              <option value="MAU_GIAO_LON">Chuyển từ Mẫu giáo lớn</option>
              <option value="KHAC">Trực tiếp / Khác</option>
            </select>
          </div>

        </div>

        {/* BẢNG TRA CỨU DANH SÁCH HỌC SINH ĐẦU CẤP */}
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
                filteredEntryStudents.slice(0, 50).map((st: any, idx: number) => (
                  <tr key={st.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-black text-slate-800">{st.studentCode}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{st.studentName}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                        st.rawGrade === '1' ? 'bg-teal-100 text-teal-800' :
                        st.rawGrade === '9' ? 'bg-indigo-100 text-indigo-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {st.grade}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">{st.className}</td>
                    <td className="py-3 px-4 font-semibold text-slate-600">{st.campusName}</td>
                    <td className="py-3 px-4">
                      {st.source === "KHAO_SAT" && (
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-emerald-500" />
                          Qua Khảo sát
                        </span>
                      )}
                      {st.source === "MAU_GIAO_LON" && (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-amber-500" />
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
                ))
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
