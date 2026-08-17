"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Users, TrendingUp, User, 
  ArrowLeftRight, LogOut, CheckCircle2,
  UserCheck, Search, Filter, Sparkles, UserPlus, UserMinus,
  ChevronRight, Calendar, MapPin
} from "lucide-react"
import { 
  ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend 
} from "recharts"

export function ClassDetailClient({
  classId,
  classInfo,
  isGVCNOfThisClass,
  totalStudents,
  completionRate,
  averageSatisfaction,
  nps,
  forms,
  monthlyHeadcount,
  studentMovements
}: {
  classId: string
  classInfo: any
  isGVCNOfThisClass: boolean
  totalStudents: number
  completionRate: number
  averageSatisfaction: number
  nps: number
  forms: any[]
  monthlyHeadcount: any[]
  studentMovements: any[]
}) {
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [genderFilter, setGenderFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Vietnamese alphabetical sorting & search filtering
  const getVietnameseSortKey = (fullName: string) => {
    if (!fullName) return ""
    const parts = fullName.trim().split(/\s+/)
    const firstName = parts[parts.length - 1] || ""
    const rest = parts.slice(0, parts.length - 1).join(" ")
    return `${firstName.toLowerCase()} | ${rest.toLowerCase()}`
  }

  const processedStudents = useMemo(() => {
    if (!classInfo.students) return []
    
    // Sort students by Vietnamese alphabet
    let result = [...classInfo.students].sort((a, b) => {
      const keyA = getVietnameseSortKey(a.studentName || "")
      const keyB = getVietnameseSortKey(b.studentName || "")
      return keyA.localeCompare(keyB, "vi-VN")
    })

    // Filter by search term
    if (searchTerm.trim() !== "") {
      const lowerSearch = searchTerm.toLowerCase()
      result = result.filter(s => 
        (s.studentName || "").toLowerCase().includes(lowerSearch) || 
        (s.studentCode || "").toLowerCase().includes(lowerSearch)
      )
    }

    // Filter by gender
    if (genderFilter !== "all") {
      result = result.filter(s => {
        const g = (s.gender || "").toLowerCase()
        if (genderFilter === "male") return g === "male" || g === "nam"
        if (genderFilter === "female") return g === "female" || g === "nữ" || g === "nu"
        return true
      })
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter(s => {
        if (statusFilter === "transferred") return s.status === "TRANSFERRED_OUT"
        if (statusFilter === "active") {
          return s.status === "ACTIVE"
        }
        return true
      })
    }

    return result
  }, [classInfo.students, searchTerm, genderFilter, statusFilter])

  // Count movements for the quick dashboard
  const movementCounts = useMemo(() => {
    return {
      in: studentMovements.filter(m => m.type === "IN").length,
      out: studentMovements.filter(m => m.type === "OUT").length,
      change: studentMovements.filter(m => m.type === "CHANGE_CLASS").length
    }
  }, [studentMovements])

  // Format date helper
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "---"
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return "---"
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
  }

  // Gender translate helper
  const translateGender = (g: string | null) => {
    if (!g) return "Chưa rõ"
    const lower = g.toLowerCase()
    if (lower === "male" || lower === "nam") return "Nam"
    if (lower === "female" || lower === "nữ" || lower === "nu") return "Nữ"
    return g
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-16">
      {/* 1. Page Header and Glassmorphism Banner */}
      <div className="space-y-4">
        <div>
          <Link href="/teacher/classes" className="inline-flex items-center text-xs font-bold text-[#48BFE3] hover:text-[#008f85] transition-colors gap-1">
            &larr; Quay lại danh sách lớp học
          </Link>
        </div>

        {/* Premium Dashboard Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#48BFE3] via-[#008b81] to-[#046e66] text-white p-6 sm:p-8 shadow-lg shadow-teal-900/10">
          {/* Decorative absolute glow or circles */}
          <div className="absolute right-0 top-0 -mt-12 -mr-12 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 -mb-16 w-48 h-48 bg-teal-400/10 rounded-full blur-xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-3">
              {isGVCNOfThisClass && (
                <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase text-teal-100">
                  <Sparkles className="w-3 h-3 text-teal-200" />
                  Không gian Giáo viên Chủ nhiệm
                </span>
              )}
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none drop-shadow-sm">{classInfo.className}</h1>
              
              <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-teal-50">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 opacity-80" />
                  Cơ sở: <strong className="text-white font-bold">{classInfo.campus?.campusName || "N/A"}</strong>
                </span>
                <span className="hidden sm:inline opacity-40">|</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 opacity-80" />
                  Năm học: <strong className="text-white font-bold">{classInfo.academicYear?.name || "N/A"}</strong>
                </span>
                <span className="hidden sm:inline opacity-40">|</span>
                <span className="bg-white/10 px-2.5 py-0.5 rounded-md font-bold text-white border border-white/5">
                  Mã lớp: {classInfo.classCode}
                </span>
              </div>
            </div>

            {/* Quick overview metric panel (GVCN specific) */}
            {isGVCNOfThisClass && (
              <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex-shrink-0 self-start md:self-auto shadow-inner">
                <div className="text-center px-4 border-r border-white/10">
                  <p className="text-[10px] text-teal-150 font-bold uppercase tracking-wider">Sỹ số</p>
                  <p className="text-2xl font-black text-white mt-1 flex items-center justify-center gap-1">
                    <Users className="w-5 h-5 text-teal-200" />
                    {totalStudents}
                  </p>
                </div>
                <div className="text-center px-4 border-r border-white/10">
                  <p className="text-[10px] text-teal-150 font-bold uppercase tracking-wider">Nhập mới</p>
                  <p className="text-2xl font-black text-white mt-1 flex items-center justify-center gap-1">
                    <UserPlus className="w-5 h-5 text-emerald-300" />
                    {movementCounts.in}
                  </p>
                </div>
                <div className="text-center px-4">
                  <p className="text-[10px] text-teal-150 font-bold uppercase tracking-wider">Chuyển đi</p>
                  <p className="text-2xl font-black text-white mt-1 flex items-center justify-center gap-1">
                    <UserMinus className="w-5 h-5 text-rose-300" />
                    {movementCounts.out}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. KPI Cards Grid (Only visible for subject teachers, i.e., non-GVCN) */}
      {!isGVCNOfThisClass && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between min-h-[120px]">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tổng số Học sinh</h3>
             <div className="text-3xl font-black text-slate-800">{totalStudents}</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between min-h-[120px]">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tỷ lệ Hoàn thành Khảo sát</h3>
             <div className="text-3xl font-black text-slate-800">{completionRate > 100 ? 100 : completionRate.toFixed(1)}%</div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between min-h-[120px]">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hài lòng Trung bình</h3>
             <div className="text-3xl font-black text-slate-800">{averageSatisfaction.toFixed(1)} <span className="text-sm font-bold text-slate-400">/ 5.0</span></div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow flex flex-col justify-between min-h-[120px]">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Chỉ số NPS</h3>
             <div className="text-3xl font-black text-slate-800">{nps}</div>
          </div>
        </div>
      )}

      {/* 3. Main content display */}
      {!isGVCNOfThisClass ? (
        /* SURVEY RESULTS VIEW FOR SUBJECT TEACHERS */
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Trạng thái Khảo sát theo Học sinh</h3>
            
            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm học sinh, mã số..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full text-xs font-semibold pl-10 pr-4 py-2 border border-slate-200 bg-white rounded-xl focus:ring-2 focus:ring-[#48BFE3] outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="text-slate-500 text-xs font-bold bg-slate-50/70 border-b border-slate-200">
                <tr>
                  <th className="p-4 font-bold border-r border-slate-100">Mã Học sinh</th>
                  <th className="p-4 font-bold border-r border-slate-100">Họ và Tên</th>
                  <th className="p-4 font-bold border-r border-slate-100">Số tài khoản Phụ huynh</th>
                  <th className="p-4 font-bold">Trạng thái Khảo sát</th>
                </tr>
              </thead>
              <tbody>
                {processedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center p-12 text-slate-400 text-xs font-semibold">
                      {searchTerm ? "Không tìm thấy học sinh phù hợp." : "Chưa có học sinh nào trong danh sách lớp."}
                    </td>
                  </tr>
                ) : (
                  processedStudents.map((student) => {
                    const studentForms = forms.filter(f => f.studentId === student.id)
                    const hasSubmitted = studentForms.some(f => f.status === "SUBMITTED" || f.status === "ĐÃ HOÀN THÀNH")
                    
                    return (
                      <tr key={student.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors text-xs font-semibold">
                        <td className="p-4 font-black text-slate-800 border-r border-slate-100">{student.studentCode}</td>
                        <td className="p-4 font-black text-slate-700 border-r border-slate-100">{student.studentName}</td>
                        <td className="p-4 border-r border-slate-100 text-slate-500">{student.parents?.length || 0} tài khoản</td>
                        <td className="p-4">
                          {hasSubmitted ? (
                            <Link 
                              href={`/teacher/classes/${classId}/${studentForms.find(f => f.status === "SUBMITTED" || f.status === "ĐÃ HOÀN THÀNH")?.id}`} 
                              className="inline-flex items-center gap-1 text-[#48BFE3] hover:bg-teal-50 border border-teal-200/40 px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wide transition-all shadow-sm bg-teal-50/30"
                            >
                              ĐÃ HOÀN THÀNH
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 border border-slate-200/60 px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wide">
                              CHƯA KHẢO SÁT
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* HOMEROOM VIEW FOR GVCN */
        <div className="space-y-8">
          
          {/* SECTION: CHART AND TIMELINE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Chart Card: Headcount trend */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between lg:col-span-2 hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div className="w-10 h-10 text-teal-600 flex items-center justify-center bg-teal-50 rounded-xl">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Theo dõi Sỹ số theo Tháng</h3>
                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-widest mt-0.5">Biến động tổng số học sinh trong năm học</p>
                  </div>
                </div>
                
                <div className="h-64 w-full pr-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyHeadcount} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#48BFE3" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#48BFE3" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="month" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={8} className="font-semibold" />
                      <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dx={-5} domain={['auto', 'auto']} className="font-semibold" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgb(0 0 0 / 0.05)', fontSize: '11px', fontFamily: 'inherit' }}
                        labelStyle={{ fontWeight: '800', color: '#1e293b', marginBottom: '4px' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingBottom: '10px' }} />
                      <Line type="monotone" dataKey="count" stroke="#48BFE3" strokeWidth={3.5} activeDot={{ r: 6, strokeWidth: 0 }} name="Sỹ số học sinh" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Timeline Card: Student movements */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
                  <div className="w-10 h-10 text-emerald-600 flex items-center justify-center bg-emerald-50 rounded-xl">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">Hệ thống Luân chuyển</h3>
                    <p className="text-[10px] text-slate-450 font-bold uppercase tracking-widest mt-0.5">Nhật ký chuyển lớp, chuyển trường, nhập học</p>
                  </div>
                </div>

                {/* Timeline vertical line list */}
                <div className="relative flex-1 overflow-y-auto max-h-64 pr-2 space-y-6">
                  {studentMovements.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 text-xs font-semibold">
                      Chưa ghi nhận biến động luân chuyển nào.
                    </div>
                  ) : (
                    <>
                      {/* Vertical line connector */}
                      <div className="absolute left-[17px] top-2 bottom-2 w-0.5 border-l border-dashed border-slate-200 pointer-events-none" />
                      
                      {studentMovements.map((item, idx) => {
                        let dotColor = "border-emerald-500 bg-emerald-50 text-emerald-600"
                        let typeLabel = "Nhập học mới"
                        let pillColor = "bg-emerald-50 text-emerald-700 border-emerald-100"

                        if (item.type === "OUT") {
                          dotColor = "border-rose-500 bg-rose-50 text-rose-600"
                          typeLabel = "Chuyển đi"
                          pillColor = "bg-rose-50 text-rose-700 border-rose-100"
                        } else if (item.type === "CHANGE_CLASS") {
                          dotColor = "border-amber-500 bg-amber-50 text-amber-600"
                          typeLabel = "Chuyển lớp"
                          pillColor = "bg-amber-50 text-amber-700 border-amber-100"
                        }

                        return (
                          <div key={item.id} className="relative flex items-start gap-4 text-xs font-semibold pl-1">
                            {/* Dot ring indicator */}
                            <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${dotColor} shadow-sm`}>
                              <span className="text-[9px] font-black">{idx + 1}</span>
                            </div>
                            
                            <div className="space-y-1 min-w-0 flex-1 bg-slate-50/50 p-3 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${pillColor}`}>
                                  {typeLabel}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold">{formatDate(item.transferDate)}</span>
                              </div>
                              <p className="text-slate-800 font-extrabold leading-tight mt-1">
                                {item.studentName} <span className="text-slate-400 font-bold">({item.studentCode})</span>
                              </p>
                              {item.type === "OUT" && (
                                <p className="text-[10px] text-slate-500 font-medium leading-snug">
                                  Trường đi: <strong className="text-slate-700">{item.destinationSchool || "Chưa rõ"}</strong>
                                  {item.reason && ` • Lý do: ${item.reason}`}
                                </p>
                              )}
                              {item.type === "CHANGE_CLASS" && (
                                <p className="text-[10px] text-slate-500 font-medium leading-snug">
                                  {item.reason && `Lý do: ${item.reason}`}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: STUDENT LIST TABLE WITH FILTER CONTROLS */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
            {/* Header section with table controls */}
            <div className="p-6 border-b border-slate-100 bg-slate-50/40 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center text-[#48BFE3]">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Hồ sơ Học sinh Lớp chủ nhiệm</h3>
                </div>
                <span className="text-[9px] text-[#48BFE3] font-extrabold uppercase tracking-widest bg-teal-50 border border-teal-100/60 px-3 py-1 rounded-full">
                  Sắp xếp Alpha Tiếng Việt
                </span>
              </div>

              {/* Dynamic search & multi-filtering controls */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Tìm tên hoặc mã học sinh..."
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2 border border-slate-250 bg-white rounded-xl focus:ring-2 focus:ring-[#48BFE3] outline-none"
                  />
                </div>

                {/* Gender filter */}
                <div className="relative">
                  <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={genderFilter}
                    onChange={e => setGenderFilter(e.target.value)}
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2 border border-slate-250 bg-white rounded-xl focus:ring-2 focus:ring-[#48BFE3] outline-none cursor-pointer appearance-none"
                  >
                    <option value="all">Tất cả Giới tính</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                  </select>
                </div>

                {/* Status filter */}
                <div className="relative">
                  <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="w-full text-xs font-semibold pl-9 pr-3 py-2 border border-slate-250 bg-white rounded-xl focus:ring-2 focus:ring-[#48BFE3] outline-none cursor-pointer appearance-none"
                  >
                    <option value="all">Tất cả Trạng thái</option>
                    <option value="active">Đang học</option>
                    <option value="transferred">Đã chuyển trường</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Student Data Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="text-slate-500 text-xs font-bold bg-slate-50/70 border-b border-slate-200">
                  <tr>
                    <th className="p-4 border-r border-slate-100">Mã Học sinh</th>
                    <th className="p-4 border-r border-slate-100">Họ và Tên</th>
                    <th className="p-4 border-r border-slate-100">Ngày sinh</th>
                    <th className="p-4 border-r border-slate-100">Giới tính</th>
                    <th className="p-4">Biến động / Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {processedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center p-12 text-slate-400 text-xs font-semibold">
                        Không tìm thấy học sinh nào phù hợp bộ lọc.
                      </td>
                    </tr>
                  ) : (
                    processedStudents.map((student) => {
                      // Determine if student has any transfer status
                      const transfers = student.studentTransfers || []
                      const lastTransfer = transfers[transfers.length - 1]
                      
                      let statusText = "Đang học"
                      let statusColor = "bg-teal-50 text-teal-700 border-teal-100"
                      
                      if (student.status === "TRANSFERRED_OUT") {
                        statusText = "Đã chuyển trường"
                        statusColor = "bg-rose-50 text-rose-700 border-rose-100"
                        if (lastTransfer && lastTransfer.type === "OUT") {
                          statusText = `Đã chuyển trường (${formatDate(lastTransfer.transferDate)})`
                        }
                      } else if (student.status === "ACTIVE" && lastTransfer) {
                        if (lastTransfer.type === "IN") {
                          statusText = `Nhập học mới (${formatDate(lastTransfer.transferDate)})`
                          statusColor = "bg-emerald-50 text-emerald-700 border-emerald-100"
                        } else if (lastTransfer.type === "CHANGE_CLASS") {
                          statusText = `Nhập học/Chuyển lớp (${formatDate(lastTransfer.transferDate)})`
                          statusColor = "bg-amber-50 text-amber-700 border-amber-100"
                        }
                      }

                      return (
                        <tr key={student.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors text-xs font-semibold">
                          <td className="p-4 font-black text-slate-800 border-r border-slate-100">{student.studentCode}</td>
                          <td className="p-4 font-black text-slate-700 border-r border-slate-100">{student.studentName}</td>
                          <td className="p-4 border-r border-slate-100 text-slate-500">{formatDate(student.dateOfBirth)}</td>
                          <td className="p-4 border-r border-slate-100">
                            <span className={`px-2.5 py-0.5 rounded-full border font-bold text-[10px] ${
                              translateGender(student.gender) === "Nam" 
                                ? "bg-sky-50 text-sky-700 border-sky-100" 
                                : translateGender(student.gender) === "Nữ"
                                ? "bg-rose-50 text-rose-700 border-rose-100"
                                : "bg-slate-50 text-slate-700 border-slate-100"
                            }`}>
                              {translateGender(student.gender)}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-lg border font-black text-[10px] ${statusColor}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
