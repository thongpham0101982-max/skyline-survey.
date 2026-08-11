"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Calendar, Clock, BookOpen, Users, Building2, Filter, Sparkles, 
  CheckCircle, Search, Grid, List, RotateCcw, Sun, Moon,
  ChevronRight, AlertCircle, ArrowRight, Shield
} from "lucide-react"

interface TimetableSlotItem {
  id: string
  academicYearId?: string | null
  campusId?: string | null
  level: string
  grade: string
  classId?: string | null
  className: string
  dayOfWeek: string
  session: string
  periodNumber: number
  subjectId?: string | null
  subjectName?: string | null
  teacherId?: string | null
  teacherName?: string | null
  weekType: string
  altSubjectName?: string | null
  altTeacherName?: string | null
  colorCode?: string | null
}

interface TeacherTimetableProps {
  initialData: {
    success: boolean
    campuses: any[]
    selectedCampusId: string
    classes: any[]
    subjects: any[]
    teachers: any[]
    timetableSlots: TimetableSlotItem[]
    academicYear?: any
    currentTeacher?: any
  }
  mySlots?: TimetableSlotItem[]
}

const DAYS_OF_WEEK = [
  { key: "MONDAY", label: "Thứ 2" },
  { key: "TUESDAY", label: "Thứ 3" },
  { key: "WEDNESDAY", label: "Thứ 4" },
  { key: "THURSDAY", label: "Thứ 5" },
  { key: "FRIDAY", label: "Thứ 6" }
]

const PERIODS = [1, 2, 3, 4]

export default function TeacherTimetableLookupClient({ initialData, mySlots = [] }: TeacherTimetableProps) {
  const [activeTab, setActiveTab] = useState<"MY_SCHEDULE" | "SCHOOL_MATRIX">("MY_SCHEDULE")
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID")
  
  // Filter States for Personal Schedule
  const [filterDay, setFilterDay] = useState("all")
  const [filterSession, setFilterSession] = useState("all")
  const [filterPeriod, setFilterPeriod] = useState("all")
  const [filterSubject, setFilterSubject] = useState("all")
  const [filterClass, setFilterClass] = useState("all")
  const [filterWeekType, setFilterWeekType] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Filter States for Full School Matrix
  const [matrixCampusId, setMatrixCampusId] = useState(initialData.selectedCampusId || "")
  const [matrixLevel, setMatrixLevel] = useState("TIEU_HOC")

  const currentTeacher = initialData.currentTeacher

  // Raw personal slots
  const allMySlots = useMemo(() => {
    if (mySlots && mySlots.length > 0) return mySlots
    const tId = currentTeacher?.id
    const tName = currentTeacher?.teacherName
    if (!tId && !tName) return initialData.timetableSlots || []
    return (initialData.timetableSlots || []).filter(s => 
      (tId && s.teacherId === tId) || (tName && s.teacherName === tName)
    )
  }, [mySlots, initialData.timetableSlots, currentTeacher])

  // Filtered personal slots
  const filteredMySlots = useMemo(() => {
    return allMySlots.filter(slot => {
      if (filterDay !== "all" && slot.dayOfWeek !== filterDay) return false
      if (filterSession !== "all" && slot.session !== filterSession) return false
      if (filterPeriod !== "all" && String(slot.periodNumber) !== filterPeriod) return false
      if (filterSubject !== "all" && slot.subjectName !== filterSubject) return false
      if (filterClass !== "all" && slot.className !== filterClass) return false
      if (filterWeekType !== "all" && slot.weekType !== filterWeekType && slot.weekType !== "ALL") return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchSub = (slot.subjectName || "").toLowerCase().includes(q)
        const matchCls = (slot.className || "").toLowerCase().includes(q)
        if (!matchSub && !matchCls) return false
      }
      return true
    })
  }, [allMySlots, filterDay, filterSession, filterPeriod, filterSubject, filterClass, filterWeekType, searchQuery])

  // Subject Stats Aggregation
  const subjectSummary = useMemo(() => {
    const map = new Map<string, { subjectName: string; totalPeriods: number; classNames: Set<string>; slots: TimetableSlotItem[] }>()
    allMySlots.forEach(slot => {
      const sName = slot.subjectName || "Chưa phân môn"
      if (!map.has(sName)) {
        map.set(sName, { subjectName: sName, totalPeriods: 0, classNames: new Set(), slots: [] })
      }
      const item = map.get(sName)!
      item.totalPeriods += 1
      if (slot.className) item.classNames.add(slot.className)
      item.slots.push(slot)
    })
    return Array.from(map.values())
  }, [allMySlots])

  // List of unique subjects taught by teacher
  const uniqueSubjects = useMemo(() => {
    return Array.from(new Set(allMySlots.map(s => s.subjectName).filter(Boolean)))
  }, [allMySlots])

  // List of unique classes taught by teacher
  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(allMySlots.map(s => s.className).filter(Boolean)))
  }, [allMySlots])

  const resetFilters = () => {
    setFilterDay("all")
    setFilterSession("all")
    setFilterPeriod("all")
    setFilterSubject("all")
    setFilterClass("all")
    setFilterWeekType("all")
    setSearchQuery("")
  }

  // School Matrix classes filter
  const matrixClasses = useMemo(() => {
    let classes = initialData.classes || []
    if (matrixCampusId) classes = classes.filter(c => c.campusId === matrixCampusId)
    if (matrixLevel === "TIEU_HOC") {
      classes = classes.filter(c => ["Tiểu học", "Mầm non", "TIEU_HOC"].includes(c.level))
    } else if (matrixLevel === "TRUNG_HOC") {
      classes = classes.filter(c => ["THCS", "THPT", "TRUNG_HOC"].includes(c.level))
    }
    return classes
  }, [initialData.classes, matrixCampusId, matrixLevel])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-teal-900 to-[#00A99D] rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 w-64 h-64 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-300 shrink-0 shadow-inner">
              <Calendar className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold tracking-tight">Thời khóa biểu Giảng dạy</h1>
                <span className="bg-emerald-400/20 text-emerald-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-400/30 uppercase tracking-wider">
                  Trực quan & Chính xác
                </span>
              </div>
              <p className="text-xs text-teal-100/80 font-medium mt-1">
                Tra cứu phân công tiết dạy theo môn, tiết, lớp và thứ trong tuần từ Ma trận Thời khóa biểu chính thức
              </p>
            </div>
          </div>

          {/* Tab Mode Switcher */}
          <div className="flex items-center bg-black/20 p-1.5 rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab("MY_SCHEDULE")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "MY_SCHEDULE"
                  ? "bg-white text-[#003B3A] shadow-md scale-105"
                  : "text-teal-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Lịch dạy Cá nhân của Tôi ({allMySlots.length})
            </button>
            <button
              onClick={() => setActiveTab("SCHOOL_MATRIX")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === "SCHOOL_MATRIX"
                  ? "bg-white text-[#003B3A] shadow-md scale-105"
                  : "text-teal-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              TKB Toàn trường
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Cards */}
        {activeTab === "MY_SCHEDULE" && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-white/10">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider">Tổng tiết dạy</span>
              <p className="text-lg sm:text-xl font-black text-white mt-0.5">{allMySlots.length} <span className="text-xs font-medium text-teal-200">tiết / tuần</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider">Môn giảng dạy</span>
              <p className="text-lg sm:text-xl font-black text-white mt-0.5">{uniqueSubjects.length} <span className="text-xs font-medium text-teal-200">môn học</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider">Lớp phụ trách</span>
              <p className="text-lg sm:text-xl font-black text-white mt-0.5">{uniqueClasses.length} <span className="text-xs font-medium text-teal-200">lớp học</span></p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
              <span className="text-[10px] font-bold text-teal-200 uppercase tracking-wider">Trạng thái TKB</span>
              <p className="text-xs font-extrabold text-emerald-300 flex items-center gap-1.5 mt-2">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Đã chuẩn hóa
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ===== TAB 1: PERSONAL TEACHING SCHEDULE ===== */}
      {activeTab === "MY_SCHEDULE" && (
        <div className="space-y-6">
          {/* Multi-Dimensional Filter Controls Bar */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#00A99D]" />
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">Bộ lọc Tra cứu Tiết dạy</h3>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                {/* View Mode Switcher */}
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    onClick={() => setViewMode("GRID")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === "GRID" ? "bg-white text-[#00A99D] shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    Ma trận Tuần
                  </button>
                  <button
                    onClick={() => setViewMode("LIST")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      viewMode === "LIST" ? "bg-white text-[#00A99D] shadow-sm" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    Thống kê Môn
                  </button>
                </div>

                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Đặt lại
                </button>
              </div>
            </div>

            {/* Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Filter 1: Thứ */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lọc theo Thứ</label>
                <select
                  value={filterDay}
                  onChange={e => setFilterDay(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả các thứ</option>
                  {DAYS_OF_WEEK.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>

              {/* Filter 2: Buổi */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lọc theo Buổi</label>
                <select
                  value={filterSession}
                  onChange={e => setFilterSession(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả các buổi</option>
                  <option value="MORNING">Buổi Sáng</option>
                  <option value="AFTERNOON">Buổi Chiều</option>
                </select>
              </div>

              {/* Filter 3: Tiết */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lọc theo Tiết</label>
                <select
                  value={filterPeriod}
                  onChange={e => setFilterPeriod(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả tiết dạy</option>
                  {[1, 2, 3, 4].map(p => <option key={p} value={String(p)}>Tiết {p}</option>)}
                </select>
              </div>

              {/* Filter 4: Môn học */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lọc theo Môn</label>
                <select
                  value={filterSubject}
                  onChange={e => setFilterSubject(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả môn học</option>
                  {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Filter 5: Lớp học */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Lọc theo Lớp</label>
                <select
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả lớp học</option>
                  {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Filter 6: Tuần */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Cấu hình Tuần</label>
                <select
                  value={filterWeekType}
                  onChange={e => setFilterWeekType(e.target.value)}
                  className="w-full text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả các tuần</option>
                  <option value="EVEN">Tuần Chẵn</option>
                  <option value="ODD">Tuần Lẻ</option>
                </select>
              </div>
            </div>
          </div>

          {/* VIEW 1: WEEKLY SCHEDULE MATRIX GRID */}
          {viewMode === "GRID" && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-[#00A99D]" />
                  <span className="font-extrabold text-xs uppercase tracking-wider text-slate-700">
                    Ma trận Lịch dạy Tuần (Thứ 2 - Thứ 6)
                  </span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">
                  Hiển thị {filteredMySlots.length} / {allMySlots.length} tiết dạy
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 text-xs font-black uppercase">
                      <th className="py-3 px-3 text-center border-r border-slate-200 w-20">Buổi</th>
                      <th className="py-3 px-3 text-center border-r border-slate-200 w-16">Tiết</th>
                      {DAYS_OF_WEEK.map(day => (
                        <th key={day.key} className="py-3 px-4 text-center border-r border-slate-200 last:border-r-0 font-black">
                          {day.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {/* MORNING SESSION */}
                    {PERIODS.map((period, pIdx) => (
                      <tr key={`morning-${period}`} className="hover:bg-slate-50/50">
                        {pIdx === 0 && (
                          <td rowSpan={4} className="py-4 px-3 text-center border-r border-slate-200 bg-amber-50/40 text-amber-800 font-extrabold text-xs">
                            <div className="flex flex-col items-center gap-1">
                              <Sun className="w-4 h-4 text-amber-500" />
                              <span>SÁNG</span>
                            </div>
                          </td>
                        )}
                        <td className="py-3 px-2 text-center border-r border-slate-200 font-extrabold text-slate-600 bg-slate-50">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(day => {
                          const slot = filteredMySlots.find(s => s.dayOfWeek === day.key && s.session === "MORNING" && s.periodNumber === period)
                          return (
                            <td key={day.key} className="p-2 border-r border-slate-200 last:border-r-0 h-20 align-top">
                              {slot ? (
                                <div 
                                  className="h-full p-2.5 rounded-xl border flex flex-col justify-between shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
                                  style={{
                                    backgroundColor: (slot.colorCode || "#3B82F6") + "15",
                                    borderColor: slot.colorCode || "#3B82F6"
                                  }}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-xs text-slate-800 truncate">{slot.className}</span>
                                      {slot.weekType !== "ALL" && (
                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-white/80 text-slate-700 border">
                                          {slot.weekType === "EVEN" ? "Tuần Chẵn" : "Tuần Lẻ"}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-extrabold text-xs text-[#00A99D] mt-0.5 truncate">{slot.subjectName || "Chưa xếp môn"}</p>
                                  </div>
                                  <Link
                                    href="/teacher/du-gio"
                                    className="text-[10px] font-bold text-slate-500 hover:text-[#00A99D] flex items-center justify-end gap-0.5 mt-1"
                                  >
                                    <span>Đăng ký dự giờ</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                </div>
                              ) : (
                                <div className="h-full rounded-xl border border-dashed border-slate-200 bg-slate-50/30 flex items-center justify-center text-slate-300 text-[11px]">
                                  -
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}

                    {/* AFTERNOON SESSION */}
                    {PERIODS.map((period, pIdx) => (
                      <tr key={`afternoon-${period}`} className="hover:bg-slate-50/50">
                        {pIdx === 0 && (
                          <td rowSpan={4} className="py-4 px-3 text-center border-r border-slate-200 bg-sky-50/40 text-sky-800 font-extrabold text-xs">
                            <div className="flex flex-col items-center gap-1">
                              <Moon className="w-4 h-4 text-sky-500" />
                              <span>CHIỀU</span>
                            </div>
                          </td>
                        )}
                        <td className="py-3 px-2 text-center border-r border-slate-200 font-extrabold text-slate-600 bg-slate-50">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(day => {
                          const slot = filteredMySlots.find(s => s.dayOfWeek === day.key && s.session === "AFTERNOON" && s.periodNumber === period)
                          return (
                            <td key={day.key} className="p-2 border-r border-slate-200 last:border-r-0 h-20 align-top">
                              {slot ? (
                                <div 
                                  className="h-full p-2.5 rounded-xl border flex flex-col justify-between shadow-sm transition-all hover:scale-[1.02] hover:shadow-md"
                                  style={{
                                    backgroundColor: (slot.colorCode || "#3B82F6") + "15",
                                    borderColor: slot.colorCode || "#3B82F6"
                                  }}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-xs text-slate-800 truncate">{slot.className}</span>
                                      {slot.weekType !== "ALL" && (
                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-white/80 text-slate-700 border">
                                          {slot.weekType === "EVEN" ? "Tuần Chẵn" : "Tuần Lẻ"}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-extrabold text-xs text-[#00A99D] mt-0.5 truncate">{slot.subjectName || "Chưa xếp môn"}</p>
                                  </div>
                                  <Link
                                    href="/teacher/du-gio"
                                    className="text-[10px] font-bold text-slate-500 hover:text-[#00A99D] flex items-center justify-end gap-0.5 mt-1"
                                  >
                                    <span>Đăng ký dự giờ</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                </div>
                              ) : (
                                <div className="h-full rounded-xl border border-dashed border-slate-200 bg-slate-50/30 flex items-center justify-center text-slate-300 text-[11px]">
                                  -
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: SUBJECT QUOTA & DETAILED LIST VIEW */}
          {viewMode === "LIST" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Summary Cards by Subject */}
              <div className="lg:col-span-1 space-y-4">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00A99D]" />
                  <span>Thống kê theo Môn giảng dạy</span>
                </h3>

                {subjectSummary.map((sub, idx) => (
                  <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-base text-slate-800">{sub.subjectName}</h4>
                      <span className="bg-[#00A99D] text-white font-black text-xs px-3 py-1 rounded-full shadow-sm">
                        {sub.totalPeriods} tiết / tuần
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-500 space-y-1">
                      <p>Danh sách lớp phụ trách: <span className="font-bold text-slate-800">{Array.from(sub.classNames).join(", ") || "N/A"}</span></p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1.5">
                      {sub.slots.map((s, sIdx) => {
                        const dayText = DAYS_OF_WEEK.find(d => d.key === s.dayOfWeek)?.label || s.dayOfWeek
                        return (
                          <span key={sIdx} className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-slate-200">
                            {dayText} ({s.session === "MORNING" ? "Sáng" : "Chiều"} - T{s.periodNumber}): {s.className}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Slot Cards List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <List className="w-4 h-4 text-[#00A99D]" />
                  <span>Danh sách Tiết dạy Chi tiết ({filteredMySlots.length})</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredMySlots.map((slot) => {
                    const dayText = DAYS_OF_WEEK.find(d => d.key === slot.dayOfWeek)?.label || slot.dayOfWeek
                    return (
                      <div key={slot.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                          <span className="bg-emerald-50 text-[#00A99D] font-black text-xs px-2.5 py-0.5 rounded-full border border-emerald-100 uppercase">
                            {dayText} - {slot.session === "MORNING" ? "Buổi Sáng" : "Buổi Chiều"}
                          </span>
                          <span className="bg-amber-50 text-amber-700 font-black text-xs px-2.5 py-0.5 rounded-full border border-amber-100">
                            Tiết {slot.periodNumber}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-extrabold text-base text-slate-800">{slot.subjectName || "Chưa xếp môn"}</h4>
                          <p className="text-xs font-bold text-[#00A99D] mt-0.5">Lớp: {slot.className}</p>
                        </div>

                        <div className="text-xs font-semibold text-slate-500 space-y-1">
                          <p>Cấp / Khối: <span className="font-bold text-slate-700">{slot.level === "TIEU_HOC" ? "Tiểu học" : "Trung học"} ({slot.grade})</span></p>
                          <p>Tuần áp dụng: <span className="font-bold text-slate-700">{slot.weekType === "ALL" ? "Tất cả các tuần" : slot.weekType === "EVEN" ? "Tuần Chẵn" : "Tuần Lẻ"}</span></p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <Link
                            href="/teacher/du-gio"
                            className="text-xs font-bold text-[#00A99D] hover:text-[#009085] flex items-center gap-1"
                          >
                            <span>Đăng ký dự giờ tiết này</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB 2: FULL SCHOOL TIMETABLE MATRIX ===== */}
      {activeTab === "SCHOOL_MATRIX" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="font-extrabold text-base text-slate-800">Ma trận Thời khóa biểu Toàn trường</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tra cứu thời khóa biểu của các lớp học theo Cơ sở và Cấp học</p>
            </div>

            {/* Campus & Level Selector */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <select
                value={matrixCampusId}
                onChange={e => setMatrixCampusId(e.target.value)}
                className="text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-slate-800"
              >
                {initialData.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
              </select>

              <select
                value={matrixLevel}
                onChange={e => setMatrixLevel(e.target.value)}
                className="text-xs font-bold p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white outline-none text-slate-800"
              >
                <option value="TIEU_HOC">Tiểu học (Khối 1 - 5)</option>
                <option value="TRUNG_HOC">Trung học (Khối 6 - 12)</option>
              </select>
            </div>
          </div>

          {/* Classes Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-black uppercase border-b border-slate-200">
                  <th className="py-3 px-3 border-r border-slate-200">Thứ</th>
                  <th className="py-3 px-3 border-r border-slate-200">Tiết</th>
                  {matrixClasses.map(c => (
                    <th key={c.id} className="py-3 px-3 text-center border-r border-slate-200 last:border-r-0 font-black min-w-[120px]">
                      {c.className}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {DAYS_OF_WEEK.map(day => (
                  PERIODS.map((period, pIdx) => (
                    <tr key={`${day.key}-${period}`} className="hover:bg-slate-50">
                      {pIdx === 0 && (
                        <td rowSpan={4} className="py-3 px-2 text-center font-extrabold bg-slate-50 border-r border-slate-200 text-slate-800">
                          {day.label}
                        </td>
                      )}
                      <td className="py-2 px-2 text-center font-bold bg-slate-50/50 border-r border-slate-200 text-slate-600">
                        T{period}
                      </td>
                      {matrixClasses.map(c => {
                        const slot = initialData.timetableSlots.find(s => s.classId === c.id && s.dayOfWeek === day.key && s.periodNumber === period && s.session === "MORNING")
                        return (
                          <td key={c.id} className="p-2 border-r border-slate-200 last:border-r-0 text-center">
                            {slot ? (
                              <div className="p-1.5 rounded-lg border text-[11px] font-semibold" style={{ backgroundColor: (slot.colorCode || "#3B82F6") + "15", borderColor: slot.colorCode || "#3B82F6" }}>
                                <p className="font-extrabold text-slate-800 truncate">{slot.subjectName}</p>
                                <p className="text-[10px] text-slate-500 truncate">{slot.teacherName}</p>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
