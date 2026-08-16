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
  const [activeTab, setActiveTab] = useState<"MY_SCHEDULE" | "CLASS_LOOKUP" | "TEACHER_LOOKUP" | "SCHOOL_MATRIX">("MY_SCHEDULE")
  const [lookupCampusId, setLookupCampusId] = useState<string>("")
  const [lookupClassId, setLookupClassId] = useState<string>("")
  const [lookupDept, setLookupDept] = useState<string>("ALL")
  const [lookupTeacherId, setLookupTeacherId] = useState<string>("")
  const [lookupSearchQuery, setLookupSearchQuery] = useState<string>("")
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

  
  
  // Filtered classes by Campus in Teacher page lookup
  const campusFilteredClasses = useMemo(() => {
    if (!Array.isArray(initialData.classes)) return []
    if (!lookupCampusId) return initialData.classes
    return initialData.classes.filter((c: any) => c.campusId === lookupCampusId || !c.campusId)
  }, [initialData.classes, lookupCampusId])

  // Active selected class object in Teacher page lookup
  const selectedClassObj = useMemo(() => {
    if (lookupClassId) {
      return initialData.classes.find((c: any) => c.id === lookupClassId || c.className === lookupClassId) || null
    }
    if (campusFilteredClasses.length > 0) {
      return campusFilteredClasses[0]
    }
    return null
  }, [initialData.classes, lookupClassId, campusFilteredClasses])

  // Class Weekly Schedule Matrix & Stats in Teacher page lookup
  const { classWeeklyMatrix, classScheduleStats } = useMemo(() => {
    const matrix: Record<string, any> = {}
    const slotsList: any[] = []
    if (!selectedClassObj) return { classWeeklyMatrix: matrix, classScheduleStats: { totalPeriods: 0, slotsList } }

    const targetClassId = selectedClassObj.id
    const targetClassName = (selectedClassObj.className || "").trim().toLowerCase()

    ;(initialData.timetableSlots || []).forEach((s: any) => {
      const idMatch = s.classId && s.classId === targetClassId
      const nameMatch = s.className && s.className.trim().toLowerCase() === targetClassName

      if (idMatch || nameMatch) {
        const key = `${s.dayOfWeek}_${s.session}_${s.periodNumber}`
        matrix[key] = s
        
        const dayObj = DAYS_OF_WEEK.find(d => d.key === s.dayOfWeek)
        slotsList.push({
          ...s,
          dayLabel: dayObj?.label || s.dayOfWeek,
          sessionLabel: s.session === "MORNING" ? "Sáng" : "Chiều"
        })
      }
    })

    return {
      classWeeklyMatrix: matrix,
      classScheduleStats: {
        totalPeriods: slotsList.length,
        slotsList
      }
    }
  }, [selectedClassObj, initialData.timetableSlots])


  // Unique Departments for filter dropdown in Teacher page
  const uniqueDepartments = useMemo(() => {
    if (!Array.isArray(initialData.teachers)) return []
    const set = new Set<string>()
    initialData.teachers.forEach((t: any) => {
      const deptName = t.departmentRel?.name || t.departmentName
      if (deptName && typeof deptName === 'string') {
        set.add(deptName.trim())
      }
    })
    return Array.from(set).sort()
  }, [initialData.teachers])

  // Filtered teachers by Department & Search query in Teacher page
  const deptFilteredTeachers = useMemo(() => {
    if (!Array.isArray(initialData.teachers)) return []
    return initialData.teachers.filter((t: any) => {
      const deptName = t.departmentRel?.name || t.departmentName || ""
      const matchesDept = lookupDept === "ALL" || deptName.trim().toLowerCase() === lookupDept.trim().toLowerCase()
      const matchesQuery = !lookupSearchQuery.trim() || 
        (t.teacherName || "").toLowerCase().includes(lookupSearchQuery.toLowerCase()) ||
        (t.teacherCode || "").toLowerCase().includes(lookupSearchQuery.toLowerCase())
      return matchesDept && matchesQuery
    })
  }, [initialData.teachers, lookupDept, lookupSearchQuery])

  // Active selected teacher object in Teacher page
  const selectedTeacherObj = useMemo(() => {
    if (lookupTeacherId) {
      return initialData.teachers.find((t: any) => t.id === lookupTeacherId) || null
    }
    if (lookupSearchQuery.trim() && deptFilteredTeachers.length > 0) {
      return deptFilteredTeachers[0]
    }
    return null
  }, [initialData.teachers, lookupTeacherId, lookupSearchQuery, deptFilteredTeachers])

  // Teacher Weekly Schedule Matrix & Stats in Teacher page
  const { teacherWeeklyMatrix, teacherScheduleStats } = useMemo(() => {
    const matrix: Record<string, any> = {}
    const slotsList: any[] = []
    if (!selectedTeacherObj) return { teacherWeeklyMatrix: matrix, teacherScheduleStats: { totalPeriods: 0, slotsList } }

    const targetName = (selectedTeacherObj.teacherName || "").trim().toLowerCase()

    ;(initialData.timetableSlots || []).forEach((s: any) => {
      const mainMatch = (s.teacherName || "").trim().toLowerCase() === targetName
      const altMatch = (s.altTeacherName || "").trim().toLowerCase() === targetName

      if (mainMatch || altMatch) {
        const key = `${s.dayOfWeek}_${s.session}_${s.periodNumber}`
        matrix[key] = s
        
        const dayObj = DAYS_OF_WEEK.find(d => d.key === s.dayOfWeek)
        slotsList.push({
          ...s,
          dayLabel: dayObj?.label || s.dayOfWeek,
          sessionLabel: s.session === "MORNING" ? "Sáng" : "Chiều"
        })
      }
    })

    return {
      teacherWeeklyMatrix: matrix,
      teacherScheduleStats: {
        totalPeriods: slotsList.length,
        slotsList
      }
    }
  }, [selectedTeacherObj, initialData.timetableSlots])

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

      {/* ===== TAB: CLASS SCHEDULE LOOKUP ===== */}
      {activeTab === "CLASS_LOOKUP" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          {/* FILTER CONTROLS */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* 1. CHỌN CƠ SỞ */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#00A99D]" />
                1. Chọn Cơ Sở Trực Thuộc
              </label>
              <select
                value={lookupCampusId}
                onChange={e => {
                  setLookupCampusId(e.target.value);
                  setLookupClassId("");
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20 transition-all"
              >
                <option value="">-- Tất cả các Cơ sở --</option>
                {initialData.campuses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.campusName}</option>
                ))}
              </select>
            </div>

            {/* 2. CHỌN LỚP HỌC */}
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00A99D]" />
                2. Chọn Lớp Học Cần Tra Cứu TKB
              </label>
              <select
                value={lookupClassId}
                onChange={e => setLookupClassId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20 transition-all"
              >
                <option value="">-- Chọn Lớp học trong danh sách --</option>
                {campusFilteredClasses.map((cls: any) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className?.startsWith("Lớp") ? cls.className : `Lớp ${cls.className}`} - {cls.level || cls.grade || "Khối"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CLASS INFO BADGE */}
          {selectedClassObj ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl text-white">
                    {selectedClassObj.className?.charAt(0) || "L"}
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wide flex items-center gap-2">
                      {selectedClassObj.className?.startsWith("Lớp") ? selectedClassObj.className : `Lớp ${selectedClassObj.className}`}
                      <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-mono normal-case">
                        {selectedClassObj.level || selectedClassObj.grade || "Cấp học"}
                      </span>
                    </h2>
                    <p className="text-xs text-teal-100 font-semibold mt-0.5">
                      Cơ sở: <span className="font-bold text-white">{initialData.campuses.find((c: any) => c.id === selectedClassObj.campusId)?.campusName || "Tất cả Cơ sở"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-right">
                    <div className="text-[10px] text-teal-200 uppercase font-black">Tổng số tiết học trong tuần</div>
                    <div className="text-lg font-black text-white">{classScheduleStats.totalPeriods} tiết / tuần</div>
                  </div>
                </div>
              </div>

              {/* WEEKLY TIMETABLE TABLE MATRIX FOR CLASS */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#003B3A] text-white font-black uppercase text-[11px] tracking-wider">
                      <th className="p-3 text-center w-24 border-r border-teal-800">Buổi</th>
                      <th className="p-3 text-center w-20 border-r border-teal-800">Tiết</th>
                      {DAYS_OF_WEEK.map(d => (
                        <th key={d.key} className="p-3 text-center border-r border-teal-800 min-w-[150px]">
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4].map((period, idx) => (
                      <tr key={`morning-${period}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        {idx === 0 && (
                          <td rowSpan={4} className="p-3 font-black text-center border-r border-slate-200 bg-amber-50/40 text-amber-800 uppercase tracking-wide">
                            ☀️ SÁNG
                          </td>
                        )}
                        <td className="p-3 font-bold text-center border-r border-slate-200 text-slate-600 bg-slate-50">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(d => {
                          const assignedSlot = classWeeklyMatrix[`${d.key}_MORNING_${period}`];
                          return (
                            <td key={d.key} className="p-2 border-r border-slate-200 text-center vertical-top">
                              {assignedSlot ? (
                                <div
                                  style={{ backgroundColor: assignedSlot.colorCode || "#FEF08A" }}
                                  className="p-2.5 rounded-xl border border-slate-300 shadow-xs space-y-1 text-slate-900 font-bold"
                                >
                                  <div className="text-xs font-black uppercase text-[#003B3A]">
                                    {assignedSlot.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-800 bg-white/70 px-2 py-0.5 rounded-md inline-block font-mono">
                                    {assignedSlot.teacherName || "Chưa xếp GV"}
                                  </div>
                                  {assignedSlot.weekType && assignedSlot.weekType !== "ALL" && (
                                    <div className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                      {assignedSlot.weekType === "EVEN" ? "Tuần Chẵn" : assignedSlot.weekType === "ODD" ? "Tuần Lẻ" : "Thay đổi"}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">Trống</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {[1, 2, 3, 4].map((period, idx) => (
                      <tr key={`afternoon-${period}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        {idx === 0 && (
                          <td rowSpan={4} className="p-3 font-black text-center border-r border-slate-200 bg-sky-50/40 text-sky-800 uppercase tracking-wide">
                            🌙 CHIỀU
                          </td>
                        )}
                        <td className="p-3 font-bold text-center border-r border-slate-200 text-slate-600 bg-slate-50">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(d => {
                          const assignedSlot = classWeeklyMatrix[`${d.key}_AFTERNOON_${period}`];
                          return (
                            <td key={d.key} className="p-2 border-r border-slate-200 text-center vertical-top">
                              {assignedSlot ? (
                                <div
                                  style={{ backgroundColor: assignedSlot.colorCode || "#FEF08A" }}
                                  className="p-2.5 rounded-xl border border-slate-300 shadow-xs space-y-1 text-slate-900 font-bold"
                                >
                                  <div className="text-xs font-black uppercase text-[#003B3A]">
                                    {assignedSlot.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-800 bg-white/70 px-2 py-0.5 rounded-md inline-block font-mono">
                                    {assignedSlot.teacherName || "Chưa xếp GV"}
                                  </div>
                                  {assignedSlot.weekType && assignedSlot.weekType !== "ALL" && (
                                    <div className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                      {assignedSlot.weekType === "EVEN" ? "Tuần Chẵn" : assignedSlot.weekType === "ODD" ? "Tuần Lẻ" : "Thay đổi"}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">Trống</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CHRONOLOGICAL LIST OF CLASS PERIODS */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00A99D]" />
                  Danh Sách Môn Học & GVGD Trong Tuần Của Lớp
                </h3>
                {classScheduleStats.slotsList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {classScheduleStats.slotsList.map((item: any, i: number) => (
                      <div key={i} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-[#00A99D] mr-2">
                            {item.dayLabel} - {item.sessionLabel} Tiết {item.periodNumber}
                          </span>
                          <h4 className="text-xs font-black text-slate-800 mt-1">{item.subjectName}</h4>
                          <p className="text-[11px] font-bold text-slate-500">GVGD: {item.teacherName || "Chưa chọn"}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400">Trạng thái</span>
                          <div className="text-xs font-black text-emerald-600">Đã xếp lịch</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 text-center">Lớp học chưa có tiết học nào được xếp lịch trong thời khóa biểu hiện tại.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 font-semibold text-xs space-y-2">
              <Building2 className="w-8 h-8 mx-auto text-slate-300" />
              <p>Vui lòng chọn Cơ sở và Lớp học ở trên để tra cứu thời khóa biểu toàn bộ các tiết học trong tuần.</p>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB 3: TEACHER SCHEDULE LOOKUP ===== */}
      {activeTab === "TEACHER_LOOKUP" && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
          {/* FILTER CONTROLS */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* 1. CHỌN TỔ CHUYÊN MÔN */}
            <div className="md:col-span-5 space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#00A99D]" />
                1. Lọc Theo Tổ Chuyên Môn
              </label>
              <select
                value={lookupDept}
                onChange={e => {
                  setLookupDept(e.target.value);
                  setLookupTeacherId("");
                }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20 transition-all"
              >
                <option value="ALL">-- Tất cả các Tổ chuyên môn --</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* 2. CHỌN / TRA CỨU GIÁO VIÊN */}
            <div className="md:col-span-7 space-y-1.5">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#00A99D]" />
                2. Chọn Giáo Viên Hoặc Nhập Tên Tra Cứu
              </label>
              <div className="flex gap-2">
                <select
                  value={lookupTeacherId}
                  onChange={e => setLookupTeacherId(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/20 transition-all"
                >
                  <option value="">-- Chọn Giáo viên trong danh sách --</option>
                  {deptFilteredTeachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.teacherName} {t.teacherCode ? `(${t.teacherCode})` : ''} - {t.departmentRel?.name || t.departmentName || 'GV'}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Hoặc gõ tên GV..."
                  value={lookupSearchQuery}
                  onChange={e => setLookupSearchQuery(e.target.value)}
                  className="w-48 bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] transition-all"
                />
              </div>
            </div>
          </div>

          {/* TEACHER INFO BADGE */}
          {selectedTeacherObj ? (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-xl text-white">
                    {selectedTeacherObj.teacherName?.charAt(0) || "GV"}
                  </div>
                  <div>
                    <h2 className="text-base font-black uppercase tracking-wide flex items-center gap-2">
                      {selectedTeacherObj.teacherName}
                      <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-mono normal-case">
                        {selectedTeacherObj.teacherCode || "GV"}
                      </span>
                    </h2>
                    <p className="text-xs text-teal-100 font-semibold mt-0.5">
                      Tổ chuyên môn: <span className="font-bold text-white">{selectedTeacherObj.departmentRel?.name || selectedTeacherObj.departmentName || "Tổ chuyên môn"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-right">
                    <div className="text-[10px] text-teal-200 uppercase font-black">Tổng tiết dạy trong tuần</div>
                    <div className="text-lg font-black text-white">{teacherScheduleStats.totalPeriods} tiết / tuần</div>
                  </div>
                </div>
              </div>

              {/* WEEKLY TIMETABLE TABLE MATRIX FOR TEACHER */}
              <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#003B3A] text-white font-black uppercase text-[11px] tracking-wider">
                      <th className="p-3 text-center w-24 border-r border-teal-800">Buổi</th>
                      <th className="p-3 text-center w-20 border-r border-teal-800">Tiết</th>
                      {DAYS_OF_WEEK.map(d => (
                        <th key={d.key} className="p-3 text-center border-r border-teal-800 min-w-[150px]">
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4].map((period, idx) => (
                      <tr key={`morning-${period}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        {idx === 0 && (
                          <td rowSpan={4} className="p-3 font-black text-center border-r border-slate-200 bg-amber-50/40 text-amber-800 uppercase tracking-wide">
                            ☀️ SÁNG
                          </td>
                        )}
                        <td className="p-3 font-bold text-center border-r border-slate-200 text-slate-600 bg-slate-50">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(d => {
                          const assignedSlot = teacherWeeklyMatrix[`${d.key}_MORNING_${period}`];
                          return (
                            <td key={d.key} className="p-2 border-r border-slate-200 text-center vertical-top">
                              {assignedSlot ? (
                                <div
                                  style={{ backgroundColor: assignedSlot.colorCode || "#FEF08A" }}
                                  className="p-2.5 rounded-xl border border-slate-300 shadow-xs space-y-1 text-slate-900 font-bold"
                                >
                                  <div className="text-xs font-black uppercase text-[#003B3A]">
                                    {assignedSlot.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-800 bg-white/70 px-2 py-0.5 rounded-md inline-block font-mono">
                                    {assignedSlot.className}
                                  </div>
                                  {assignedSlot.weekType && assignedSlot.weekType !== "ALL" && (
                                    <div className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                      {assignedSlot.weekType === "EVEN" ? "Tuần Chẵn" : assignedSlot.weekType === "ODD" ? "Tuần Lẻ" : "Thay đổi"}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">Trống</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {[1, 2, 3, 4].map((period, idx) => (
                      <tr key={`afternoon-${period}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        {idx === 0 && (
                          <td rowSpan={4} className="p-3 font-black text-center border-r border-slate-200 bg-sky-50/40 text-sky-800 uppercase tracking-wide">
                            🌙 CHIỀU
                          </td>
                        )}
                        <td className="p-3 font-bold text-center border-r border-slate-200 text-slate-600 bg-slate-50">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(d => {
                          const assignedSlot = teacherWeeklyMatrix[`${d.key}_AFTERNOON_${period}`];
                          return (
                            <td key={d.key} className="p-2 border-r border-slate-200 text-center vertical-top">
                              {assignedSlot ? (
                                <div
                                  style={{ backgroundColor: assignedSlot.colorCode || "#FEF08A" }}
                                  className="p-2.5 rounded-xl border border-slate-300 shadow-xs space-y-1 text-slate-900 font-bold"
                                >
                                  <div className="text-xs font-black uppercase text-[#003B3A]">
                                    {assignedSlot.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-800 bg-white/70 px-2 py-0.5 rounded-md inline-block font-mono">
                                    {assignedSlot.className}
                                  </div>
                                  {assignedSlot.weekType && assignedSlot.weekType !== "ALL" && (
                                    <div className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                      {assignedSlot.weekType === "EVEN" ? "Tuần Chẵn" : assignedSlot.weekType === "ODD" ? "Tuần Lẻ" : "Thay đổi"}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-300 italic text-[11px]">Trống</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* CHRONOLOGICAL LIST OF TEACHING PERIODS */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00A99D]" />
                  Danh Sách Tiết Dạy Trong Tuần (Chi Tiết)
                </h3>
                {teacherScheduleStats.slotsList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {teacherScheduleStats.slotsList.map((item: any, i: number) => (
                      <div key={i} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-teal-50 text-[#00A99D] mr-2">
                            {item.dayLabel} - {item.sessionLabel} Tiết {item.periodNumber}
                          </span>
                          <h4 className="text-xs font-black text-slate-800 mt-1">{item.subjectName}</h4>
                          <p className="text-[11px] font-bold text-slate-500">Lớp: {item.className}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-400">Trạng thái</span>
                          <div className="text-xs font-black text-emerald-600">Đã xếp lịch</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic p-3 text-center">Giáo viên chưa có tiết dạy nào được xếp lịch trong thời khóa biểu hiện tại.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-400 font-semibold text-xs space-y-2">
              <Search className="w-8 h-8 mx-auto text-slate-300" />
              <p>Vui lòng chọn Tổ chuyên môn hoặc chọn/gõ tên Giáo viên ở trên để tra cứu toàn bộ lịch dạy trong tuần.</p>
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
