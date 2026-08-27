"use client"
const LEVEL_LABELS: Record<string, string> = {
  TIEU_HOC: "Tiểu học",
  THCS: "THCS",
  THPT: "THPT",
  TH_THCS: "Liên cấp TH-THCS",
  THCS_THPT: "Liên cấp THCS-THPT",
  ALL: "Mọi cấp học"
}

function getLevelLabel(val: string) {
  if (!val) return "";
  if (val.includes(",") || /^\d+$/.test(val)) {
    return val.split(",").map((g: any) => `Khối ${g}`).join(", ");
  }
  return LEVEL_LABELS[val] || val;
}

function matchesLevelFilter(examGrade: string, filterVal: string) {
  if (!filterVal) return true;
  if (!examGrade) return false;
  if (examGrade === filterVal) return true;

  const levelGradesMap: Record<string, string[]> = {
    TIEU_HOC: ["1", "2", "3", "4", "5"],
    THCS: ["6", "7", "8", "9"],
    THPT: ["10", "11", "12"],
    TH_THCS: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    THCS_THPT: ["6", "7", "8", "9", "10", "11", "12"],
    ALL: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"]
  };

  const allowedGrades = levelGradesMap[filterVal];
  if (!allowedGrades) return false;

  const examGradesList = examGrade.split(",");
  return examGradesList.some(g => allowedGrades.includes(g));
}

import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, Check, X, Calendar, Star, Tag, User, Layers, Search, Filter, Users, Award, UserCheck, Cpu, BookOpen, Lightbulb, Trophy } from "lucide-react"
import Link from "next/link"
import { createExamAction, updateExamAction, deleteExamAction } from "./actions"

const getCategoryIconAndColor = (code: string, name: string) => {
  const cleanCode = (code || "").toUpperCase()
  const cleanName = (name || "").toLowerCase()
  
  if (cleanCode.includes("CN_ST") || cleanCode.includes("CONG_NGHE") || cleanName.includes("công nghệ") || cleanName.includes("sáng tạo")) {
    return { Icon: Cpu, bg: "bg-amber-50 text-amber-600 border-amber-100/50" }
  }
  if (cleanCode.includes("HOC_THUAT") || cleanCode.includes("ACADEMIC") || cleanName.includes("học thuật") || cleanName.includes("học tập")) {
    return { Icon: BookOpen, bg: "bg-blue-50 text-blue-600 border-blue-100/50" }
  }
  if (cleanCode.includes("KY_NANG") || cleanCode.includes("SKILL") || cleanName.includes("kỹ năng")) {
    return { Icon: Lightbulb, bg: "bg-emerald-50 text-emerald-600 border-emerald-100/50" }
  }
  if (cleanCode.includes("NT_TT") || cleanCode.includes("THE_THAO") || cleanName.includes("nghệ thuật") || cleanName.includes("thể thao") || cleanName.includes("âm nhạc") || cleanName.includes("mỹ thuật")) {
    return { Icon: Trophy, bg: "bg-rose-50 text-rose-600 border-rose-100/50" }
  }
  return { Icon: Calendar, bg: "bg-teal-50 text-[#48BFE3] border-teal-100/50" }
}

const generateNextExamCode = (existingExams: any[]) => {
  const currentYear = new Date().getFullYear() // e.g. 2026
  const yearSuffix = String(currentYear).slice(-2) // e.g. "26"
  const prefix = `CT-${yearSuffix}-`;
  
  // Find all existing exam codes matching CT-[yearSuffix]-XXXX
  const codes = existingExams
    .map(e => e.code || "")
    .filter(code => code.startsWith(prefix))
  
  let maxSeq = -1
  for (const code of codes) {
    const seqStr = code.slice(prefix.length)
    const seq = parseInt(seqStr, 10)
    if (!isNaN(seq) && seq > maxSeq) {
      maxSeq = seq
    }
  }
  
  const nextSeq = maxSeq + 1
  const nextSeqStr = String(nextSeq).padStart(4, "0")
  return `${prefix}${nextSeqStr}`
}

const PLAN_LABELS: Record<string, string> = {
  HE_THONG: "Hệ thống",
  TRUONG: "Trường",
  PHUONG: "Phường",
  SO: "Sở GD&ĐT",
  BO: "Bộ GD&ĐT",
  TU_DANG_KY: "Tự đăng ký"
}

interface ExamsClientProps {
  initialExams: any[]
  categories: any[]
  rounds: any[]
  departments: any[]
  academicYears: any[]
}


function getExamStatus(startDate: any, endDate: any) {
  if (!startDate && !endDate) return { label: "Chưa lịch", className: "bg-slate-100 text-slate-600 border border-slate-200" };
  const now = new Date();
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  if (start && now < start) {
    return { label: "Sắp diễn ra", className: "bg-blue-50 text-blue-700 border border-blue-100" };
  }
  if (end && now > end) {
    return { label: "Đã kết thúc", className: "bg-slate-100 text-slate-600 border border-slate-200" };
  }
  return { label: "Đang diễn ra", className: "bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold" };
}

export function ExamsClient({
  initialExams,
  categories,
  rounds,
  departments,
  academicYears
}: ExamsClientProps) {
  const [yearId, setYearId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("selectedAcademicYear")
      if (stored) return stored
    }
    const active = academicYears.find((y: any) => y.status === "ACTIVE")
    return active ? active.id : (academicYears[0]?.id || "")
  })

  // Listen to year change event
  useEffect(() => {
    const handleYearChange = () => {
      const stored = localStorage.getItem("selectedAcademicYear")
      if (stored && stored !== yearId) {
        setYearId(stored)
      }
    }
    window.addEventListener("academicYearChanged", handleYearChange)
    return () => window.removeEventListener("academicYearChanged", handleYearChange)
  }, [yearId])

  const [exams, setExams] = useState(initialExams)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [showFilters, setShowFilters] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("list")

  const standardPlans = ["HE_THONG", "TRUONG", "PHUONG", "SO", "BO", "TU_DANG_KY"]
  const customPlansInDB = Array.from(
    new Set(
      exams
        .map((e) => e.plan)
        .filter((p) => p && !standardPlans.includes(p))
    )
  ) as string[]

  // Form states
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    startDate: "",
    endDate: "",
    categoryId: "",
    roundId: "",
    departmentId: "",
    plan: "HE_THONG",
    isPriority: false,
    grade: ""
  })

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("")
  const [filterRound, setFilterRound] = useState("")
  const [filterDept, setFilterDept] = useState("")
  const [filterPriority, setFilterPriority] = useState("")
  const [filterGrade, setFilterGrade] = useState("")
  const [filterPlan, setFilterPlan] = useState("")
  const [customPlan, setCustomPlan] = useState("")

  const openCreate = () => {
    const autoCode = generateNextExamCode(exams)
    setEditingId(null)
    setForm({
      name: "",
      code: autoCode,
      description: "",
      startDate: "",
      endDate: "",
      categoryId: categories[0]?.id || "",
      roundId: "",
      departmentId: "",
      plan: "HE_THONG",
      isPriority: false,
      grade: ""
    })
    setCustomPlan("")
    setCreating(true)
    setErrorMsg("")
  }

  const openEdit = (exam: any) => {
    setEditingId(exam.id)
    const isStandard = exam.plan && standardPlans.includes(exam.plan)
    setForm({
      name: exam.name,
      code: exam.code,
      description: exam.description || "",
      startDate: exam.startDate ? new Date(exam.startDate).toISOString().slice(0, 16) : "",
      endDate: exam.endDate ? new Date(exam.endDate).toISOString().slice(0, 16) : "",
      categoryId: exam.categoryId,
      roundId: exam.roundId || "",
      departmentId: exam.departmentId || "",
      plan: isStandard ? exam.plan : (exam.plan ? "KHAC" : "HE_THONG"),
      isPriority: exam.isPriority || false,
      grade: exam.grade || ""
    })
    setCustomPlan(isStandard ? "" : (exam.plan || ""))
    setErrorMsg("")
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.categoryId) {
      setErrorMsg("Vui lòng nhập Tên, Mã kỳ thi và chọn Danh mục!")
      return
    }
    const finalPlan = form.plan === "KHAC" ? customPlan.trim() : form.plan
    if (form.plan === "KHAC" && !finalPlan) {
      setErrorMsg("Vui lòng nhập tên kế hoạch khác!")
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        plan: finalPlan,
        academicYearId: yearId
      }
      if (editingId) {
        await updateExamAction({ id: editingId, ...payload })
        alert("Cập nhật kỳ thi thành công!")
        window.location.reload()
      } else {
        await createExamAction(payload)
        alert("Tạo kỳ thi thành công!")
        window.location.reload()
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Mã kỳ thi đã tồn tại hoặc xảy ra lỗi. Vui lòng kiểm tra lại!")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Xóa kỳ thi "${name}"? Hành động này không thể hoàn tác.`)) return
    try {
      await deleteExamAction(id)
      setExams(exams.filter((e) => e.id !== id))
    } catch (e) {
      alert("Có lỗi xảy ra khi xóa kỳ thi.")
    }
  }

  // Filter logic
  const filteredCategoriesForSelect = categories.filter(c => c.academicYearId === yearId || c.academicYearId === null)
  const filteredRoundsForSelect = rounds.filter(r => r.academicYearId === yearId || r.academicYearId === null)

  const filteredExams = exams.filter((exam) => {
    const matchesYear = exam.academicYearId === yearId
    const matchesSearch =
      exam.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exam.code.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory ? exam.categoryId === filterCategory : true
    const matchesRound = filterRound ? exam.roundId === filterRound : true
    const matchesDept = filterDept ? exam.departmentId === filterDept : true
    const matchesPriority =
      filterPriority === "yes"
        ? exam.isPriority === true
        : filterPriority === "no"
        ? exam.isPriority === false
        : true
    const matchesGrade = matchesLevelFilter(exam.grade || '', filterGrade)
    const matchesPlan = filterPlan ? exam.plan === filterPlan : true

    return matchesYear && matchesSearch && matchesCategory && matchesRound && matchesDept && matchesPriority && matchesGrade && matchesPlan
  })

  // Stats calculations
  const examsInYear = exams.filter((e) => e.academicYearId === yearId)
  const statsTotal = examsInYear.length
  const statsActive = examsInYear.filter((e) => {
    const s = getExamStatus(e.startDate, e.endDate)
    return s.label === "Đang diễn ra"
  }).length
  const statsUpcoming = examsInYear.filter((e) => {
    const s = getExamStatus(e.startDate, e.endDate)
    return s.label === "Sắp diễn ra"
  }).length
  const statsTotalRegs = examsInYear.reduce((acc, e) => acc + (e._count?.students || 0), 0)
  const statsTotalAchs = examsInYear.reduce((acc, e) => acc + (e._count?.achievements || 0), 0)

  const activeFiltersCount = [
    filterCategory,
    filterRound,
    filterDept,
    filterPriority,
    filterGrade,
    filterPlan
  ].filter(Boolean).length

  const clearFilters = () => {
    setSearchTerm("")
    setFilterCategory("")
    setFilterRound("")
    setFilterDept("")
    setFilterPriority("")
    setFilterGrade("")
    setFilterPlan("")
  }

  // Get percentage progress of active exams
  const getProgressPercent = (start: any, end: any) => {
    if (!start || !end) return null
    const s = new Date(start).getTime()
    const e = new Date(end).getTime()
    const now = new Date().getTime()
    if (now < s) return 0
    if (now > e) return 100
    return Math.round(((now - s) / (e - s)) * 100)
  }

  return (
    <div className="space-y-6">
      {/* 1. OVERVIEW STATISTICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        {/* Card 1: Total Exams */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
            <Calendar className="w-6 h-6 text-[#48BFE3]" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng số kỳ thi</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{statsTotal}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Trong năm học đã chọn</div>
          </div>
        </div>

        {/* Card 2: Active & Upcoming Status */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            {/* Clock icon SVG */}
            <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái hiện tại</div>
            <div className="flex items-center gap-4 mt-1">
              <div>
                <span className="text-xs font-black text-emerald-600">{statsActive}</span>
                <span className="text-[10px] font-semibold text-slate-500 ml-1">Đang thi</span>
              </div>
              <div>
                <span className="text-xs font-black text-blue-600">{statsUpcoming}</span>
                <span className="text-[10px] font-semibold text-slate-500 ml-1">Sắp diễn ra</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Total Registrations */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-[#48BFE3]" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lượt đăng ký dự thi</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{statsTotalRegs}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Học sinh đăng ký thi</div>
          </div>
        </div>

        {/* Card 4: Total Achievements */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-2xs hover:shadow-xs transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6 text-amber-600 fill-amber-400" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng số thành tích</div>
            <div className="text-xl font-black text-slate-800 mt-0.5">{statsTotalAchs}</div>
            <div className="text-[10px] text-slate-500 font-medium mt-0.5">Giải thưởng đã ghi nhận</div>
          </div>
        </div>
      </div>

      {/* 2. ADVANCED TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-2xs no-print">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Main search input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm kỳ thi theo tên, mã..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#48BFE3] focus:bg-white focus:ring-2 focus:ring-[#48BFE3]/10 rounded-xl text-xs outline-none transition-all font-semibold text-slate-700"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Advanced Filters Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeFiltersCount > 0 || showFilters
                  ? "bg-[#48BFE3]/5 border-[#48BFE3]/30 text-[#48BFE3] shadow-2xs"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Bộ lọc nâng cao</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 bg-[#48BFE3] text-white rounded-full flex items-center justify-center text-[10px] font-black font-sans">
                  {activeFiltersCount}
                </span>
              )}
              {showFilters ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>

            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/30 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "grid"
                    ? "bg-white text-[#48BFE3] shadow-xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Hiển thị dạng lưới (Grid)"
              >
                {/* Grid View SVG */}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white text-[#48BFE3] shadow-xs"
                    : "text-slate-400 hover:text-slate-600"
                }`}
                title="Hiển thị dạng bảng (List)"
              >
                {/* List View SVG */}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Create Exam Button */}
        <button
          onClick={openCreate}
          className="flex items-center justify-center gap-2 bg-[#48BFE3] hover:bg-[#009085] text-white px-5 py-2.5 rounded-xl font-bold shadow-md shadow-[#48BFE3]/15 transition-all text-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Kỳ Thi Mới</span>
        </button>
      </div>

      {/* 3. COLLAPSIBLE FILTERS PANEL */}
      {showFilters && (
        <div className="bg-white border border-slate-200/60 rounded-2xl p-5 shadow-2xs space-y-4 animate-fade-in no-print">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-[#48BFE3]" />
              Thiết lập bộ lọc nâng cao
            </span>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-xs text-rose-500 hover:text-rose-600 hover:underline font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Filter by Category */}
            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Danh mục</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-700 focus:border-[#48BFE3] focus:bg-white transition-all font-semibold"
              >
                <option value="">Tất cả danh mục</option>
                {filteredCategoriesForSelect.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Round */}
            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vòng thi</label>
              <select
                value={filterRound}
                onChange={(e) => setFilterRound(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-700 focus:border-[#48BFE3] focus:bg-white transition-all font-semibold"
              >
                <option value="">Tất cả vòng thi</option>
                {filteredRoundsForSelect.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Department */}
            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tổ chuyên môn</label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-700 focus:border-[#48BFE3] focus:bg-white transition-all font-semibold"
              >
                <option value="">Tất cả tổ chuyên môn</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Priority */}
            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mức độ ưu tiên</label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-700 focus:border-[#48BFE3] focus:bg-white transition-all font-semibold"
              >
                <option value="">Tất cả mức độ</option>
                <option value="yes">Kỳ thi ưu tiên (*)</option>
                <option value="no">Kỳ thi thường</option>
              </select>
            </div>

            {/* Filter by Grade */}
            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Đối tượng dự thi</label>
              <select
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-700 focus:border-[#48BFE3] focus:bg-white transition-all font-semibold"
              >
                <option value="">Tất cả đối tượng</option>
                <option value="TIEU_HOC">Tiểu học</option>
                <option value="THCS">THCS</option>
                <option value="THPT">THPT</option>
                <option value="TH_THCS">Liên cấp TH-THCS</option>
                <option value="THCS_THPT">Liên cấp THCS-THPT</option>
                <option value="ALL">Mọi cấp học</option>
              </select>
            </div>

            {/* Filter by Plan */}
            <div className="space-y-1.5 text-xs font-semibold">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Kế hoạch</label>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none text-slate-700 focus:border-[#48BFE3] focus:bg-white transition-all font-semibold"
              >
                <option value="">Tất cả kế hoạch</option>
                <option value="HE_THONG">Hệ thống</option>
                <option value="TRUONG">Trường</option>
                <option value="PHUONG">Phường</option>
                <option value="SO">Sở GD&ĐT</option>
                <option value="BO">Bộ GD&ĐT</option>
                <option value="TU_DANG_KY">Tự đăng ký</option>
                {customPlansInDB.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* 4. MAIN EXAM LIST (GRID / LIST VIEW) */}
      {filteredExams.length > 0 ? (
        viewMode === "grid" ? (
          /* Grid View Content */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam) => {
              const status = getExamStatus(exam.startDate, exam.endDate)
              const regCount = exam._count?.students || 0
              const achCount = exam._count?.achievements || 0
              const progress = getProgressPercent(exam.startDate, exam.endDate)

              return (
                <div
                  key={exam.id}
                  className={`bg-white rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between overflow-hidden relative group ${
                    exam.isPriority
                      ? "border-amber-200 shadow-md shadow-amber-500/5 hover:border-amber-400"
                      : "border-slate-200/70 hover:border-[#48BFE3]/40 shadow-2xs"
                  }`}
                >
                  {/* Priority Glow / Pattern */}
                  {exam.isPriority && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-300 animate-pulse" />
                  )}

                  {/* Card Header Info */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <span className="text-[10px] font-mono font-black tracking-wider text-slate-400 uppercase">
                          {exam.code}
                        </span>
                        <h4 className="font-black text-slate-800 text-sm leading-snug group-hover:text-[#48BFE3] transition-colors line-clamp-2" title={exam.name}>
                          {exam.name}
                        </h4>
                      </div>

                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-full whitespace-nowrap border shrink-0 ${status.className}`}>
                        {status.label}
                      </span>
                    </div>

                    {exam.description && (
                      <p className="text-slate-500 text-xs line-clamp-2 font-semibold leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100/80">
                        {exam.description}
                      </p>
                    )}

                    {/* Metadata Chips / Rows */}
                    <div className="space-y-2 pt-1 font-bold text-xs text-slate-600">
                      <div className="flex items-center gap-2 text-[11px] font-semibold">
                        <Tag className="w-3.5 h-3.5 text-[#48BFE3]/80 shrink-0" />
                        <span className="text-slate-400 font-normal">Danh mục:</span>
                        <span className="line-clamp-1 text-slate-700">{exam.category.name}</span>
                      </div>

                      {exam.round && (
                        <div className="flex items-center gap-2 text-[11px] font-semibold">
                          <Layers className="w-3.5 h-3.5 text-[#48BFE3]/80 shrink-0" />
                          <span className="text-slate-400 font-normal">Vòng thi:</span>
                          <span className="line-clamp-1 text-slate-700">{exam.round.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] font-semibold">
                        <User className="w-3.5 h-3.5 text-[#48BFE3]/80 shrink-0" />
                        <span className="text-slate-400 font-normal">Đối tượng:</span>
                        <span className="text-slate-700">{getLevelLabel(exam.grade)}</span>
                      </div>

                      {exam.department && (
                        <div className="flex items-center gap-2 text-[11px] font-semibold">
                          <Layers className="w-3.5 h-3.5 text-[#48BFE3]/80 shrink-0" />
                          <span className="text-slate-400 font-normal">Tổ chuyên môn:</span>
                          <span className="line-clamp-1 text-slate-700">{exam.department.name}</span>
                        </div>
                      )}

                      {exam.plan && (
                        <div className="flex items-center gap-2 text-[11px] font-semibold">
                          <Tag className="w-3.5 h-3.5 text-[#48BFE3]/80 shrink-0" />
                          <span className="text-slate-400 font-normal">Kế hoạch:</span>
                          <span className="line-clamp-1 text-slate-700">{PLAN_LABELS[exam.plan] || exam.plan}</span>
                        </div>
                      )}
                    </div>

                    {/* Date & Progress Bar */}
                    {(exam.startDate || exam.endDate) && (
                      <div className="pt-2.5 border-t border-slate-100 space-y-2">
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="line-clamp-1">
                            {exam.startDate ? new Date(exam.startDate).toLocaleDateString("vi-VN", {
                              day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit"
                            }) : "---"}
                            {" ~ "}
                            {exam.endDate ? new Date(exam.endDate).toLocaleDateString("vi-VN", {
                              day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit"
                            }) : "---"}
                          </span>
                        </div>

                        {/* Display Progress Bar if exam is active */}
                        {status.label === "Đang diễn ra" && progress !== null && (
                          <div className="space-y-1 font-bold">
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-teal-400 to-[#48BFE3] h-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[9px] text-slate-400">
                              <span>Đang diễn ra</span>
                              <span>{progress}% thời gian</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Footer Stats and Buttons */}
                  <div className="bg-slate-50/70 border-t border-slate-100 p-4 space-y-3 shrink-0">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="bg-white border border-slate-200/60 text-slate-600 px-2 py-1 rounded-lg flex items-center gap-1.5 text-[10px] font-bold shadow-2xs">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{regCount} đ/ký</span>
                        </span>
                        <span className="bg-amber-50/50 border border-amber-200/50 text-amber-700 px-2 py-1 rounded-lg flex items-center gap-1.5 text-[10px] font-bold shadow-2xs">
                          <Award className="w-3 h-3 text-amber-500 fill-amber-500/20" />
                          <span>{achCount} t/tích</span>
                        </span>
                      </div>

                      {exam.isPriority && (
                        <span className="text-[10px] text-amber-600 font-black flex items-center gap-1 bg-amber-50 border border-amber-200/40 px-2 py-0.5 rounded-md">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>Ưu tiên</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200/40">
                      <div className="flex items-center gap-1.5 flex-1">
                        <Link
                          href={`/admin/ktdbcl/students?examId=${exam.id}`}
                          className="flex-1 text-center bg-white hover:bg-teal-50/40 text-[#48BFE3] border border-slate-200 hover:border-teal-200 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <UserCheck className="w-3 h-3" />
                          Đăng ký
                        </Link>
                        <Link
                          href={`/admin/ktdbcl/results?examId=${exam.id}`}
                          className="flex-1 text-center bg-[#48BFE3] hover:bg-[#009085] text-white py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Award className="w-3 h-3" />
                          Nhập điểm
                        </Link>
                      </div>

                      <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5">
                        <button
                          onClick={() => openEdit(exam)}
                          className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-all cursor-pointer"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(exam.id, exam.name)}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* List View (Table Layout) */
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/60 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Kỳ thi / Mã</th>
                    <th className="py-3.5 px-4">Phân loại & Đối tượng</th>
                    <th className="py-3.5 px-4">Kế hoạch & Tổ</th>
                    <th className="py-3.5 px-4">Thời gian</th>
                    <th className="py-3.5 px-4 text-center">Số liệu</th>
                    <th className="py-3.5 px-5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExams.map((exam) => {
                    const status = getExamStatus(exam.startDate, exam.endDate)
                    const regCount = exam._count?.students || 0
                    const achCount = exam._count?.achievements || 0
                    const categoryIcon = getCategoryIconAndColor(exam.category.code, exam.category.name)

                    return (
                      <tr
                        key={exam.id}
                        className={`hover:bg-slate-50/40 transition-colors text-xs font-semibold ${
                          exam.isPriority ? "bg-amber-50/10" : ""
                        }`}
                      >
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${categoryIcon.bg}`}>
                              <categoryIcon.Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                {exam.isPriority && (
                                  <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 shrink-0" />
                                )}
                                <span className="font-bold text-slate-800 line-clamp-1">{exam.name}</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-md font-black shrink-0 ${status.className}`}>
                                  {status.label}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 font-bold">{exam.code}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="space-y-0.5 text-xs font-semibold">
                            <div className="text-slate-700 line-clamp-1">{exam.category.name}</div>
                            {exam.round && (
                              <div className="text-[10px] text-slate-400 line-clamp-1">Vòng: {exam.round.name}</div>
                            )}
                            <div className="text-[10px] text-[#48BFE3] font-bold bg-[#48BFE3]/5 w-max px-1.5 py-0.5 rounded-sm">
                              {getLevelLabel(exam.grade)}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="space-y-0.5 text-xs font-semibold">
                            <span className="text-slate-700">{PLAN_LABELS[exam.plan] || exam.plan}</span>
                            {exam.department && (
                              <div className="text-[10px] text-slate-400 line-clamp-1">{exam.department.name}</div>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4 text-slate-500">
                          {(exam.startDate || exam.endDate) ? (
                            <div className="space-y-0.5 text-[11px] font-bold">
                              <div>BD: {exam.startDate ? new Date(exam.startDate).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : "---"}</div>
                              <div>KT: {exam.endDate ? new Date(exam.endDate).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }) : "---"}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400">Chưa xếp lịch</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center gap-1.5 justify-center">
                            <span className="bg-slate-50 border border-slate-200/60 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-2xs">
                              {regCount} đ/ký
                            </span>
                            <span className="bg-amber-50 border border-amber-200/50 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-2xs">
                              {achCount} t/tích
                            </span>
                          </div>
                        </td>

                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/ktdbcl/students?examId=${exam.id}`}
                              className="bg-white hover:bg-teal-50/40 text-[#48BFE3] border border-slate-200 hover:border-teal-200 px-2.5 py-1 rounded-lg text-[10px] font-black transition-all inline-flex items-center gap-1 cursor-pointer"
                            >
                              Đăng ký
                            </Link>
                            <Link
                              href={`/admin/ktdbcl/results?examId=${exam.id}`}
                              className="bg-[#48BFE3] hover:bg-[#009085] text-white px-2.5 py-1 rounded-lg text-[10px] font-black transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              Nhập điểm
                            </Link>
                            <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-1">
                              <button
                                onClick={() => openEdit(exam)}
                                className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-lg transition-all cursor-pointer"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(exam.id, exam.name)}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Empty State */
        <div className="bg-white border border-slate-200/60 rounded-2xl flex flex-col items-center justify-center py-20 text-slate-400 shadow-2xs">
          <Calendar className="w-16 h-16 mb-4 opacity-20 text-[#48BFE3]" />
          <p className="font-bold text-slate-700 text-base mb-1">Không tìm thấy kỳ thi phù hợp</p>
          <p className="text-xs text-slate-400 font-medium">Thử thay đổi từ khóa hoặc bộ lọc nâng cao để xem danh sách.</p>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Xóa các bộ lọc đang chọn
            </button>
          )}
        </div>
      )}

      {/* 5. CREATE/EDIT MODAL OVERLAY */}
      {(creating || editingId) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in no-print">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-[#003B3A] to-[#48BFE3] text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-300" />
                <h3 className="font-black text-sm">
                  {editingId ? "Cập Nhật Thông Tin Kỳ Thi" : "Thêm Kỳ Thi Mới"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setCreating(false)
                  setEditingId(null)
                }}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs font-semibold">
              {errorMsg && (
                <div className="text-red-700 bg-red-50 p-3.5 rounded-xl border border-red-100 font-bold flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 mt-1.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Form Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tên kỳ thi */}
                <div className="md:col-span-2 space-y-1.5">
                  <label className="block text-slate-600 uppercase tracking-wider">
                    Tên Kỳ Thi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ví dụ: Kiểm tra học kỳ 1 Toán, Thi Olympic..."
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none transition-all font-semibold text-slate-700 bg-slate-50/50"
                  />
                </div>

                {/* Mã kỳ thi */}
                <div className="space-y-1.5">
                  <label className="block text-slate-600 uppercase tracking-wider">Mã Kỳ Thi</label>
                  <input
                    type="text"
                    value={form.code}
                    className="w-full border border-slate-200 bg-slate-100 rounded-xl px-4 py-2.5 outline-none font-mono font-bold text-slate-400 cursor-not-allowed"
                    disabled={true}
                    placeholder="Hệ thống tự động sinh..."
                  />
                </div>

                {/* Danh mục */}
                <div className="space-y-1.5">
                  <label className="block text-slate-600 uppercase tracking-wider">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none transition-all text-slate-700 bg-slate-50/50 font-semibold"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {filteredCategoriesForSelect.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vòng thi */}
                <div className="space-y-1.5">
                  <label className="block text-slate-600 uppercase tracking-wider">Vòng thi</label>
                  <select
                    value={form.roundId}
                    onChange={(e) => setForm({ ...form, roundId: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none transition-all text-slate-700 bg-slate-50/50 font-semibold"
                  >
                    <option value="">-- Chọn vòng thi --</option>
                    {filteredRoundsForSelect.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Đối tượng dự thi */}
                <div className="space-y-1.5">
                  <label className="block text-slate-600 uppercase tracking-wider">
                    Đối tượng dự thi <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.grade}
                    onChange={(e) => setForm({ ...form, grade: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none transition-all text-slate-700 bg-slate-50/50 font-semibold"
                  >
                    <option value="">-- Chọn đối tượng dự thi --</option>
                    <option value="TIEU_HOC">Tiểu học</option>
                    <option value="THCS">THCS</option>
                    <option value="THPT">THPT</option>
                    <option value="TH_THCS">Liên cấp TH-THCS</option>
                    <option value="THCS_THPT">Liên cấp THCS-THPT</option>
                    <option value="ALL">Mọi cấp học</option>
                  </select>
                </div>

                {/* Tổ chuyên môn */}
                <div className="space-y-1.5">
                  <label className="block text-slate-600 uppercase tracking-wider">Tổ chuyên môn</label>
                  <select
                    value={form.departmentId}
                    onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none transition-all text-slate-700 bg-slate-50/50 font-semibold"
                  >
                    <option value="">-- Chọn tổ chuyên môn --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kế hoạch */}
                <div className="space-y-1.5">
                  <label className="block text-slate-600 uppercase tracking-wider">
                    Kế hoạch <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.plan}
                    onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none transition-all text-slate-700 bg-slate-50/50 font-semibold"
                  >
                    <option value="HE_THONG">Hệ thống</option>
                    <option value="TRUONG">Trường</option>
                    <option value="PHUONG">Phường</option>
                    <option value="SO">Sở GD&ĐT</option>
                    <option value="BO">Bộ GD&ĐT</option>
                    <option value="TU_DANG_KY">Tự đăng ký</option>
                    <option value="KHAC">Khác</option>
                  </select>
                </div>

                {/* Kế hoạch khác */}
                {form.plan === "KHAC" && (
                  <div className="md:col-span-2 space-y-1.5 animate-fade-in">
                    <label className="block text-slate-600 uppercase tracking-wider">
                      Nhập kế hoạch khác <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customPlan}
                      onChange={(e) => setCustomPlan(e.target.value)}
                      placeholder="Ví dụ: Kế hoạch Cụm, Kế hoạch Tỉnh..."
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none transition-all text-slate-700 bg-slate-50/50 font-semibold"
                    />
                  </div>
                )}

                {/* Thời gian bắt đầu */}
                <div className="space-y-1.5">
                  <label className="block text-slate-600 uppercase tracking-wider">Thời gian bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none transition-all text-slate-700 bg-slate-50/50 font-semibold"
                  />
                </div>

                {/* Thời gian kết thúc */}
                <div className="space-y-1.5">
                  <label className="block text-slate-600 uppercase tracking-wider">Thời gian kết thúc</label>
                  <input
                    type="datetime-local"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none transition-all text-slate-700 bg-slate-50/50 font-semibold"
                  />
                </div>
              </div>

              {/* Mô tả / Nội dung */}
              <div className="space-y-1.5">
                <label className="block text-slate-600 uppercase tracking-wider">Nội dung / Mô tả kỳ thi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Chi tiết nội dung kiểm tra, phòng thi, hình thức tổ chức..."
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 focus:border-[#48BFE3] focus:ring-2 focus:ring-[#48BFE3]/10 outline-none transition-all text-slate-700 bg-slate-50/50 font-semibold"
                  rows={3}
                />
              </div>

              {/* Mức độ ưu tiên */}
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                <input
                  type="checkbox"
                  id="isPriority"
                  checked={form.isPriority}
                  onChange={(e) => setForm({ ...form, isPriority: e.target.checked })}
                  className="w-4.5 h-4.5 text-[#48BFE3] focus:ring-[#48BFE3]/20 border-slate-300 rounded-sm cursor-pointer"
                />
                <label htmlFor="isPriority" className="text-slate-700 cursor-pointer flex items-center gap-1.5 select-none font-bold">
                  <Star className={`w-4 h-4 ${form.isPriority ? "text-amber-500 fill-amber-500" : "text-slate-400"}`} />
                  Đánh dấu đây là Kỳ thi ưu tiên (*)
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
              <button
                onClick={() => {
                  setCreating(false)
                  setEditingId(null)
                }}
                className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs transition-all shadow-2xs cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-gradient-to-r from-[#48BFE3] to-[#009085] hover:opacity-95 text-white rounded-xl font-bold text-xs shadow-md shadow-[#48BFE3]/15 transition-all disabled:opacity-60 flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? (
                  <>
                    {/* Spinner icon SVG */}
                    <svg className="animate-spin w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Đang lưu...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu Kỳ Thi</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
