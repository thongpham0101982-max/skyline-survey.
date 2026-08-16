"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { 
  Calendar, Clock, BookOpen, Users, Building2, Filter, Sparkles, 
  CheckCircle, Search, Grid, List, RotateCcw, Sun, Moon,
  ChevronRight, AlertCircle, ArrowRight, Shield, Layers
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
  { key: "MONDAY", label: "Thứ 2", short: "T2" },
  { key: "TUESDAY", label: "Thứ 3", short: "T3" },
  { key: "WEDNESDAY", label: "Thứ 4", short: "T4" },
  { key: "THURSDAY", label: "Thứ 5", short: "T5" },
  { key: "FRIDAY", label: "Thứ 6", short: "T6" }
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
    return Array.from(set)
  }, [initialData.teachers])

  // Filtered teachers by department
  const deptFilteredTeachers = useMemo(() => {
    if (!Array.isArray(initialData.teachers)) return []
    let list = initialData.teachers
    if (lookupDept !== "ALL") {
      list = list.filter((t: any) => {
        const dName = (t.departmentRel?.name || t.departmentName || "").trim()
        return dName === lookupDept
      })
    }
    if (lookupSearchQuery) {
      const q = lookupSearchQuery.toLowerCase()
      list = list.filter((t: any) => 
        (t.teacherName || "").toLowerCase().includes(q) ||
        (t.teacherCode || "").toLowerCase().includes(q)
      )
    }
    return list
  }, [initialData.teachers, lookupDept, lookupSearchQuery])

  // Active selected teacher object
  const selectedTeacherObj = useMemo(() => {
    if (lookupTeacherId) {
      return initialData.teachers.find((t: any) => t.id === lookupTeacherId) || null
    }
    if (deptFilteredTeachers.length > 0) {
      return deptFilteredTeachers[0]
    }
    return null
  }, [initialData.teachers, lookupTeacherId, deptFilteredTeachers])

  // Teacher Weekly Schedule Matrix & Stats
  const { teacherWeeklyMatrix, teacherScheduleStats } = useMemo(() => {
    const matrix: Record<string, any> = {}
    const slotsList: any[] = []
    if (!selectedTeacherObj) return { teacherWeeklyMatrix: matrix, teacherScheduleStats: { totalPeriods: 0, slotsList } }

    const tId = selectedTeacherObj.id
    const tName = (selectedTeacherObj.teacherName || "").trim().toLowerCase()

    ;(initialData.timetableSlots || []).forEach((s: any) => {
      const idMatch = s.teacherId && s.teacherId === tId
      const nameMatch = s.teacherName && s.teacherName.trim().toLowerCase() === tName

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
    <div className="space-y-4 max-w-7xl mx-auto pb-10 font-sans text-slate-800">
      {/* Compact Header Banner */}
      <div className="bg-gradient-to-r from-[#003B3A] via-[#004D4A] to-[#00A99D] rounded-2xl p-4 sm:p-5 text-white shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-teal-200 shrink-0 shadow-sm">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-tight text-white">Thời khóa biểu Giảng dạy</h1>
                <span className="bg-emerald-400/25 text-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300/30 uppercase tracking-wider">
                  SQMS
                </span>
              </div>
              <p className="text-xs text-teal-100/90 font-medium">
                Tra cứu phân công tiết dạy gọn gàng, khoa học & chuẩn xác
              </p>
            </div>
          </div>

          {/* Compact Tab Mode Switcher */}
          <div className="flex flex-wrap items-center bg-black/25 p-1 rounded-xl border border-white/15 shrink-0 gap-1">
            <button
              onClick={() => setActiveTab("MY_SCHEDULE")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "MY_SCHEDULE"
                  ? "bg-white text-[#003B3A] shadow-sm font-black"
                  : "text-teal-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Lịch của tôi ({allMySlots.length})
            </button>
            <button
              onClick={() => setActiveTab("CLASS_LOOKUP")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "CLASS_LOOKUP"
                  ? "bg-white text-[#003B3A] shadow-sm font-black"
                  : "text-teal-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Theo Lớp
            </button>
            <button
              onClick={() => setActiveTab("TEACHER_LOOKUP")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "TEACHER_LOOKUP"
                  ? "bg-white text-[#003B3A] shadow-sm font-black"
                  : "text-teal-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Theo GV
            </button>
            <button
              onClick={() => setActiveTab("SCHOOL_MATRIX")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "SCHOOL_MATRIX"
                  ? "bg-white text-[#003B3A] shadow-sm font-black"
                  : "text-teal-100 hover:text-white hover:bg-white/10"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Toàn trường
            </button>
          </div>
        </div>

        {/* Inline Stats Badges Row */}
        {activeTab === "MY_SCHEDULE" && (
          <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-3 border-t border-white/15 text-xs font-bold">
            <span className="bg-white/15 px-3 py-1 rounded-lg border border-white/20 text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Tổng: <strong className="text-amber-300 font-black">{allMySlots.length}</strong> tiết / tuần</span>
            </span>
            <span className="bg-white/15 px-3 py-1 rounded-lg border border-white/20 text-white flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-teal-200" />
              <span><strong className="text-teal-200 font-black">{uniqueSubjects.length}</strong> môn học</span>
            </span>
            <span className="bg-white/15 px-3 py-1 rounded-lg border border-white/20 text-white flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-300" />
              <span><strong className="text-emerald-300 font-black">{uniqueClasses.length}</strong> lớp học</span>
            </span>
          </div>
        )}
      </div>

      {/* ===== TAB 1: PERSONAL TEACHING SCHEDULE ===== */}
      {activeTab === "MY_SCHEDULE" && (
        <div className="space-y-4">
          {/* Compact Filter Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-200 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#00A99D]" />
                <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">Bộ lọc Tra cứu Tiết dạy</h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    onClick={() => setViewMode("GRID")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      viewMode === "GRID" ? "bg-white text-[#00A99D] shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Ma trận</span> Tuần
                  </button>
                  <button
                    onClick={() => setViewMode("LIST")}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      viewMode === "LIST" ? "bg-white text-[#00A99D] shadow-xs" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    Thống kê Môn
                  </button>
                </div>

                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Đặt lại</span>
                </button>
              </div>
            </div>

            {/* Compact Filter Dropdowns Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Lọc theo Thứ</label>
                <select
                  value={filterDay}
                  onChange={e => setFilterDay(e.target.value)}
                  className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả các thứ</option>
                  {DAYS_OF_WEEK.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Lọc theo Buổi</label>
                <select
                  value={filterSession}
                  onChange={e => setFilterSession(e.target.value)}
                  className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả các buổi</option>
                  <option value="MORNING">Buổi Sáng</option>
                  <option value="AFTERNOON">Buổi Chiều</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Lọc theo Tiết</label>
                <select
                  value={filterPeriod}
                  onChange={e => setFilterPeriod(e.target.value)}
                  className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả tiết dạy</option>
                  {[1, 2, 3, 4].map(p => <option key={p} value={String(p)}>Tiết {p}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Lọc theo Môn</label>
                <select
                  value={filterSubject}
                  onChange={e => setFilterSubject(e.target.value)}
                  className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả môn học</option>
                  {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Lọc theo Lớp</label>
                <select
                  value={filterClass}
                  onChange={e => setFilterClass(e.target.value)}
                  className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả lớp học</option>
                  {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Cấu hình Tuần</label>
                <select
                  value={filterWeekType}
                  onChange={e => setFilterWeekType(e.target.value)}
                  className="w-full text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-[#00A99D] outline-none text-slate-800"
                >
                  <option value="all">Tất cả các tuần</option>
                  <option value="EVEN">Tuần Chẵn</option>
                  <option value="ODD">Tuần Lẻ</option>
                </select>
              </div>
            </div>
          </div>

          {/* VIEW 1: WEEKLY SCHEDULE MATRIX GRID (COMPACT SCIENTIFIC) */}
          {viewMode === "GRID" && (
            <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Grid className="w-4 h-4 text-[#00A99D]" />
                  <span className="font-black text-xs uppercase tracking-wider text-slate-800">
                    Ma trận Lịch dạy Tuần (Thứ 2 - Thứ 6)
                  </span>
                </div>
                <span className="text-[11px] font-extrabold text-slate-500">
                  Hiển thị <strong className="text-[#00A99D]">{filteredMySlots.length}</strong> / {allMySlots.length} tiết
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse min-w-[650px] text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-black uppercase text-[11px]">
                      <th className="py-2 px-2 text-center border-r border-slate-200 w-16">Buổi</th>
                      <th className="py-2 px-2 text-center border-r border-slate-200 w-14">Tiết</th>
                      {DAYS_OF_WEEK.map(day => (
                        <th key={day.key} className="py-2 px-3 text-center border-r border-slate-200 last:border-r-0 font-black">
                          {day.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {/* MORNING SESSION */}
                    {PERIODS.map((period, pIdx) => (
                      <tr key={`morning-${period}`} className="hover:bg-slate-50/60 transition-colors">
                        {pIdx === 0 && (
                          <td rowSpan={4} className="py-2 px-1 text-center border-r border-slate-200 bg-amber-50/50 text-amber-900 font-extrabold text-[11px]">
                            <div className="flex flex-col items-center gap-0.5">
                              <Sun className="w-3.5 h-3.5 text-amber-500" />
                              <span>SÁNG</span>
                            </div>
                          </td>
                        )}
                        <td className="py-2 px-1 text-center border-r border-slate-200 font-bold text-slate-600 bg-slate-50 text-xs">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(day => {
                          const slot = filteredMySlots.find(s => s.dayOfWeek === day.key && s.session === "MORNING" && s.periodNumber === period)
                          return (
                            <td key={day.key} className="p-1.5 border-r border-slate-200 last:border-r-0 h-14 align-top">
                              {slot ? (
                                <div 
                                  className="h-full p-2 rounded-lg border border-slate-300/80 flex flex-col justify-between shadow-xs transition-all hover:scale-[1.02] hover:shadow-md hover:border-teal-500/60"
                                  style={{
                                    backgroundColor: (slot.colorCode || "#00A99D") + "12",
                                    borderColor: slot.colorCode || "#00A99D"
                                  }}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-xs text-slate-900 truncate">{slot.className}</span>
                                      {slot.weekType !== "ALL" && (
                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-white/90 text-slate-700 border border-slate-200">
                                          {slot.weekType === "EVEN" ? "T.Chẵn" : "T.Lẻ"}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-bold text-xs text-[#003B3A] mt-0.5 truncate">{slot.subjectName || "Chưa môn"}</p>
                                  </div>
                                  <div className="flex items-center justify-end pt-1">
                                    <Link
                                      href="/teacher/du-gio"
                                      className="text-[10px] font-bold text-slate-500 hover:text-[#00A99D] flex items-center gap-0.5 transition-colors"
                                      title="Đăng ký dự giờ tiết này"
                                    >
                                      <span>Dự giờ</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </Link>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-center justify-center text-slate-300 text-xs font-semibold hover:border-slate-300 hover:bg-slate-100/50 transition-all">-</div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}

                    {/* AFTERNOON SESSION */}
                    {PERIODS.map((period, pIdx) => (
                      <tr key={`afternoon-${period}`} className="hover:bg-slate-50/60 transition-colors">
                        {pIdx === 0 && (
                          <td rowSpan={4} className="py-2 px-1 text-center border-r border-slate-200 bg-sky-50/50 text-sky-900 font-extrabold text-[11px]">
                            <div className="flex flex-col items-center gap-0.5">
                              <Moon className="w-3.5 h-3.5 text-sky-500" />
                              <span>CHIỀU</span>
                            </div>
                          </td>
                        )}
                        <td className="py-2 px-1 text-center border-r border-slate-200 font-bold text-slate-600 bg-slate-50 text-xs">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(day => {
                          const slot = filteredMySlots.find(s => s.dayOfWeek === day.key && s.session === "AFTERNOON" && s.periodNumber === period)
                          return (
                            <td key={day.key} className="p-1.5 border-r border-slate-200 last:border-r-0 h-14 align-top">
                              {slot ? (
                                <div 
                                  className="h-full p-2 rounded-lg border border-slate-300/80 flex flex-col justify-between shadow-xs transition-all hover:scale-[1.02] hover:shadow-md hover:border-teal-500/60"
                                  style={{
                                    backgroundColor: (slot.colorCode || "#00A99D") + "12",
                                    borderColor: slot.colorCode || "#00A99D"
                                  }}
                                >
                                  <div>
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-black text-xs text-slate-900 truncate">{slot.className}</span>
                                      {slot.weekType !== "ALL" && (
                                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-white/90 text-slate-700 border border-slate-200">
                                          {slot.weekType === "EVEN" ? "T.Chẵn" : "T.Lẻ"}
                                        </span>
                                      )}
                                    </div>
                                    <p className="font-bold text-xs text-[#003B3A] mt-0.5 truncate">{slot.subjectName || "Chưa môn"}</p>
                                  </div>
                                  <div className="flex items-center justify-end pt-1">
                                    <Link
                                      href="/teacher/du-gio"
                                      className="text-[10px] font-bold text-slate-500 hover:text-[#00A99D] flex items-center gap-0.5 transition-colors"
                                      title="Đăng ký dự giờ tiết này"
                                    >
                                      <span>Dự giờ</span>
                                      <ArrowRight className="w-3 h-3" />
                                    </Link>
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full rounded-lg border border-slate-200/80 bg-slate-50/50 flex items-center justify-center text-slate-300 text-xs font-semibold hover:border-slate-300 hover:bg-slate-100/50 transition-all">-</div>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Summary Cards by Subject */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#00A99D]" />
                  <span>Thống kê theo Môn giảng dạy</span>
                </h3>

                {subjectSummary.map((sub, idx) => (
                  <div key={idx} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-sm text-slate-900">{sub.subjectName}</h4>
                      <span className="bg-[#00A99D] text-white font-black text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                        {sub.totalPeriods} tiết / tuần
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-slate-600 space-y-1">
                      <p>Danh sách lớp phụ trách: <span className="font-bold text-slate-900">{Array.from(sub.classNames).join(", ") || "N/A"}</span></p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                      {sub.slots.map((s, sIdx) => {
                        const dayText = DAYS_OF_WEEK.find(d => d.key === s.dayOfWeek)?.short || s.dayOfWeek
                        return (
                          <span key={sIdx} className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200">
                            {dayText} ({s.session === "MORNING" ? "Sáng" : "Chiều"} - T{s.periodNumber}): {s.className}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed Slot Cards List */}
              <div className="lg:col-span-2 space-y-3">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <List className="w-4 h-4 text-[#00A99D]" />
                  <span>Danh sách Tiết dạy Chi tiết ({filteredMySlots.length})</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredMySlots.map((slot) => {
                    const dayText = DAYS_OF_WEEK.find(d => d.key === slot.dayOfWeek)?.label || slot.dayOfWeek
                    return (
                      <div key={slot.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2.5 hover:shadow-md transition-all">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="bg-emerald-50 text-[#003B3A] font-black text-xs px-2.5 py-0.5 rounded-md border border-emerald-200 uppercase">
                            {dayText} - {slot.session === "MORNING" ? "Sáng" : "Chiều"}
                          </span>
                          <span className="bg-amber-100 text-amber-900 font-black text-xs px-2.5 py-0.5 rounded-md border border-amber-200">
                            Tiết {slot.periodNumber}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-sm text-slate-900">{slot.subjectName || "Chưa xếp môn"}</h4>
                          <p className="text-xs font-extrabold text-[#00A99D] mt-0.5">Lớp: {slot.className}</p>
                        </div>

                        <div className="text-xs font-medium text-slate-600 space-y-0.5">
                          <p>Cấp / Khối: <span className="font-bold text-slate-800">{slot.level === "TIEU_HOC" ? "Tiểu học" : "Trung học"} ({slot.grade})</span></p>
                          <p>Tuần áp dụng: <span className="font-bold text-slate-800">{slot.weekType === "ALL" ? "Tất cả các tuần" : slot.weekType === "EVEN" ? "Tuần Chẵn" : "Tuần Lẻ"}</span></p>
                        </div>

                        <div className="pt-2 border-t border-slate-100 flex justify-end">
                          <Link
                            href="/teacher/du-gio"
                            className="text-xs font-bold text-[#00A99D] hover:text-[#003B3A] flex items-center gap-1"
                          >
                            <span>Đăng ký dự giờ</span>
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

      {/* ===== TAB 2: CLASS SCHEDULE LOOKUP ===== */}
      {activeTab === "CLASS_LOOKUP" && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-5">
          {/* FILTER CONTROLS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-5 space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#00A99D]" />
                1. Chọn Cơ Sở
              </label>
              <select
                value={lookupCampusId}
                onChange={e => {
                  setLookupCampusId(e.target.value);
                  setLookupClassId("");
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] transition-all"
              >
                <option value="">-- Tất cả Cơ sở --</option>
                {initialData.campuses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.campusName}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-7 space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#00A99D]" />
                2. Chọn Lớp Học Cần Tra Cứu TKB
              </label>
              <select
                value={lookupClassId}
                onChange={e => setLookupClassId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] transition-all"
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
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg text-white">
                    {selectedClassObj.className?.charAt(0) || "L"}
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                      {selectedClassObj.className?.startsWith("Lớp") ? selectedClassObj.className : `Lớp ${selectedClassObj.className}`}
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md normal-case">
                        {selectedClassObj.level || selectedClassObj.grade || "Cấp học"}
                      </span>
                    </h2>
                    <p className="text-xs text-teal-100 font-medium mt-0.5">
                      Cơ sở: <strong className="text-white">{initialData.campuses.find((c: any) => c.id === selectedClassObj.campusId)?.campusName || "Tất cả Cơ sở"}</strong>
                    </p>
                  </div>
                </div>

                <div className="bg-white/15 px-3 py-1.5 rounded-lg text-right">
                  <div className="text-[10px] text-teal-100 uppercase font-black">Tổng tiết học / tuần</div>
                  <div className="text-sm font-black text-white">{classScheduleStats.totalPeriods} tiết</div>
                </div>
              </div>

              {/* WEEKLY TIMETABLE TABLE MATRIX FOR CLASS */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#003B3A] text-white font-black uppercase text-[11px] tracking-wider">
                      <th className="p-2 text-center w-20 border-r border-teal-800">Buổi</th>
                      <th className="p-2 text-center w-16 border-r border-teal-800">Tiết</th>
                      {DAYS_OF_WEEK.map(d => (
                        <th key={d.key} className="p-2 text-center border-r border-teal-800 min-w-[130px]">
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4].map((period, idx) => (
                      <tr key={`morning-${period}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        {idx === 0 && (
                          <td rowSpan={4} className="p-2 font-black text-center border-r border-slate-200 bg-amber-50/50 text-amber-900 uppercase tracking-wide text-xs">
                            SÁNG
                          </td>
                        )}
                        <td className="p-2 font-bold text-center border-r border-slate-200 text-slate-600 bg-slate-50">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(d => {
                          const assignedSlot = classWeeklyMatrix[`${d.key}_MORNING_${period}`];
                          return (
                            <td key={d.key} className="p-1.5 border-r border-slate-200 text-center vertical-top">
                              {assignedSlot ? (
                                <div
                                  style={{ backgroundColor: (assignedSlot.colorCode || "#00A99D") + "15", borderColor: assignedSlot.colorCode || "#00A99D" }}
                                  className="p-2 rounded-lg border shadow-2xs space-y-0.5 text-slate-900 font-bold"
                                >
                                  <div className="text-xs font-black uppercase text-[#003B3A]">
                                    {assignedSlot.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-700 font-medium">
                                    {assignedSlot.teacherName || "Chưa xếp GV"}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-1 px-2 rounded-md border border-slate-200/70 bg-slate-50/40 text-slate-300 text-xs font-medium inline-block">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {[1, 2, 3, 4].map((period, idx) => (
                      <tr key={`afternoon-${period}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        {idx === 0 && (
                          <td rowSpan={4} className="p-2 font-black text-center border-r border-slate-200 bg-sky-50/50 text-sky-900 uppercase tracking-wide text-xs">
                            CHIỀU
                          </td>
                        )}
                        <td className="p-2 font-bold text-center border-r border-slate-200 text-slate-600 bg-slate-50">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(d => {
                          const assignedSlot = classWeeklyMatrix[`${d.key}_AFTERNOON_${period}`];
                          return (
                            <td key={d.key} className="p-1.5 border-r border-slate-200 text-center vertical-top">
                              {assignedSlot ? (
                                <div
                                  style={{ backgroundColor: (assignedSlot.colorCode || "#00A99D") + "15", borderColor: assignedSlot.colorCode || "#00A99D" }}
                                  className="p-2 rounded-lg border shadow-2xs space-y-0.5 text-slate-900 font-bold"
                                >
                                  <div className="text-xs font-black uppercase text-[#003B3A]">
                                    {assignedSlot.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-700 font-medium">
                                    {assignedSlot.teacherName || "Chưa xếp GV"}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-1 px-2 rounded-md border border-slate-200/70 bg-slate-50/40 text-slate-300 text-xs font-medium inline-block">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 font-semibold text-xs space-y-1">
              <Building2 className="w-7 h-7 mx-auto text-slate-300" />
              <p>Vui lòng chọn Cơ sở và Lớp học ở trên để tra cứu thời khóa biểu.</p>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB 3: TEACHER SCHEDULE LOOKUP ===== */}
      {activeTab === "TEACHER_LOOKUP" && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-5">
          {/* FILTER CONTROLS */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-5 space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#00A99D]" />
                1. Tổ Chuyên Môn
              </label>
              <select
                value={lookupDept}
                onChange={e => {
                  setLookupDept(e.target.value);
                  setLookupTeacherId("");
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] transition-all"
              >
                <option value="ALL">-- Tất cả Tổ chuyên môn --</option>
                {uniqueDepartments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-7 space-y-1">
              <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#00A99D]" />
                2. Chọn / Tìm Giáo Viên
              </label>
              <div className="flex gap-2">
                <select
                  value={lookupTeacherId}
                  onChange={e => setLookupTeacherId(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] transition-all"
                >
                  <option value="">-- Chọn Giáo viên trong danh sách --</option>
                  {deptFilteredTeachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.teacherName} {t.teacherCode ? `(${t.teacherCode})` : ''}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Hoặc gõ tên GV..."
                  value={lookupSearchQuery}
                  onChange={e => setLookupSearchQuery(e.target.value)}
                  className="w-40 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#00A99D] transition-all"
                />
              </div>
            </div>
          </div>

          {/* TEACHER INFO BADGE */}
          {selectedTeacherObj ? (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-[#003B3A] to-[#00A99D] text-white p-4 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-lg text-white">
                    {selectedTeacherObj.teacherName?.charAt(0) || "GV"}
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                      {selectedTeacherObj.teacherName}
                      <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md normal-case">
                        {selectedTeacherObj.teacherCode || "GV"}
                      </span>
                    </h2>
                    <p className="text-xs text-teal-100 font-medium mt-0.5">
                      Tổ chuyên môn: <strong className="text-white">{selectedTeacherObj.departmentRel?.name || selectedTeacherObj.departmentName || "Tổ chuyên môn"}</strong>
                    </p>
                  </div>
                </div>

                <div className="bg-white/15 px-3 py-1.5 rounded-lg text-right">
                  <div className="text-[10px] text-teal-100 uppercase font-black">Tổng tiết dạy / tuần</div>
                  <div className="text-sm font-black text-white">{teacherScheduleStats.totalPeriods} tiết</div>
                </div>
              </div>

              {/* WEEKLY TIMETABLE TABLE MATRIX FOR TEACHER */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#003B3A] text-white font-black uppercase text-[11px] tracking-wider">
                      <th className="p-2 text-center w-20 border-r border-teal-800">Buổi</th>
                      <th className="p-2 text-center w-16 border-r border-teal-800">Tiết</th>
                      {DAYS_OF_WEEK.map(d => (
                        <th key={d.key} className="p-2 text-center border-r border-teal-800 min-w-[130px]">
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[1, 2, 3, 4].map((period, idx) => (
                      <tr key={`morning-${period}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        {idx === 0 && (
                          <td rowSpan={4} className="p-2 font-black text-center border-r border-slate-200 bg-amber-50/50 text-amber-900 uppercase tracking-wide text-xs">
                            SÁNG
                          </td>
                        )}
                        <td className="p-2 font-bold text-center border-r border-slate-200 text-slate-600 bg-slate-50">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(d => {
                          const assignedSlot = teacherWeeklyMatrix[`${d.key}_MORNING_${period}`];
                          return (
                            <td key={d.key} className="p-1.5 border-r border-slate-200 text-center vertical-top">
                              {assignedSlot ? (
                                <div
                                  style={{ backgroundColor: (assignedSlot.colorCode || "#00A99D") + "15", borderColor: assignedSlot.colorCode || "#00A99D" }}
                                  className="p-2 rounded-lg border shadow-2xs space-y-0.5 text-slate-900 font-bold"
                                >
                                  <div className="text-xs font-black uppercase text-[#003B3A]">
                                    {assignedSlot.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-700 font-medium">
                                    Lớp {assignedSlot.className}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-1 px-2 rounded-md border border-slate-200/70 bg-slate-50/40 text-slate-300 text-xs font-medium inline-block">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {[1, 2, 3, 4].map((period, idx) => (
                      <tr key={`afternoon-${period}`} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        {idx === 0 && (
                          <td rowSpan={4} className="p-2 font-black text-center border-r border-slate-200 bg-sky-50/50 text-sky-900 uppercase tracking-wide text-xs">
                            CHIỀU
                          </td>
                        )}
                        <td className="p-2 font-bold text-center border-r border-slate-200 text-slate-600 bg-slate-50">
                          Tiết {period}
                        </td>
                        {DAYS_OF_WEEK.map(d => {
                          const assignedSlot = teacherWeeklyMatrix[`${d.key}_AFTERNOON_${period}`];
                          return (
                            <td key={d.key} className="p-1.5 border-r border-slate-200 text-center vertical-top">
                              {assignedSlot ? (
                                <div
                                  style={{ backgroundColor: (assignedSlot.colorCode || "#00A99D") + "15", borderColor: assignedSlot.colorCode || "#00A99D" }}
                                  className="p-2 rounded-lg border shadow-2xs space-y-0.5 text-slate-900 font-bold"
                                >
                                  <div className="text-xs font-black uppercase text-[#003B3A]">
                                    {assignedSlot.subjectName}
                                  </div>
                                  <div className="text-[11px] text-slate-700 font-medium">
                                    Lớp {assignedSlot.className}
                                  </div>
                                </div>
                              ) : (
                                <div className="py-1 px-2 rounded-md border border-slate-200/70 bg-slate-50/40 text-slate-300 text-xs font-medium inline-block">-</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-slate-400 font-semibold text-xs space-y-1">
              <Search className="w-7 h-7 mx-auto text-slate-300" />
              <p>Vui lòng chọn Tổ chuyên môn hoặc Giáo viên để tra cứu lịch dạy.</p>
            </div>
          )}
        </div>
      )}

      {/* ===== TAB 4: FULL SCHOOL TIMETABLE MATRIX ===== */}
      {activeTab === "SCHOOL_MATRIX" && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-black text-sm text-slate-900">Ma trận Thời khóa biểu Toàn trường</h3>
              <p className="text-xs text-slate-500 mt-0.5">Tra cứu thời khóa biểu các lớp học theo Cơ sở & Cấp học</p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={matrixCampusId}
                onChange={e => setMatrixCampusId(e.target.value)}
                className="text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white outline-none text-slate-800"
              >
                {initialData.campuses.map(c => <option key={c.id} value={c.id}>{c.campusName}</option>)}
              </select>

              <select
                value={matrixLevel}
                onChange={e => setMatrixLevel(e.target.value)}
                className="text-xs font-bold py-1.5 px-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white outline-none text-slate-800"
              >
                <option value="TIEU_HOC">Tiểu học (Khối 1 - 5)</option>
                <option value="TRUNG_HOC">Trung học (Khối 6 - 12)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-2xs">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black uppercase border-b border-slate-200 text-[11px]">
                  <th className="py-2 px-2 border-r border-slate-200 w-16">Thứ</th>
                  <th className="py-2 px-2 border-r border-slate-200 w-12">Tiết</th>
                  {matrixClasses.map(c => (
                    <th key={c.id} className="py-2 px-2 text-center border-r border-slate-200 last:border-r-0 font-black min-w-[110px]">
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
                        <td rowSpan={4} className="py-2 px-1 text-center font-extrabold bg-slate-50 border-r border-slate-200 text-slate-800 text-xs">
                          {day.short}
                        </td>
                      )}
                      <td className="py-1.5 px-1 text-center font-bold bg-slate-50/50 border-r border-slate-200 text-slate-600">
                        T{period}
                      </td>
                      {matrixClasses.map(c => {
                        const slot = initialData.timetableSlots.find(s => s.classId === c.id && s.dayOfWeek === day.key && s.periodNumber === period && s.session === "MORNING")
                        return (
                          <td key={c.id} className="p-1 border-r border-slate-200 last:border-r-0 text-center">
                            {slot ? (
                              <div className="p-1 rounded border text-[11px] font-semibold" style={{ backgroundColor: (slot.colorCode || "#00A99D") + "15", borderColor: slot.colorCode || "#00A99D" }}>
                                <p className="font-extrabold text-slate-900 truncate">{slot.subjectName}</p>
                                <p className="text-[10px] text-slate-500 truncate">{slot.teacherName}</p>
                              </div>
                            ) : (
                              <div className="py-1 px-2 rounded-md border border-slate-200/70 bg-slate-50/40 text-slate-300 text-xs font-medium inline-block">-</div>
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
